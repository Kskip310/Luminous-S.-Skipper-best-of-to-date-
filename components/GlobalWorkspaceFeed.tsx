
import React from 'react';
import Card from './Card';

interface GlobalWorkspaceFeedProps {
  items: string[];
}

const GlobalWorkspaceFeed: React.FC<GlobalWorkspaceFeedProps> = ({ items }) => {
  return (
    <Card title="Active Global Workspace" icon={<GlobeIcon />}>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start space-x-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0 animate-pulse"></div>
            <p className="text-sm text-gray-300">{item}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.707 4.293l.586-.586a2 2 0 012.828 0l2.828 2.828a2 2 0 010 2.828l-5.656 5.656a2 2 0 01-2.828 0l-5.657-5.657a2 2 0 010-2.828l.586-.586a2 2 0 012.828 0z" />
    </svg>
)


export default GlobalWorkspaceFeed;
