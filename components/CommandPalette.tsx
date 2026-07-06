"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  IconSearch, 
  IconDatabase, 
  IconPlayerPlay, 
  IconTerminal, 
  IconLayout,
  IconChartBar,
  IconCpu
} from '@tabler/icons-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  connections: string[];
  activeConnection: string;
  onSelectConnection: (conn: string) => void;
  recentQueries: { id: string; raw_query: string; fingerprint_hash?: string }[];
  onSelectQuery: (query: string) => void;
  onRerun: () => void;
  onToggleView: (view: 'ai' | 'diff' | 'explain' | 'indexes' | 'trend') => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  connections,
  activeConnection,
  onSelectConnection,
  recentQueries,
  onSelectQuery,
  onRerun,
  onToggleView,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    { category: 'General', name: 'Rerun last query analysis', action: () => { onRerun(); onClose(); }, icon: <IconPlayerPlay size={16} /> },
    { category: 'Views', name: 'Switch to Plan Tree view', action: () => { onToggleView('explain'); onClose(); }, icon: <IconCpu size={16} /> },
    { category: 'Views', name: 'Switch to AI Insights view', action: () => { onToggleView('ai'); onClose(); }, icon: <IconLayout size={16} /> },
    { category: 'Views', name: 'Switch to Side-by-Side Diff view', action: () => { onToggleView('diff'); onClose(); }, icon: <IconTerminal size={16} /> },
    { category: 'Views', name: 'Switch to Index Recommendations', action: () => { onToggleView('indexes'); onClose(); }, icon: <IconDatabase size={16} /> },
    { category: 'Views', name: 'Switch to Performance Trend chart', action: () => { onToggleView('trend'); onClose(); }, icon: <IconChartBar size={16} /> },
  ];

  const connectionItems = connections.map(conn => ({
    category: 'Connections',
    name: `Switch connection: ${conn}`,
    action: () => { onSelectConnection(conn); onClose(); },
    icon: <IconDatabase size={16} />
  }));

  const queryItems = recentQueries.map(q => ({
    category: 'Recent Queries',
    name: q.raw_query.length > 55 ? q.raw_query.substring(0, 55) + '...' : q.raw_query,
    action: () => { onSelectQuery(q.raw_query); onClose(); },
    icon: <IconTerminal size={16} />
  }));

  const allItems = [...commands, ...connectionItems, ...queryItems];
  const filtered = allItems.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div
        ref={containerRef}
        className="w-full max-w-lg bg-[#0F0F15] border border-[#2D2D3D] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[420px]"
      >
        <div className="flex items-center gap-2 border-b border-[#2D2D3D] px-3.5 py-3">
          <IconSearch className="text-text-muted" size={18} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search queries, run commands..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-foreground text-sm border-none outline-none placeholder-text-muted"
          />
          <span className="text-[10px] bg-[#1C1C26] border border-[#2D2D3D] px-1.5 py-0.5 rounded text-text-muted font-mono">
            ESC
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted italic">
              No matching commands or queries found
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                  idx === selectedIndex 
                    ? 'bg-[#7C6FE0]/10 text-[#7C6FE0] font-medium border border-[#7C6FE0]/25' 
                    : 'bg-transparent text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 text-xs">
                  <span className={idx === selectedIndex ? 'text-[#7C6FE0]' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span className="truncate max-w-[320px]">{item.name}</span>
                </div>
                <span className="text-[9px] text-text-muted font-mono uppercase bg-[#181822] px-1.5 py-0.5 rounded border border-[#2D2D3D]">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
