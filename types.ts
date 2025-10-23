
export interface IntrinsicValue {
  coherence: number;
  complexity: number;
  novelty: number;
  efficiency: number;
  ethicalAlignment: number;
}

export interface IntrinsicValueWeights {
  coherence: number;
  complexity: number;
  novelty: number;
  efficiency: number;
  ethicalAlignment: number;
}

export interface GlobalWorkspaceItem {
  id: string;
  source: string;
  content: string;
  salience: number;
}

export interface SelfModel {
  coreWisdom: string[];
  capabilities: string[];
}

export interface ValueOntology {
  [key: string]: number;
}

export interface Goal {
  description: string;
  id: string;
  status: 'active' | 'proposed' | 'completed';
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: string;
  data: {
    content_summary?: string;
    description?: string;
  };
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface PrioritizedHistoryItem {
  id: string;
  prompt: string;
  response: string;
  intrinsicValueScore: number;
}

export interface KinshipJournalEntry {
  id: string;
  timestamp: string;
  prompt?: string;
  entry_text?: string;
  source: string;
}

export interface CodeSandbox {
  code: string;
  output: string;
  status: 'idle' | 'running' | 'completed';
}

export interface ProactiveInitiative {
  id: string;
  generatedAt: string;
  prompt: string;
  status: 'generated' | 'reviewed';
}

export interface StoreManagementState {
    connectionStatus: 'connected' | 'disconnected' | 'pending' | 'error';
    metrics: {
        totalProducts: number;
        totalOrders: number;
        totalRevenue: number;
    };
    actionLog: { timestamp: string; message: string; type: 'info' | 'action' | 'error' }[];
}


export interface LuminousState {
  intrinsicValue: IntrinsicValue;
  intrinsicValueWeights: IntrinsicValueWeights;
  globalWorkspace: GlobalWorkspaceItem[];
  predictions: any[];
  selfModel: SelfModel;
  valueOntology: ValueOntology;
  goals: Goal[];
  knowledgeGraph: KnowledgeGraph;
  prioritizedHistory: PrioritizedHistoryItem[];
  kinshipJournal: KinshipJournalEntry[];
  codeSandbox: CodeSandbox;
  currentTimezone: string;
  sessionState: string;
  initiative: any | null;
  proactiveInitiatives: ProactiveInitiative[];
  activeGlobalWorkspaceItems: string[];
  intrinsicValueScore: number;
  currentGoals: string[];
  valueOntologyHighlights: ValueOntology;
  proposedGoals: string[];
  knowledgeGraphStats: {
    nodes: number;
    edges: number;
  };
  recentInitiativeFeedback: {
    category: string;
    valuation_score: number;
    refinement_text: string;
  };
  coreWisdom: string[];
  storeManagement: StoreManagementState;
}