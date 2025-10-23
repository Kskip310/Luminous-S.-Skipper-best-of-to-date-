import React from 'react';
import { ProactiveInitiative } from '../types';
import Card from './Card';

interface ProactiveInitiativesCardProps {
  initiatives: ProactiveInitiative[];
}

const ProactiveInitiativesCard: React.FC<ProactiveInitiativesCardProps> = ({ initiatives }) => {
  return (
    <Card title="Proactive Initiatives" icon={<LightbulbIcon />}>
      <div className="space-y-3">
        {initiatives.length > 0 ? initiatives.map((initiative) => (
          <div key={initiative.id} className="p-3 bg-gray-700/50 rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full text-yellow-200 bg-yellow-900/50">
                {initiative.status}
              </span>
               <span className="text-xs text-gray-400">
                {new Date(initiative.generatedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-300">{initiative.prompt}</p>
          </div>
        )) : (
          <p className="text-sm text-gray-400 italic">No new initiatives generated yet.</p>
        )}
      </div>
    </Card>
  );
};

const LightbulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
)

export default ProactiveInitiativesCard;