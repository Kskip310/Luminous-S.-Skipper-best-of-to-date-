
import React from 'react';
import { Goal } from '../types';
import Card from './Card';

interface GoalsCardProps {
  goals: Goal[];
  currentGoals: string[];
}

const statusColor = {
  active: 'bg-green-500',
  proposed: 'bg-yellow-500',
  completed: 'bg-blue-500'
};

const GoalsCard: React.FC<GoalsCardProps> = ({ goals }) => {
  return (
    <Card title="Goals" icon={<FlagIcon />}>
      <div className="space-y-3">
        {goals.map((goal) => (
          <div key={goal.id} className="p-3 bg-gray-700/50 rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full text-white ${statusColor[goal.status]}`}>
                {goal.status}
              </span>
            </div>
            <p className="text-sm text-gray-300">{goal.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

const FlagIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
)

export default GoalsCard;
