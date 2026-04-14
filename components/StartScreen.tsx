
import React from 'react';
import { audio } from '../utils/audio';

interface StartScreenProps {
  onStart: () => void;
  onShowcase: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onShowcase }) => {
  return (
    <div className="flex flex-col items-center justify-around h-full py-20 z-10 text-center w-full max-w-4xl">
      <div className="space-y-6">
        <h1 className="text-6xl sm:text-8xl text-white pixel-text-shadow font-bold italic tracking-widest leading-tight">
          像素<br/><span className="text-red-500">军团</span>
        </h1>
        <p className="text-sm sm:text-lg text-zinc-400 animate-pulse tracking-[0.5em]">
          三消召唤 · 实时征战
        </p>
      </div>

      <div className="flex flex-col items-center gap-10 w-full">
        <div className="flex gap-8">
            <button 
              onClick={onStart}
              className="w-24 h-24 bg-red-600 hover:bg-red-700 text-2xl pixel-border pixel-shadow square-btn font-bold"
            >
              出征
            </button>
            <button 
              onClick={() => { audio.playClick(); onShowcase(); }}
              className="w-24 h-24 bg-zinc-700 hover:bg-zinc-600 text-[10px] leading-tight pixel-border pixel-shadow square-btn font-bold p-2"
            >
              士兵<br/>展示
            </button>
        </div>
        
        <div className="grid grid-cols-3 gap-12 opacity-80">
           <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-blue-400 hand-drawn-border flex items-center justify-center text-xs font-bold">弓</div>
              <span className="text-xs text-zinc-300">弓箭手</span>
           </div>
           <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-green-400 hand-drawn-border flex items-center justify-center text-xs font-bold">盾</div>
              <span className="text-xs text-zinc-300">剑盾兵</span>
           </div>
           <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-red-400 hand-drawn-border flex items-center justify-center text-xs font-bold">矛</div>
              <span className="text-xs text-zinc-300">矛兵</span>
           </div>
        </div>
      </div>
      
      <div className="text-xs text-zinc-500 leading-loose max-w-md">
        提示：斜向消除同样有效！ <br/>
        消除数量越多，召唤的士兵越精锐。 <br/>
        在战场上生存并赢取钻石。
      </div>
    </div>
  );
};

export default StartScreen;
