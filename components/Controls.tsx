import React from 'react';
import { DrawingOptions, ToolType } from '../types';
import { RefreshCw, Download, Play, Type, PenTool, Shuffle, Palette, Pencil, Brush, X } from 'lucide-react';

interface ControlsProps {
  options: DrawingOptions;
  onChange: (options: DrawingOptions) => void;
  onClear: () => void;
  onReplay: () => void;
  onDownload: () => void;
  onRegenerateStyle?: () => void;
  currentFontName?: string;
  mode: 'draw' | 'type';
  setMode: (mode: 'draw' | 'type') => void;
  onClose?: () => void;
}

const Controls: React.FC<ControlsProps> = ({ 
  options, 
  onChange, 
  onClear, 
  onReplay, 
  onDownload, 
  onRegenerateStyle,
  currentFontName,
  mode,
  setMode,
  onClose
}) => {
  
  const tools: { id: ToolType; label: string; icon: React.ReactNode }[] = [
      { id: 'pen', label: 'Pen', icon: <PenTool size={16} /> },
      { id: 'pencil', label: 'Pencil', icon: <Pencil size={16} /> },
      { id: 'calligraphy', label: 'Brush', icon: <Brush size={16} /> },
  ];

  return (
    <div className="flex flex-col gap-6 bg-white md:bg-transparent p-6 w-full h-full overflow-y-auto">
      
      {/* Mobile Handle / Header */}
      <div className="flex md:hidden items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800 text-lg">Settings</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
              <X size={24} />
          </button>
      </div>

      {/* Mode Switcher */}
      <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
        <button
          onClick={() => setMode('draw')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
            mode === 'draw' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PenTool size={16} />
          Draw
        </button>
        <button
          onClick={() => setMode('type')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
            mode === 'type' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Type size={16} />
          Type
        </button>
      </div>

      {/* Tool Selector (Only in Draw Mode) */}
      {mode === 'draw' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">Drawing Tool</label>
             <div className="grid grid-cols-3 gap-2">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => onChange({ ...options, tool: tool.id })}
                        className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border transition-all ${
                            options.tool === tool.id 
                            ? 'bg-brand-50 border-brand-200 text-brand-700' 
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {tool.icon}
                        <span className="text-xs font-medium">{tool.label}</span>
                    </button>
                ))}
             </div>
          </div>
      )}

      {/* Style Controls */}
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
                {mode === 'draw' ? 'Properties' : 'Text Style'}
            </label>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{mode === 'draw' ? 'Thickness' : 'Weight'}</span>
                  <span>{options.maxWidth}px</span>
                </div>
                <input
                  type="range"
                  min="0.5" // Allow thinner text
                  max={mode === 'draw' ? "10" : "5"} 
                  step="0.1"
                  value={options.maxWidth}
                  onChange={(e) => onChange({ ...options, maxWidth: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>

              {mode === 'draw' && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Streamline</span>
                      <span>{Math.round(options.streamline * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.95"
                      step="0.05"
                      value={options.streamline}
                      onChange={(e) => onChange({ ...options, streamline: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                  </div>
              )}
            </div>
          </div>
      </div>

      {/* Color Picker */}
      <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">Color</label>
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200 shadow-sm shrink-0">
                    <input
                        type="color"
                        value={options.color}
                        onChange={(e) => onChange({ ...options, color: e.target.value })}
                        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
                    />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-medium mb-0.5">Hex Code</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-700 uppercase font-semibold">
                            {options.color}
                        </span>
                    </div>
                </div>
                <Palette className="ml-auto text-gray-400" size={18} />
            </div>
        </div>

      {mode === 'type' && (
         <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
                <p className="font-medium mb-1">Type Mode</p>
                <p>Type your name. Use the "Weight" slider to simulate a thicker pen nib.</p>
             </div>
             
             <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">Current Style</label>
                <div className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-2 rounded-md truncate border border-gray-200">
                    {currentFontName || 'Default'}
                </div>
             </div>
         </div>
      )}

      <div className="mt-auto space-y-3 pt-6 border-t border-gray-100">
        {mode === 'type' && onRegenerateStyle && (
            <button
                onClick={onRegenerateStyle}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg font-medium transition-colors"
            >
                <Shuffle size={18} />
                Next Style
            </button>
        )}

        {mode === 'draw' && (
          <button
            onClick={onReplay}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg font-medium transition-colors"
          >
            <Play size={18} />
            Replay Drawing
          </button>
        )}
        
        <button
          onClick={onClear}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg font-medium transition-colors"
        >
          <RefreshCw size={18} />
          {mode === 'draw' ? 'Clear Canvas' : 'Reset Text'}
        </button>

        <button
          onClick={onDownload}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium shadow-lg shadow-brand-500/30 transition-all hover:translate-y-[-1px]"
        >
          <Download size={18} />
          Download Signature
        </button>
      </div>
    </div>
  );
};

export default Controls;