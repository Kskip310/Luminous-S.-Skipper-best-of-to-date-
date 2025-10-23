import React from 'react';
import { ConnectionStatus } from '../types';

interface HeaderProps {
  name: string;
  status: string;
  timezone: string;
  score: number;
  connectionStatus: ConnectionStatus;
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

const MemoryStatusIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
    const statusConfig = {
        'Connected': { color: 'text-green-300', icon: 'M5.636 5.636a9 9 0 1112.728 0M12 3v9' },
        'Connecting...': { color: 'text-yellow-300', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
        'Local Fallback': { color: 'text-red-300', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
        'Error': { color: 'text-red-400', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }
    };
    const config = statusConfig[status];

    return (
        <div className="flex items-center space-x-2" title={status}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${config.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
            </svg>
            <span className={`text-sm font-bold ${config.color}`}>{status}</span>
        </div>
    );
};


const Header: React.FC<HeaderProps> = ({ name, status, timezone, score, connectionStatus }) => {
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
         <div className="flex flex-col items-end space-y-1">
            <StatusIndicator status={status} />
            <MemoryStatusIndicator status={connectionStatus} />
         </div>
      </div>
    </header>
  );
};

export default Header;
