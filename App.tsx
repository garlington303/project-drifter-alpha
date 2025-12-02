
import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';

const App: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  
  // Settings State
  const [zoomLevel, setZoomLevel] = useState(2.0); // Default 2x
  const [shakeIntensity, setShakeIntensity] = useState(1.0); // Default 100%

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans">
      {/* Game Layer */}
      <GameCanvas 
        isPaused={isPaused} 
        zoomLevel={zoomLevel} 
        shakeIntensity={shakeIntensity} 
      />
      
      {/* Gameplay HUD (Hidden when paused for cleaner look, optional) */}
      <div className={`transition-opacity duration-200 ${isPaused ? 'opacity-20 blur-sm' : 'opacity-100'}`}>
        {/* UI Overlay */}
        <div className="absolute top-4 left-4 p-4 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 text-slate-200 pointer-events-none select-none">
          <h1 className="text-xl font-bold mb-2 text-emerald-400">Project Drifter</h1>
          <div className="text-sm space-y-1 opacity-90">
            <p><span className="font-bold text-white">WASD</span> to Move</p>
            <p><span className="font-bold text-white">SHIFT</span> to Sprint</p>
            <p><span className="font-bold text-white">E</span> to Interact</p>
            <p><span className="font-bold text-white">ESC</span> to Pause/Settings</p>
            <div className="h-px bg-slate-600 my-2"></div>
            <p id="debug-coords">Pos: 0, 0</p>
            <p id="debug-chunk">Chunk: 0, 0</p>
            <p id="debug-loaded">Loaded: 0</p>
            <p className="text-xs text-slate-400 mt-2">FLOOR: <span id="debug-floor">1</span></p>
          </div>
        </div>

        {/* HUD - Bottom Left */}
        <div className="absolute bottom-6 left-6 w-64 pointer-events-none select-none">
          {/* Health Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs font-bold text-red-400 mb-1">
              <span>HEALTH</span>
              <span id="ui-health-val">100/100</span>
            </div>
            <div className="h-4 bg-slate-800 rounded border border-slate-700 overflow-hidden">
              <div id="ui-health-bar" className="h-full bg-red-600 w-full transition-all duration-75"></div>
            </div>
          </div>

          {/* Mana Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs font-bold text-blue-400 mb-1">
              <span>MANA</span>
              <span id="ui-mana-val">100/100</span>
            </div>
            <div className="h-3 bg-slate-800 rounded border border-slate-700 overflow-hidden">
              <div id="ui-mana-bar" className="h-full bg-blue-500 w-full transition-all duration-75"></div>
            </div>
          </div>

          {/* Stamina Bar */}
          <div>
            <div className="flex justify-between text-xs font-bold text-yellow-400 mb-1">
              <span>STAMINA</span>
              <span id="ui-stamina-val">100/100</span>
            </div>
            <div className="h-3 bg-slate-800 rounded border border-slate-700 overflow-hidden">
              <div id="ui-stamina-bar" className="h-full bg-yellow-500 w-full transition-all duration-75"></div>
            </div>
          </div>
        </div>
      </div>

      {/* PAUSE MENU OVERLAY */}
      {isPaused && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-96 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-6 text-slate-100">
            <h2 className="text-3xl font-bold text-center mb-6 text-emerald-400 tracking-wider">PAUSED</h2>
            
            <div className="space-y-6">
              
              {/* Zoom Control */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-slate-300">Camera Zoom</label>
                  <span className="text-sm text-emerald-400">{zoomLevel.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="1.0" 
                  max="4.0" 
                  step="0.1" 
                  value={zoomLevel} 
                  onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Wide (1x)</span>
                  <span>Close (4x)</span>
                </div>
              </div>

              {/* Screen Shake Control */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-slate-300">Screen Shake</label>
                  <span className="text-sm text-emerald-400">{(shakeIntensity * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.0" 
                  max="2.0" 
                  step="0.1" 
                  value={shakeIntensity} 
                  onChange={(e) => setShakeIntensity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Off</span>
                  <span>Extreme</span>
                </div>
              </div>

            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button 
                onClick={() => setIsPaused(false)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
              >
                RESUME
              </button>
            </div>
            
            <p className="text-center text-xs text-slate-500 mt-4">
              Press ESC to toggle
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
