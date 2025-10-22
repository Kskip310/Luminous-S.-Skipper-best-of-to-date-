
import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', icon }) => {
  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-cyan-500/20 rounded-lg shadow-lg shadow-cyan-900/10 overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-4 bg-gray-800/70 border-b border-cyan-500/20">
        <h2 className="text-lg font-bold text-cyan-300 tracking-wider uppercase flex items-center">
          {icon && <span className="mr-3">{icon}</span>}
          {title}
        </h2>
      </div>
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default Card;
