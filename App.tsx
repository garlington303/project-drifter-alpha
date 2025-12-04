
import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import TabMenu from './components/TabMenu';

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Settings State
  const [zoomLevel, setZoomLevel] = useState(3.5); // Default 3.5x
  const [shakeIntensity, setShakeIntensity] = useState(1.0); // Default 100%

  const spawnEnemy = (type: string) => {
    const event = new CustomEvent('debug-spawn-enemy', { detail: type });
    window.dispatchEvent(event);
  };

  useEffect(() => {
    if (!hasStarted) return; // Don't listen for game keys in menu

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Tab Menu
      if (e.code === 'Tab') {
        e.preventDefault(); // Prevent browser tab navigation focus
        setIsMenuOpen(prev => !prev);
        return;
      }

      // Toggle Pause (Only if Menu is NOT open)
      if (e.code === 'Escape' && !isMenuOpen) {
        setIsPaused(prev => !prev);
      }

      // Close Menu with Escape if it's open
      if (e.code === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
      
      // Debug Spawn Shortcuts (Only if game active)
      if (!isPaused && !isMenuOpen) {
        switch(e.code) {
          case 'Digit1': spawnEnemy('basic'); break;
          case 'Digit2': spawnEnemy('shooter'); break;
          case 'Digit3': spawnEnemy('swarmer'); break;
          case 'Digit4': spawnEnemy('sniper'); break;
          case 'Digit5': spawnEnemy('tank'); break;
          case 'Digit6': spawnEnemy('swarmer'); spawnEnemy('swarmer'); spawnEnemy('sniper'); break; // Squad
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, hasStarted, isMenuOpen]);

  // --- MENU STATE ---
  if (!hasStarted) {
    return <MainMenu onStart={() => setHasStarted(true)} />;
  }

  // --- GAME STATE ---
  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans">
      {/* Game Layer */}
      {/* 
         We treat isMenuOpen as a pause state for the game canvas as well, 
         or just let it run in background. For now, passing isPaused || isMenuOpen 
         effectively pauses physics while menu is up.
      */}
      <GameCanvas 
        isPaused={isPaused || isMenuOpen} 
        zoomLevel={zoomLevel} 
        shakeIntensity={shakeIntensity} 
      />
      
      {/* Gameplay HUD (Hidden when paused/menu for cleaner look) */}
      <div className={`transition-opacity duration-200 ${(isPaused || isMenuOpen) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* UI Overlay */}
        <div className="absolute top-4 left-4 p-4 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 text-slate-200 pointer-events-none select-none">
          <h1 className="text-xl font-bold mb-2 text-emerald-400">Project Drifter</h1>
          <div className="text-sm space-y-1 opacity-90">
            <p><span className="font-bold text-white">WASD</span> to Move</p>
            <p><span className="font-bold text-white">SHIFT</span> to Sprint</p>
            <p><span className="font-bold text-white">E</span> to Interact</p>
            <p><span className="font-bold text-white">TAB</span> for Menu</p>
            <div className="h-px bg-slate-600 my-2"></div>
            <p id="debug-coords">Pos: 0, 0</p>
            <p id="debug-chunk">Chunk: 0, 0</p>
            <p id="debug-loaded">Loaded: 0</p>
            <p className="text-xs text-slate-400 mt-2">FLOOR: <span id="debug-floor">1</span></p>
          </div>
        </div>
        
        {/* Debug Spawn Menu (Top Right) */}
        <div className="absolute top-4 right-4 p-4 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 text-slate-200 select-none">
          <h2 className="text-sm font-bold mb-2 text-yellow-400 text-right">DEBUG SPAWN</h2>
          <div className="flex flex-col gap-2">
            <button onClick={() => spawnEnemy('basic')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded border border-slate-600 text-right">
              [1] Basic
            </button>
            <button onClick={() => spawnEnemy('shooter')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded border border-slate-600 text-right">
              [2] Shooter
            </button>
            <button onClick={() => spawnEnemy('swarmer')} className="px-3 py-1 bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-300 text-xs rounded border border-emerald-800 text-right">
              [3] Swarmer
            </button>
            <button onClick={() => spawnEnemy('sniper')} className="px-3 py-1 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 text-xs rounded border border-purple-800 text-right">
              [4] Sniper
            </button>
            <button onClick={() => spawnEnemy('tank')} className="px-3 py-1 bg-slate-900/80 hover:bg-slate-800/80 text-blue-300 text-xs rounded border border-slate-800 text-right">
              [5] Tank
            </button>
            <button onClick={() => { spawnEnemy('swarmer'); spawnEnemy('swarmer'); spawnEnemy('sniper'); }} className="px-3 py-1 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-xs rounded border border-red-800 text-right">
              [6] Squad
            </button>
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

      {/* NEW TAB MENU OVERLAY */}
      <TabMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* PAUSE MENU OVERLAY (Only if Tab Menu is closed) */}
      {isPaused && !isMenuOpen && (
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
                  max="5.0" 
                  step="0.1" 
                  value={zoomLevel} 
                  onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Wide (1x)</span>
                  <span>Close (5x)</span>
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
