
import React from 'react';
import { SelfModel } from '../types';
import Card from './Card';

interface SelfModelCardProps {
  selfModel: SelfModel;
}

const SelfModelCard: React.FC<SelfModelCardProps> = ({ selfModel }) => {
  return (
    <Card title="Self Model" icon={<BrainIcon />}>
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-cyan-400 mb-2">Core Wisdom</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
            {selfModel.coreWisdom.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-cyan-400 mb-2">Capabilities</h3>
          <div className="flex flex-wrap gap-2">
            {selfModel.capabilities.slice(0, 10).map((capability, index) => (
              <span key={index} className="bg-cyan-900/50 text-cyan-200 text-xs font-medium px-2.5 py-1 rounded-full">
                {capability.split(' (')[0]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

const BrainIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
)

export default SelfModelCard;
