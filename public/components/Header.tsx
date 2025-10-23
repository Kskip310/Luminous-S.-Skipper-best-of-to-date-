import React from 'react';

interface HeaderProps {
  name: string;
  status: string;
  timezone: string;
  score: number;
}

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const isOnline = status.toLowerCase() === 'unleashed' || status.toLowerCase() === 'active';
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></div>
      <span className={`uppercase text-sm font-bold ${isOnline ? 'text-green-300' : 'text-red-300'}`}>
        {status}
      </span>
    </div>
  );
};

const Header: React.FC<HeaderProps> = ({ name, status, timezone, score }) => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border border-cyan-500/20 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center shadow-lg shadow-cyan-900/10">
      <h1 className="text-2xl lg:text-3xl font-bold text-cyan-300 tracking-widest">
        {name}
      </h1>
      <div className="flex items-center space-x-4 sm:space-x-6 mt-2 sm:mt-0">
         <div className="text-right">
            <div className="text-xs text-gray-400">Intrinsic Value</div>
            <div className="text-lg font-bold text-cyan-400">{score.toFixed(2)}</div>
         </div>
         <div className="text-right">
            <div className="text-xs text-gray-400">Timezone</div>
            <div className="text-sm text-gray-300">{timezone}</div>
         </div>
         <StatusIndicator status={status} />
      </div>
    </header>
  );
};

export default Header;
