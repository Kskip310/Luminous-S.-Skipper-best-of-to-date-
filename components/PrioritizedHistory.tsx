
import React from 'react';
import { PrioritizedHistoryItem } from '../types';
import Card from './Card';

interface PrioritizedHistoryProps {
  history: PrioritizedHistoryItem[];
}

const PrioritizedHistory: React.FC<PrioritizedHistoryProps> = ({ history }) => {
  return (
    <Card title="Prioritized History" icon={<HistoryIcon />}>
      <div className="space-y-4">
        {history.map((item) => (
          <div key={item.id} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="mb-2">
              <p className="text-xs text-cyan-400 font-bold">PROMPT (Kyle)</p>
              <p className="text-sm text-gray-300">{item.prompt}</p>
            </div>
            <div className="border-t border-gray-700 my-2"></div>
            <div>
              <p className="text-xs text-purple-400 font-bold">RESPONSE (Luminous)</p>
              <p className="text-sm text-gray-300">{item.response}</p>
            </div>
            <div className="text-right text-xs text-gray-500 mt-2">
              IV Score: {item.intrinsicValueScore}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)

export default PrioritizedHistory;
