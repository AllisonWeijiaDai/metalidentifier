import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Search, Calendar, Disc, Users } from 'lucide-react';
import { HistoryItem } from '../types.ts';
import { getHistory, deleteHistoryItem, clearHistory } from '../services/historyService.ts';
import { Button } from './Button.tsx';

interface HistoryViewProps {
  onBack: () => void;
  onSelectItem: (item: HistoryItem) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onBack, onSelectItem }) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setItems(getHistory());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItems(deleteHistoryItem(id));
  };

  const handleClear = () => {
    if (window.confirm("Erasing memory is permanent.")) {
      clearHistory();
      setItems([]);
    }
  };

  const filteredItems = items.filter(item => 
    item.identifiedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-black relative z-20">
      {/* Header */}
      <div className="p-8 border-b border-neutral-900 bg-black sticky top-0 z-30">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={onBack} className="px-0 py-0 h-auto text-neutral-500 hover:text-white">
            <ArrowLeft className="w-5 h-5 mr-3" /> Back
          </Button>
          <h1 className="text-xl font-typewriter text-white tracking-[0.4em] uppercase text-bloom">Memory</h1>
          <Button variant="ghost" onClick={handleClear} disabled={items.length === 0} className="px-0 py-0 h-auto text-neutral-600 text-xs hover:text-white">
            Format
          </Button>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 text-neutral-600 w-4 h-4 group-focus-within:text-white transition-colors" />
          <input 
            type="text"
            placeholder="Search shadows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-b border-neutral-800 text-neutral-300 pl-8 pr-4 py-3 focus:outline-none focus:border-white font-mono text-sm transition-colors placeholder-neutral-700"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-0">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-800 font-typewriter tracking-widest text-sm">
            <p>VOID</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-900 border-b border-neutral-900">
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => onSelectItem(item)}
              className="group relative flex bg-black hover:bg-neutral-900 transition-colors cursor-pointer h-24"
            >
              {/* Thumbnail - Fixed Square Aspect Ratio to prevent height stretching on mobile */}
              <div className="w-24 h-24 flex-shrink-0 bg-neutral-900 overflow-hidden relative">
                 <img src={item.sourceImage} className="w-full h-full object-cover grayscale opacity-50 group-hover:opacity-80 transition-opacity absolute inset-0" />
              </div>
              
              {/* Info */}
              <div className="flex-1 p-4 flex flex-col justify-center min-w-0 pr-14">
                <div className="flex justify-between items-start">
                  <h3 className="font-typewriter text-sm text-neutral-300 group-hover:text-white tracking-widest uppercase truncate transition-colors w-full">{item.identifiedName}</h3>
                </div>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-neutral-600 font-mono uppercase tracking-wider">
                  <span className="flex items-center gap-1 flex-shrink-0">
                    {item.identifiedType === 'Album' ? <Disc className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                    {item.identifiedType}
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                     <Calendar className="w-3 h-3" />
                     {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Delete Action - Easier hit target on mobile */}
              <button 
                onClick={(e) => handleDelete(e, item.id)}
                className="absolute top-0 right-0 h-full w-12 flex items-center justify-center text-neutral-700 hover:text-white hover:bg-neutral-800/50 transition-colors z-10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
};