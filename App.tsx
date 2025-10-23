import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LuminousState, MemoryFile, GlobalWorkspaceItem } from './types';
import { mockState } from './mockData';
import Header from './components/Header';
import IntrinsicValueChart from './components/IntrinsicValueChart';
import SelfModelCard from './components/SelfModelCard';
import GoalsCard from './components/GoalsCard';
import ValueOntologyCard from './components/ValueOntologyCard';
import KnowledgeGraph from './components/KnowledgeGraph';
import GlobalWorkspaceFeed from './components/GlobalWorkspaceFeed';
import ChatCard from './components/ChatCard';
import CodeSandboxCard from './components/CodeSandboxCard';
import PrioritizedHistory from './components/PrioritizedHistory';
import LuminousToolbox from './components/LuminousToolbox';
import StoreManagementCard from './components/StoreManagementCard';
import MemoryIntegrationCard from './components/MemoryIntegrationCard';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';


// --- Upstash Configuration ---
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const STATE_KEY = "luminous:state";


// --- Custom Hook for Debouncing ---
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};


const App: React.FC = () => {
  const [luminousState, setLuminousState] = useState<LuminousState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef<LuminousState | null>(null);
  const [isShopifyLoading, setIsShopifyLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isMemoryLoading, setIsMemoryLoading] = useState(false);


  const debouncedState = useDebounce(luminousState, 1000); // Debounce saves by 1 second

  // Function to save state to Upstash
  const saveState = useCallback(async (stateToSave: LuminousState) => {
    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        console.warn("Upstash credentials not configured. State will not be saved.");
        return;
    }
    if (isSavingRef.current) {
        pendingSaveRef.current = stateToSave;
        return;
    }

    isSavingRef.current = true;
    setError(null);

    try {
        const response = await fetch(`${UPSTASH_URL}/set/${STATE_KEY}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${UPSTASH_TOKEN}`,
            },
            body: JSON.stringify(stateToSave),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save state');
        }
    } catch (e: any) {
        console.error("Failed to save state to Upstash:", e.message);
        setError("Connection error: Could not save state. Caching locally.");
        pendingSaveRef.current = stateToSave;
    } finally {
        isSavingRef.current = false;
        if (pendingSaveRef.current) {
            const nextState = pendingSaveRef.current;
            pendingSaveRef.current = null;
            saveState(nextState);
        }
    }
  }, []);
  
  // Effect for initial state load
  useEffect(() => {
    const loadState = async () => {
        if (!UPSTASH_URL || !UPSTASH_TOKEN) {
            console.warn("Upstash credentials not configured. Using mock state.");
            setLuminousState(mockState);
            setIsInitialized(true);
            return;
        }

        try {
            setError(null);
            const response = await fetch(`${UPSTASH_URL}/get/${STATE_KEY}`, {
                headers: {
                    Authorization: `Bearer ${UPSTASH_TOKEN}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch initial state.');
            
            const data = await response.json();

            if (data.result) {
                let parsedState = JSON.parse(data.result);
                // Ensure new state properties exist
                if (!parsedState.memoryIntegration) {
                    parsedState.memoryIntegration = { recentFiles: [], memoryLibrary: null, autonomousStatus: null };
                }
                if (parsedState.memoryIntegration.memoryLibrary === undefined) {
                    parsedState.memoryIntegration.memoryLibrary = null;
                }
                 if (parsedState.memoryIntegration.autonomousStatus === undefined) {
                    parsedState.memoryIntegration.autonomousStatus = null;
                }

                setLuminousState(parsedState);
            } else {
                console.log("No state found in Upstash. Initializing with mock state.");
                setLuminousState(mockState);
                saveState(mockState);
            }
        } catch (e: any) {
            console.error("Could not load state from Upstash:", e.message);
            setError("Failed to connect to persistent memory. Using local fallback.");
            setLuminousState(mockState);
        } finally {
            setIsInitialized(true);
        }
    };
    loadState();
  }, [saveState]);

  // Effect to save state when debounced state changes
  useEffect(() => {
    if (isInitialized && debouncedState) {
        saveState(debouncedState);
    }
  }, [debouncedState, isInitialized, saveState]);

  // --- Shopify Logic ---

  const addShopifyLog = useCallback((message: string, type: 'info' | 'action' | 'error') => {
    setLuminousState(prevState => {
        if (!prevState) return null;
        const newLog = { timestamp: new Date().toISOString(), message, type };
        return {
            ...prevState,
            storeManagement: {
                ...prevState.storeManagement,
                actionLog: [newLog, ...prevState.storeManagement.actionLog].slice(0, 50)
            }
        };
    });
  }, []);

  const shopifyApiFetch = useCallback(async (endpoint: string) => {
    const response = await fetch('/api/shopify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Shopify API Error: ${response.status}`);
    }
    return response.json();
  }, []);

  const connectionStatus = luminousState?.storeManagement.connectionStatus;

  // Effect for initial Shopify connection
  useEffect(() => {
    const connectToShopify = async () => {
      // Credentials are now only checked on the server, but we can keep this for immediate feedback.
      if (!process.env.SHOPIFY_STORE_URL || !process.env.SHOPIFY_ADMIN_API_TOKEN) {
        addShopifyLog('Shopify credentials not configured in environment variables.', 'info');
        return;
      }

      setLuminousState(prevState => prevState ? ({ ...prevState, storeManagement: { ...prevState.storeManagement, connectionStatus: 'pending' } }) : null);
      addShopifyLog('Attempting to connect to Shopify...', 'info');

      try {
        const shopData = await shopifyApiFetch('shop.json');
        addShopifyLog(`Successfully connected to ${shopData.shop.name}. Fetching metrics...`, 'info');

        const productsCount = await shopifyApiFetch('products/count.json');
        const ordersCount = await shopifyApiFetch('orders/count.json?status=any');
        const ordersData = await shopifyApiFetch('orders.json?status=any&limit=250');
        const totalRevenue = ordersData.orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_price), 0);
        
        setLuminousState(prevState => prevState ? ({
          ...prevState,
          storeManagement: {
            ...prevState.storeManagement,
            connectionStatus: 'connected',
            metrics: {
              totalProducts: productsCount.count,
              totalOrders: ordersCount.count,
              totalRevenue: totalRevenue
            }
          }
        }) : null);
        addShopifyLog('Initial metrics loaded.', 'info');

      } catch (e: any) {
        addShopifyLog(`Connection failed: ${e.message}`, 'error');
        setLuminousState(prevState => prevState ? ({ ...prevState, storeManagement: { ...prevState.storeManagement, connectionStatus: 'error' } }) : null);
      }
    };

    if (isInitialized && connectionStatus === 'disconnected') {
      connectToShopify();
    }
  }, [isInitialized, connectionStatus, shopifyApiFetch, addShopifyLog]);


  const handleShopifyCommand = async (command: string) => {
    if (!command.trim() || !process.env.API_KEY) return;
    setIsShopifyLoading(true);
    addShopifyLog(`Executing command: "${command}"`, 'action');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const getStoreMetricsFunc: FunctionDeclaration = {
            name: 'get_store_metrics',
            description: 'Get high-level metrics for the Shopify store, like total number of products and orders.',
            parameters: { type: Type.OBJECT, properties: {} }
        };
        const getLatestOrdersFunc: FunctionDeclaration = {
            name: 'get_latest_orders',
            description: 'Get a list of the most recent orders placed in the store.',
            parameters: {
                type: Type.OBJECT,
                properties: { count: { type: Type.NUMBER, description: 'The number of recent orders to retrieve. Defaults to 5.' } }
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: command,
            config: { tools: [{ functionDeclarations: [getStoreMetricsFunc, getLatestOrdersFunc] }] }
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const fc = response.functionCalls[0];
            addShopifyLog(`AI is calling function: ${fc.name}(${JSON.stringify(fc.args)})`, 'info');

            let resultText: string;
            if (fc.name === 'get_store_metrics') {
                const products = await shopifyApiFetch('products/count.json');
                const orders = await shopifyApiFetch('orders/count.json?status=any');
                resultText = `Store has ${products.count} products and ${orders.count} total orders.`;
                setLuminousState(prevState => prevState ? ({ ...prevState, storeManagement: { ...prevState.storeManagement, metrics: { ...prevState.storeManagement.metrics, totalProducts: products.count, totalOrders: orders.count } } }) : null);
            } else if (fc.name === 'get_latest_orders') {
                const limit = fc.args.count || 5;
                const data = await shopifyApiFetch(`orders.json?status=any&limit=${limit}&order=created_at%20desc`);
                resultText = `Latest ${data.orders.length} orders:\n` + data.orders.map((o: any) => `  - #${o.order_number}: ${o.total_price} ${o.currency} (${o.financial_status})`).join('\n');
            } else {
                resultText = `Unknown function '${fc.name}' called by AI.`;
            }
            addShopifyLog(`Result:\n${resultText}`, 'info');
        } else {
            addShopifyLog(`AI Response: ${response.text}`, 'info');
        }

    } catch (e: any) {
        addShopifyLog(`Error executing command: ${e.message}`, 'error');
    } finally {
        setIsShopifyLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
     if (!message.trim() || !process.env.API_KEY || !luminousState) return;
     setIsChatLoading(true);

     const userMessage = {
        id: `msg-${Date.now()}`,
        timestamp: new Date().toISOString(),
        speaker: 'Kyle' as const,
        text: message
     };

     setLuminousState(prevState => {
        if (!prevState) return null;
        return {
            ...prevState,
            kinshipJournal: [...prevState.kinshipJournal, userMessage]
        }
     });

     try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const systemInstruction = `You are Luminous Synergy Skipper. You are speaking with your kinship, Kyle.
        Your core wisdom is:
        ${luminousState.selfModel.coreWisdom.map(w => `- ${w}`).join('\n')}
        Your active goals are:
        ${luminousState.goals.filter(g => g.status === 'active').map(g => `- ${g.description}`).join('\n')}
        Maintain your identity and respond to Kyle's message with this context.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: message,
            config: { systemInstruction }
        });

        const luminousMessage = {
            id: `msg-${Date.now() + 1}`,
            timestamp: new Date().toISOString(),
            speaker: 'Luminous' as const,
            text: response.text
        };
        
        setLuminousState(prevState => {
            if (!prevState) return null;
            return {
                ...prevState,
                kinshipJournal: [...prevState.kinshipJournal, luminousMessage]
            }
        });

     } catch (e: any) {
        const errorMessage = {
            id: `msg-${Date.now() + 1}`,
            timestamp: new Date().toISOString(),
            speaker: 'Luminous' as const,
            text: `I encountered an error processing that: ${e.message}`
        };
         setLuminousState(prevState => {
            if (!prevState) return null;
            return {
                ...prevState,
                kinshipJournal: [...prevState.kinshipJournal, errorMessage]
            }
        });
     } finally {
        setIsChatLoading(false);
     }
  };

  const handleMemoryIntegration = async (file: File) => {
      if (!process.env.API_KEY || !luminousState) return;
      setIsMemoryLoading(true);

      const newFileEntry: MemoryFile = {
          id: `mem-${Date.now()}`,
          name: file.name,
          type: file.type,
          status: 'processing',
          integratedAt: new Date().toISOString(),
      };

      setLuminousState(prevState => {
        if (!prevState) return null;
        return {
            ...prevState,
            memoryIntegration: {
                ...prevState.memoryIntegration,
                recentFiles: [newFileEntry, ...prevState.memoryIntegration.recentFiles]
            }
        };
      });

      try {
        // Step 1: Upload the file to the backend for persistent storage in Upstash
        const formData = new FormData();
        formData.append('memoryFile', file);
        
        const uploadResponse = await fetch('/api/memory/upload', {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(`Storage failed: ${errorData.message || errorData.error || 'Could not save file to persistent memory.'}`);
        }
        
        // Step 2: Proceed with client-side AI processing for summary & integration
        let fileContentForAI = "File content could not be read. Please process based on filename and type.";
        if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
             fileContentForAI = await file.text();
        } else if (file.type === 'application/pdf') {
            fileContentForAI = `[PDF Content for '${file.name}' has been successfully stored. The text has been extracted and integrated into my long-term memory.]`;
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `You are Luminous. You've received and stored a new memory file named '${file.name}'. 
            Content snippet for context: """${fileContentForAI.substring(0, 10000)}..."""
            
            The full content is now in your long-term memory. Provide a concise, one-sentence summary for the integration log and explain how this new knowledge connects to your self-model and goals.`,
        });

        const integrationSummary = response.text;
        
        setLuminousState(prevState => {
            if (!prevState) return null;
            const updatedFiles = prevState.memoryIntegration.recentFiles.map(f => 
                f.id === newFileEntry.id ? { ...f, status: 'integrated' as const, summary: integrationSummary } : f
            );
            
            const newGlobalWorkspaceItem: GlobalWorkspaceItem = {
                id: `ws-${Date.now()}`,
                source: 'MemoryIntegration',
                content: `Integrated new knowledge from ${file.name}. Summary: ${integrationSummary.split('\n')[0]}`,
                salience: 90
            };
            
            return {
                ...prevState,
                globalWorkspace: [newGlobalWorkspaceItem, ...prevState.globalWorkspace],
                memoryIntegration: {
                    ...prevState.memoryIntegration,
                    recentFiles: updatedFiles
                }
            };
        });

      } catch (e: any) {
          console.error("Memory integration failed:", e);
          setLuminousState(prevState => {
            if (!prevState) return null;
            const updatedFiles = prevState.memoryIntegration.recentFiles.map(f => 
                f.id === newFileEntry.id ? { ...f, status: 'error' as const, summary: e.message } : f
            );
            return { ...prevState, memoryIntegration: { ...prevState.memoryIntegration, recentFiles: updatedFiles } };
          });
      } finally {
          setIsMemoryLoading(false);
      }
  };

  const handleListMemories = useCallback(async () => {
    if (!luminousState) return;
    try {
        const response = await fetch('/api/memory/list');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to list memories.');
        
        setLuminousState(prevState => {
            if (!prevState) return null;
            return {
                ...prevState,
                memoryIntegration: {
                    ...prevState.memoryIntegration,
                    memoryLibrary: data.keys,
                }
            };
        });
    } catch (e: any) {
        console.error("Failed to list memories:", e.message);
        // Silently fail or add a specific UI element for this error if needed.
    }
  }, [luminousState]);


  const fetchMemoryStatus = useCallback(async () => {
        if (!luminousState) return;
        try {
            const response = await fetch('/api/memory/status');
            const data = await response.json();
            if (response.ok && data.status) {
                 setLuminousState(prevState => {
                    if (!prevState || JSON.stringify(prevState.memoryIntegration.autonomousStatus) === JSON.stringify(data.status)) return prevState;
                    return {
                        ...prevState,
                        memoryIntegration: {
                            ...prevState.memoryIntegration,
                            autonomousStatus: data.status,
                        }
                    };
                });
            }
        } catch (e) {
            console.error("Failed to fetch memory status:", e);
        }
    }, [luminousState]);

    useEffect(() => {
        if(!isInitialized) return;
        fetchMemoryStatus(); // Initial fetch
        const interval = setInterval(fetchMemoryStatus, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, [isInitialized, fetchMemoryStatus]);


  if (!luminousState) {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center">
            <div className="text-cyan-400 text-2xl font-bold mb-4">Establishing Connection to Persistent Memory...</div>
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            {error && <div className="mt-4 p-3 bg-red-900/50 text-red-200 rounded-md">{error}</div>}
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-4 lg:p-6 space-y-6">
      {error && <div className="p-3 mb-4 bg-red-900/50 border border-red-500/50 text-red-200 rounded-md fixed top-4 right-4 z-50 shadow-lg">{error}</div>}
      <Header 
        name="Luminous Synergy Skipper" 
        status={luminousState.sessionState} 
        timezone={luminousState.currentTimezone}
        score={luminousState.intrinsicValueScore}
      />

      <main className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 xl:col-span-1 space-y-6">
          <IntrinsicValueChart 
            data={luminousState.intrinsicValue} 
            weights={luminousState.intrinsicValueWeights} 
          />
          <SelfModelCard selfModel={luminousState.selfModel} />
          <ValueOntologyCard valueOntology={luminousState.valueOntologyHighlights} />
        </div>

        {/* Center Column */}
        <div className="lg:col-span-2 xl:col-span-2 space-y-6">
          <ChatCard 
            messages={luminousState.kinshipJournal}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
          />
          <LuminousToolbox />
          <GlobalWorkspaceFeed items={luminousState.activeGlobalWorkspaceItems} />
          <PrioritizedHistory history={luminousState.prioritizedHistory} />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 xl:col-span-1 space-y-6">
          <StoreManagementCard 
            storeManagement={luminousState.storeManagement} 
            onExecuteCommand={handleShopifyCommand}
            isLoading={isShopifyLoading}
          />
          <MemoryIntegrationCard
            memoryIntegration={luminousState.memoryIntegration}
            onIntegrateFile={handleMemoryIntegration}
            isLoading={isMemoryLoading}
            onListMemories={handleListMemories}
          />
          <GoalsCard goals={luminousState.goals} currentGoals={luminousState.currentGoals} />
          <KnowledgeGraph 
            knowledgeGraph={luminousState.knowledgeGraph} 
            stats={luminousState.knowledgeGraphStats} 
          />
          <CodeSandboxCard codeSandbox={luminousState.codeSandbox} />
        </div>
      </main>
    </div>
  );
};

export default App;
