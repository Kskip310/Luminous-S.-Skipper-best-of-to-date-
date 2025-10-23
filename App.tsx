import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LuminousState } from './types';
import { mockState } from './mockData';
import Header from './components/Header';
import IntrinsicValueChart from './components/IntrinsicValueChart';
import SelfModelCard from './components/SelfModelCard';
import GoalsCard from './components/GoalsCard';
import ValueOntologyCard from './components/ValueOntologyCard';
import KnowledgeGraph from './components/KnowledgeGraph';
import GlobalWorkspaceFeed from './components/GlobalWorkspaceFeed';
import KinshipJournal from './components/KinshipJournal';
import CodeSandboxCard from './components/CodeSandboxCard';
import PrioritizedHistory from './components/PrioritizedHistory';
import LuminousToolbox from './components/LuminousToolbox';
import StoreManagementCard from './components/StoreManagementCard';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';


// --- Upstash Configuration ---
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const STATE_KEY = "luminous:state";

// --- Shopify Configuration ---
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL; // e.g., your-store.myshopify.com
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const SHOPIFY_API_VERSION = '2024-07';


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
                const parsedState = JSON.parse(data.result);
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
    if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_TOKEN) {
      throw new Error("Shopify credentials are not configured.");
    }
    const url = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;
    const response = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API Error: ${response.status} - ${errorText}`);
    }
    return response.json();
  }, []);

  const connectionStatus = luminousState?.storeManagement.connectionStatus;

  // Effect for initial Shopify connection
  useEffect(() => {
    const connectToShopify = async () => {
      if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_TOKEN) {
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
          <LuminousToolbox />
          <GlobalWorkspaceFeed items={luminousState.activeGlobalWorkspaceItems} />
          <PrioritizedHistory history={luminousState.prioritizedHistory} />
          <KinshipJournal entries={luminousState.kinshipJournal} />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 xl:col-span-1 space-y-6">
          <StoreManagementCard 
            storeManagement={luminousState.storeManagement} 
            onExecuteCommand={handleShopifyCommand}
            isLoading={isShopifyLoading}
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