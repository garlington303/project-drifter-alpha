
import React from 'react';

interface MainMenuProps {
  onStart: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart }) => {
  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden select-none font-serif">
      {/* Subtle Atmospheric Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-950 via-slate-950 to-black opacity-60"></div>

      <div className="relative z-10 flex flex-col items-center gap-16">
        {/* Title */}
        <div className="text-center group cursor-default">
          <h1 className="text-5xl md:text-7xl font-medium tracking-[0.25em] text-stone-200 mb-6 opacity-80 group-hover:opacity-100 transition-opacity duration-700">
            DRIFTER
          </h1>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-emerald-800/60 to-transparent mx-auto transition-all duration-700 group-hover:w-48 group-hover:via-emerald-500/50"></div>
        </div>

        {/* Start Button */}
        <button 
          onClick={onStart}
          className="group relative px-12 py-4 transition-all duration-500 focus:outline-none"
        >
          {/* Borders that align on hover */}
          <div className="absolute inset-0 border border-stone-800 transform rotate-1 scale-95 group-hover:rotate-0 group-hover:scale-100 group-hover:border-emerald-900/60 transition-all duration-500 ease-out"></div>
          <div className="absolute inset-0 border border-stone-800 transform -rotate-1 scale-95 group-hover:rotate-0 group-hover:scale-100 group-hover:border-emerald-900/60 transition-all duration-500 ease-out"></div>
          
          <span className="relative z-10 text-stone-500 text-xs tracking-[0.4em] uppercase group-hover:text-emerald-100 transition-colors duration-500">
            Enter World
          </span>
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
