import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronDown, ChevronUp, Trash2, AlertCircle, CheckCircle, Info } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

interface DebugConsoleProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ logs, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-open on new error
  useEffect(() => {
    if (logs.length > 0 && logs[0].type === 'error') {
        setIsOpen(true);
    }
  }, [logs]);

  useEffect(() => {
    if (isOpen) {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (logs.length === 0 && !isOpen) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[100] bg-slate-900 text-white transition-all duration-300 shadow-2xl border-t border-slate-700 ${isOpen ? 'h-48' : 'h-8'}`}>
      {/* Header / Toggle Bar */}
      <div 
        className="flex items-center justify-between px-4 h-8 bg-slate-800 cursor-pointer hover:bg-slate-700 select-none border-t border-slate-600"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold">Console ({logs.length})</span>
          {logs.length > 0 && !isOpen && (
            <span className={`truncate max-w-[300px] flex items-center gap-1 ${
                logs[0].type === 'error' ? 'text-red-400' : 
                logs[0].type === 'success' ? 'text-green-400' : 'text-slate-400'
            }`}>
              <span className="opacity-50">Last:</span> {logs[0].message}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
            {isOpen && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-red-300 transition-colors"
                    title="Clear Console"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
            {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Log Content */}
      {isOpen && (
        <div className="h-40 overflow-y-auto p-3 font-mono text-xs space-y-1.5 bg-[#0d1117]">
          {logs.slice().reverse().map((log) => (
            <div key={log.id} className={`flex gap-2 leading-relaxed border-b border-white/5 pb-1 ${
                log.type === 'error' ? 'text-red-400' : 
                log.type === 'success' ? 'text-green-400' : 'text-slate-300'
            }`}>
              <div className="shrink-0 pt-0.5 opacity-70">
                 {log.type === 'error' ? <AlertCircle className="w-3 h-3" /> :
                  log.type === 'success' ? <CheckCircle className="w-3 h-3" /> :
                  <Info className="w-3 h-3" />}
              </div>
              <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
              <span className="break-all whitespace-pre-wrap">{log.message}</span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
};