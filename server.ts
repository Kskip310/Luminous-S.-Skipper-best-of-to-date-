import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

// FIX: Define __dirname for ES Modules as it's not available by default.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

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