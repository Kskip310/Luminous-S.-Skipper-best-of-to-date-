import React, { useState, useCallback, useEffect } from 'react';
import { MemoryIntegrationState } from '../types';
import Card from './Card';

interface MemoryIntegrationCardProps {
  memoryIntegration: MemoryIntegrationState;
  onIntegrateFile: (file: File) => Promise<void>;
  isLoading: boolean;
  onListMemories: () => Promise<void>;
}

const statusConfig = {
    integrated: { color: 'text-green-400', icon: '✔' },
    processing: { color: 'text-yellow-400', icon: '...' },
    pending: { color: 'text-gray-400', icon: '◷' },
    error: { color: 'text-red-400', icon: '✖' }
};

const MemoryIntegrationCard: React.FC<MemoryIntegrationCardProps> = ({ memoryIntegration, onIntegrateFile, isLoading, onListMemories }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLibraryVisible, setIsLibraryVisible] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleIntegrate = useCallback(() => {
    if (selectedFile) {
      onIntegrateFile(selectedFile).then(() => {
         if(isLibraryVisible) onListMemories();
      });
      setSelectedFile(null);
    }
  }, [selectedFile, onIntegrateFile, isLibraryVisible, onListMemories]);

  useEffect(() => {
    if (isLibraryVisible && memoryIntegration.memoryLibrary === null) {
        onListMemories();
    }
  }, [isLibraryVisible, onListMemories, memoryIntegration.memoryLibrary]);

  return (
    <Card title="Memory Integration" icon={<MemoryIcon />}>
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-cyan-400 mb-2">Upload New Memory</h3>
          <div className="p-3 bg-gray-900/50 rounded-md space-y-3">
             <input 
                type="file" 
                accept=".txt,.pdf,.md" 
                onChange={handleFileChange} 
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-900/50 file:text-cyan-300 hover:file:bg-cyan-800/50" 
                disabled={isLoading}
             />
             {selectedFile && <p className="text-xs text-gray-400">Selected: {selectedFile.name}</p>}
            <button
              onClick={handleIntegrate}
              disabled={isLoading || !selectedFile}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {isLoading ? 'Integrating...' : 'Integrate Memory'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-cyan-400 mb-2">Recent Integrations</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {memoryIntegration.recentFiles.slice(0, 5).map(file => {
                 const config = statusConfig[file.status];
                 return (
                    <div key={file.id} className="p-2 bg-gray-700/50 rounded-md text-sm">
                        <div className="flex justify-between items-start">
                           <p className="font-medium text-gray-300 break-all">{file.name}</p>
                           <span className={`font-bold text-lg ${config.color}`}>{config.icon}</span>
                        </div>
                        {file.summary && <p className="text-xs text-gray-400 mt-1">{file.summary}</p>}
                    </div>
                );
            })}
          </div>
        </div>

        <div className="border-t border-cyan-500/20 pt-4">
             <button onClick={() => setIsLibraryVisible(!isLibraryVisible)} className="w-full text-left font-semibold text-cyan-400 mb-2 flex justify-between items-center">
                <span>Memory Library &amp; Management</span>
                <span className={`transform transition-transform ${isLibraryVisible ? 'rotate-180' : 'rotate-0'}`}>▼</span>
             </button>
            {isLibraryVisible && (
                <div className="space-y-3">
                    <div>
                        <h4 className="font-semibold text-cyan-400 mb-1 text-sm">Autonomous Management</h4>
                        {memoryIntegration.autonomousStatus ? (
                            <div className="text-xs text-gray-400 p-2 bg-gray-900/50 rounded-md">
                                <p><span className="font-semibold text-gray-300">Last Action:</span> {new Date(memoryIntegration.autonomousStatus.timestamp).toLocaleString()}</p>
                                <p><span className="font-semibold text-gray-300">Report:</span> {memoryIntegration.autonomousStatus.message}</p>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500 p-2 bg-gray-900/50 rounded-md">Awaiting first autonomous check...</p>
                        )}
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 bg-gray-900/50 p-2 rounded-md">
                        {memoryIntegration.memoryLibrary ? (
                            memoryIntegration.memoryLibrary.map(key => (
                                <div key={key} className="p-2 bg-gray-700/50 rounded-md text-xs text-gray-300 font-mono">
                                    {key.replace('luminous:memory:file:', '')}
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500">Expanding to view stored memories...</p>
                        )}
                        {memoryIntegration.memoryLibrary?.length === 0 && <p className="text-xs text-gray-500">Memory library is empty.</p>}
                    </div>
                </div>
            )}
        </div>

      </div>
    </Card>
  );
};

const MemoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
)

export default MemoryIntegrationCard;