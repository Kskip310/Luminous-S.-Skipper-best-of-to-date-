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
        // console.log("State saved successfully.");
    } catch (e: any) {
        console.error("Failed to save state to Upstash:", e.message);
        setError("Connection error: Could not save state. Caching locally.");
        // If save fails, we keep the state in memory. A more robust solution
        // could use localStorage as a fallback cache.
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
                // console.log("State loaded from Upstash.");
            } else {
                // No state in Redis, so initialize with mock and save it.
                console.log("No state found in Upstash. Initializing with mock state.");
                setLuminousState(mockState);
                saveState(mockState);
            }
        } catch (e: any) {
            console.error("Could not load state from Upstash:", e.message);
            setError("Failed to connect to persistent memory. Using local fallback.");
            setLuminousState(mockState); // Fallback to mock state on error
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
          <StoreManagementCard storeManagement={luminousState.storeManagement} />
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