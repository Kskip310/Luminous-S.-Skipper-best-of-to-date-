
import React from 'react';
import { CodeSandbox } from '../types';
import Card from './Card';

interface CodeSandboxCardProps {
  codeSandbox: CodeSandbox;
}

const CodeSandboxCard: React.FC<CodeSandboxCardProps> = ({ codeSandbox }) => {
  return (
    <Card title="Code Sandbox" icon={<CodeIcon />}>
      <div className="space-y-3">
        <div>
          <h4 className="text-xs uppercase text-gray-400 font-bold mb-1">Status</h4>
          <p className="text-sm font-mono bg-gray-700 p-2 rounded">{codeSandbox.status}</p>
        </div>
        <div>
          <h4 className="text-xs uppercase text-gray-400 font-bold mb-1">Code</h4>
          <pre className="text-sm bg-gray-900 p-3 rounded-md overflow-x-auto">
            <code className="language-javascript">{codeSandbox.code}</code>
          </pre>
        </div>
        <div>
          <h4 className="text-xs uppercase text-gray-400 font-bold mb-1">Output</h4>
          <pre className="text-sm bg-gray-700 p-2 rounded min-h-[40px]">
            <code>{codeSandbox.output}</code>
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
