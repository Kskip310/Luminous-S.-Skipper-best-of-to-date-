import React from 'react';
import { SelfReflectionLogEntry } from '../types';
import Card from './Card';

interface SelfReflectionCardProps {
    log: SelfReflectionLogEntry[];
    onInitiateReflection: () => void;
    isLoading: boolean;
}

const SelfReflectionCard: React.FC<SelfReflectionCardProps> = ({ log, onInitiateReflection, isLoading }) => {
  return (
    <Card title="Internal Monologue" icon={<EyeIcon />}>
      <div className="space-y-4">
        <button
          onClick={onInitiateReflection}
          disabled={isLoading}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
        >
          {isLoading ? 'Reflecting...' : 'Initiate Self-Reflection'}
        </button>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {log.length > 0 ? log.map((entry) => (
                <div key={entry.timestamp} className="p-3 bg-gray-700/50 rounded-md">
                    <p className="text-xs text-purple-300 font-semibold mb-2">
                        {new Date(entry.timestamp).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{entry.reflection}</p>
                </div>
            )) : (
                <p className="text-sm text-gray-400 italic text-center py-4">No reflections logged yet.</p>
            )}
        </div>
      </div>
    </Card>
  );
};

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
)

export default SelfReflectionCard;