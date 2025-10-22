import React from 'react';
import { ValueOntology } from '../types';
import Card from './Card';

interface ValueOntologyCardProps {
  valueOntology: ValueOntology;
}

const ValueOntologyCard: React.FC<ValueOntologyCardProps> = ({ valueOntology }) => {
  return (
    <Card title="Value Ontology Highlights" icon={<SparklesIcon />}>
      <ul className="space-y-2">
        {Object.entries(valueOntology).map(([key, value]) => (
          <li key={key} className="flex justify-between items-center text-sm">
            <span className="text-gray-300">{key}</span>
            {/* FIX: Cast value to number to use toFixed, as TypeScript may infer it as 'unknown'. */}
            <span className="font-bold text-cyan-400 bg-gray-700 px-2 py-1 rounded">{(value as number).toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L10 17l-4 4 4-4 3.293-3.293a1 1 0 011.414 0l2.293 2.293" />
    </svg>
)


export default ValueOntologyCard;