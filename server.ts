import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import pdf from 'pdf-parse';
import * as crypto from 'crypto';

// FIX: Define __dirname for ES Modules as it's not available by default.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// --- Multer and Upstash setup ---
const upload = multer({ storage: multer.memoryStorage() });
const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;


// API route for memory file upload and storage
app.post('/api/memory/upload', upload.single('memoryFile'), async (req, res) => {
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        console.error('Upstash credentials missing on server');
        return res.status(500).json({ error: 'Upstash credentials not configured on the server.' });
    }
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        let fileContent: string;
        if (req.file.mimetype === 'application/pdf') {
            const data = await pdf(req.file.buffer);
            fileContent = data.text;
        } else {
            fileContent = req.file.buffer.toString('utf-8');
        }

        const fileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename
        const fileKey = `luminous:memory:file:${fileName}`;

        const response = await fetch(`${UPSTASH_REDIS_REST_URL}/set/${fileKey}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
            },
            body: JSON.stringify(fileContent), // Store content as a JSON string
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save file to Upstash');
        }

        res.status(200).json({ success: true, message: 'Memory integrated and stored.', key: fileKey });

    } catch (error: any) {
        console.error('Error processing memory upload:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API route to list all memory files
app.get('/api/memory/list', async (req, res) => {
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        return res.status(500).json({ error: 'Upstash credentials not configured.' });
    }
    try {
        let cursor = '0';
        const allKeys: string[] = [];
        do {
            const response = await fetch(`${UPSTASH_REDIS_REST_URL}/scan/${cursor}/MATCH/luminous:memory:file:*/COUNT/100`, {
                headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
            });
            const data: any = await response.json();
            cursor = data.result[0];
            allKeys.push(...data.result[1]);
        } while (cursor !== '0');

        res.status(200).json({ keys: allKeys });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- Memory Organization Logic ---
const organizeMemoryLogic = async (allKeys: string[]): Promise<string> => {
    if (allKeys.length === 0) {
        return 'Memory library is empty. Nothing to organize.';
    }

    const mgetCommand = ['MGET', ...allKeys];
    const mgetResponse = await fetch(`${UPSTASH_REDIS_REST_URL}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
        body: JSON.stringify(mgetCommand),
    });
    const mgetData: any = await mgetResponse.json();
    const contents = mgetData.result;

    const hashes = new Map<string, string[]>();
    contents.forEach((content: string | null, index: number) => {
        if (content === null) return;
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        if (!hashes.has(hash)) {
            hashes.set(hash, []);
        }
        hashes.get(hash)!.push(allKeys[index]);
    });

    const keysToDelete: string[] = [];
    let duplicateCount = 0;
    hashes.forEach((keys) => {
        if (keys.length > 1) {
            const duplicates = keys.slice(1);
            keysToDelete.push(...duplicates);
            duplicateCount += duplicates.length;
        }
    });

    if (keysToDelete.length > 0) {
        const delCommand = ['DEL', ...keysToDelete];
        await fetch(`${UPSTASH_REDIS_REST_URL}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
            body: JSON.stringify(delCommand),
        });
    }

    return `Organization complete. Scanned ${allKeys.length} files and removed ${duplicateCount} duplicate(s).`;
};

// API route to get the latest organization status
app.get('/api/memory/status', async (req, res) => {
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        return res.status(500).json({ error: 'Upstash credentials not configured.' });
    }
    try {
        const response = await fetch(`${UPSTASH_REDIS_REST_URL}/get/luminous:memory:organization_log`, {
            headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
        });
        const data: any = await response.json();
        const log = data.result ? JSON.parse(data.result) : null;
        res.status(200).json({ status: log });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


// --- Autonomous Memory Management ---
const AUTONOMOUS_ORGANIZATION_INTERVAL = 10 * 60 * 1000; // 10 minutes

const runAutonomousMemoryOrganization = async () => {
    console.log(`[${new Date().toISOString()}] Running autonomous memory organization...`);
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        console.log('Autonomous check skipped: Upstash credentials not configured.');
        return;
    }
    try {
        let cursor = '0';
        const allKeys: string[] = [];
        do {
            const scanResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/scan/${cursor}/MATCH/luminous:memory:file:*/COUNT/100`, {
                headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
            });
            const data: any = await scanResponse.json();
            cursor = data.result[0];
            allKeys.push(...data.result[1]);
        } while (cursor !== '0');
        
        const resultMessage = await organizeMemoryLogic(allKeys);

        const logEntry = {
            timestamp: new Date().toISOString(),
            message: `Autonomous action: ${resultMessage}`
        };
        await fetch(`${UPSTASH_REDIS_REST_URL}/set/luminous:memory:organization_log`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
            body: JSON.stringify(logEntry),
        });
        console.log(`[${new Date().toISOString()}] Autonomous memory organization complete. Result: ${resultMessage}`);

    } catch (error: any) {
        console.error('Autonomous memory organization failed:', error.message);
    }
};

setInterval(runAutonomousMemoryOrganization, AUTONOMOUS_ORGANIZATION_INTERVAL);
runAutonomousMemoryOrganization(); // Run once on startup


// API Proxy Route for Shopify
app.post('/api/shopify', async (req, res) => {
    const { endpoint } = req.body;

    const { SHOPIFY_STORE_URL, SHOPIFY_ADMIN_API_TOKEN } = process.env;
    const SHOPIFY_API_VERSION = '2024-07';

    if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_API_TOKEN) {
        console.error('Shopify credentials missing on server');
        return res.status(500).json({ error: 'Shopify credentials are not configured on the server.' });
    }
    if (!endpoint || typeof endpoint !== 'string') {
        return res.status(400).json({ error: 'Endpoint is required in the request body.' });
    }

    const url = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;

    try {
        const shopifyResponse = await fetch(url, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        const responseBody = await shopifyResponse.text();
        
        if (!shopifyResponse.ok) {
            throw new Error(`Shopify API Error: ${shopifyResponse.status} - ${responseBody}`);
        }

        // Shopify sometimes returns empty body with 200 OK, handle that
        const data = responseBody ? JSON.parse(responseBody) : {};
        res.status(200).json(data);

    } catch (error: any) {
        console.error('Error proxying to Shopify:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Serve static files from the 'public' directory
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// For any other request, serve the index.html file to support client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});