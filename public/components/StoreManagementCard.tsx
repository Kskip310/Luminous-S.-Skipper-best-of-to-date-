import React, { useState } from 'react';
import { StoreManagementState } from '../types';
import Card from './Card';

interface StoreManagementCardProps {
  storeManagement: StoreManagementState;
  onExecuteCommand: (command: string) => Promise<void>;
  isLoading: boolean;
}

const StatusIndicator: React.FC<{ status: StoreManagementState['connectionStatus'] }> = ({ status }) => {
    const statusConfig = {
        connected: { color: 'bg-green-500', text: 'Connected' },
        disconnected: { color: 'bg-gray-500', text: 'Disconnected' },
        pending: { color: 'bg-yellow-500', text: 'Connecting...' },
        error: { color: 'bg-red-500', text: 'Error' },
    };
    const config = statusConfig[status];

    return (
        <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${config.color} ${status === 'pending' || status === 'connected' ? 'animate-pulse' : ''}`}></div>
            <span className="text-sm font-semibold">{config.text}</span>
        </div>
    );
};


const MetricDisplay: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="text-center p-2 bg-gray-700/50 rounded-lg">
        <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold text-cyan-400">{value}</div>
    </div>
);


const StoreManagementCard: React.FC<StoreManagementCardProps> = ({ storeManagement, onExecuteCommand, isLoading }) => {
  const { connectionStatus, metrics, actionLog } = storeManagement;
  const [command, setCommand] = useState('');

  const handleExecute = () => {
    if (command.trim() && !isLoading) {
      onExecuteCommand(command);
      setCommand(''); // Clear input after sending
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleExecute();
    }
  };


  return (
    <Card title="Store Management" icon={<StoreIcon />}>
      <div className="space-y-4">
        <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded-md">
            <h3 className="font-semibold text-cyan-400">Shopify API Status</h3>
            <StatusIndicator status={connectionStatus} />
        </div>

        <div className="grid grid-cols-3 gap-2">
            <MetricDisplay label="Products" value={metrics.totalProducts} />
            <MetricDisplay label="Orders" value={metrics.totalOrders} />
            <MetricDisplay label="Revenue" value={`$${metrics.totalRevenue.toFixed(2)}`} />
        </div>

        <div>
            <h3 className="font-semibold text-cyan-400 mb-2">Action Log</h3>
            <div className="bg-gray-900/50 p-2 rounded-md h-40 overflow-y-auto space-y-2 flex flex-col-reverse">
                <div>
                {actionLog.map((log, index) => (
                    <div key={index} className="text-xs leading-relaxed">
                        <span className="text-gray-500 mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className={`${log.type === 'error' ? 'text-red-400' : log.type === 'action' ? 'text-cyan-300' : 'text-gray-300'} whitespace-pre-wrap`}>
                            {log.message}
                        </span>
                    </div>
                ))}
                </div>
            </div>
        </div>
         <div>
            <h3 className="font-semibold text-cyan-400 mb-2">Issue Command</h3>
             <textarea
              className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50"
              rows={2}
              placeholder={connectionStatus === 'connected' ? "e.g., 'show me the last 3 orders'" : "Awaiting connection..."}
              disabled={connectionStatus !== 'connected' || isLoading}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button 
                className="w-full mt-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
                disabled={connectionStatus !== 'connected' || isLoading || !command.trim()}
                onClick={handleExecute}
            >
                {isLoading ? 'Executing...' : 'Execute'}
            </button>
        </div>
      </div>
    </Card>
  );
};

const StoreIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
)

export default StoreManagementCard;
