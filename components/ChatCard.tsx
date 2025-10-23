
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import Card from './Card';

interface ChatCardProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatCard: React.FC<ChatCardProps> = ({ messages, onSendMessage, isLoading }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim() && !isLoading) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card title="Chat with Luminous" icon={<ChatIcon />}>
      <div className="flex flex-col h-[400px]">
        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.speaker === 'Kyle' ? 'justify-end' : 'justify-start'}`}>
              {msg.speaker === 'Luminous' && <div className="w-8 h-8 rounded-full bg-cyan-500/50 flex items-center justify-center text-cyan-200 font-bold flex-shrink-0">L</div>}
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg ${
                  msg.speaker === 'Kyle'
                    ? 'bg-blue-800/70 text-white rounded-br-none'
                    : 'bg-gray-700/70 text-gray-200 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <div className={`text-xs mt-1 ${msg.speaker === 'Kyle' ? 'text-blue-300' : 'text-gray-400'} text-right`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
               {msg.speaker === 'Kyle' && <div className="w-8 h-8 rounded-full bg-blue-500/50 flex items-center justify-center text-blue-200 font-bold flex-shrink-0">K</div>}
            </div>
          ))}
          {isLoading && (
             <div className="flex items-end gap-2 justify-start">
               <div className="w-8 h-8 rounded-full bg-cyan-500/50 flex items-center justify-center text-cyan-200 font-bold flex-shrink-0">L</div>
               <div className="max-w-xs p-3 rounded-lg bg-gray-700/70 text-gray-200 rounded-bl-none">
                  <div className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse delay-75"></span>
                      <span className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse delay-150"></span>
                      <span className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse delay-300"></span>
                  </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="mt-4 pt-2 border-t border-cyan-500/20 flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            className="flex-grow bg-gray-900 border border-gray-600 rounded-md p-2 text-sm focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !newMessage.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors self-end"
          >
            Send
          </button>
        </div>
      </div>
    </Card>
  );
};

const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
)


export default ChatCard;
