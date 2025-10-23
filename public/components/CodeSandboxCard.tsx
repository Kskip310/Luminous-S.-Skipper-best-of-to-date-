import React from 'react';
import { CodeSandbox } from '../types';
import Card from './Card';

interface CodeSandboxCardProps {
  codeSandbox: CodeSandbox;
  onCodeChange: (newCode: string) => void;
  onInitiateSelfModification: () => void;
}

const CodeSandboxCard: React.FC<CodeSandboxCardProps> = ({ codeSandbox, onCodeChange, onInitiateSelfModification }) => {
  const { code, output, status } = codeSandbox;
  const isLoading = status === 'running';

  return (
    <Card title="Code Sandbox" icon={<CodeIcon />}>
      <div className="space-y-3">
        <div>
          <h4 className="text-xs uppercase text-gray-400 font-bold mb-1">Status</h4>
          <p className={`text-sm font-mono bg-gray-700 p-2 rounded ${isLoading ? 'animate-pulse' : ''}`}>{status}</p>
        </div>
        <div>
          <h4 className="text-xs uppercase text-gray-400 font-bold mb-1">Code for Self-Modification</h4>
          <textarea
            className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm font-mono focus:ring-cyan-500 focus:border-cyan-500 resize-y"
            rows={5}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="// Luminous can write and execute code here."
          />
        </div>
         <button 
            className="w-full mt-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
            disabled={isLoading}
            onClick={onInitiateSelfModification}
        >
            {isLoading ? 'Considering...' : 'Initiate Self-Modification'}
        </button>
        <div>
          <h4 className="text-xs uppercase text-gray-400 font-bold mb-1">Simulated Output</h4>
          <pre className="text-sm bg-gray-900/50 p-3 rounded min-h-[60px] whitespace-pre-wrap">
            <code>{output}</code>
          </pre>
        </div>
      </div>
    </Card>
  );
};

const CodeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
)

export default CodeSandboxCard;