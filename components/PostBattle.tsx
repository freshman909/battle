
import React from 'react';
import { BattleStats, UnitType } from '../types';
import { UNIT_COLORS } from '../constants';

interface PostBattleProps {
  score: number;
  level: number;
  diamonds: number;
  stats?: BattleStats;
  onContinue: () => void;
  onRetry: () => void;
  onUpgrade: () => void;
}

const PostBattle: React.FC<PostBattleProps> = ({ score, level, diamonds, stats, onContinue, onRetry, onUpgrade }) => {
  const isVictory = score > 0;

  const unitLabels: Record<UnitType, string> = {
    [UnitType.ARCHER]: '弓箭',
    [UnitType.SWORDSMAN]: '剑盾',
    [UnitType.SPEARMAN]: '矛兵',
    [UnitType.CAVALRY]: '骑兵',
    [UnitType.BLANK]: '',
  };

  const types = [UnitType.SWORDSMAN, UnitType.SPEARMAN, UnitType.CAVALRY, UnitType.ARCHER];

  return (
    <div className="flex flex-col items-center justify-center gap-6 z-20 p-8 bg-black/90 hand-drawn-border max-w-2xl w-full text-center">
      <h2 className={`text-4xl ${isVictory ? 'text-yellow-400' : 'text-red-500'} pixel-text-shadow font-bold italic`}>
        {isVictory ? '大获全胜!' : '全军覆没!'}
      </h2>
      
      {/* Damage Summary Table */}
      <div className="w-full bg-zinc-900/80 p-4 hand-drawn-border space-y-3">
        <div className="grid grid-cols-3 text-[10px] text-zinc-500 uppercase tracking-widest font-bold pb-2 border-b border-white/10">
          <span>造成伤害</span>
          <span>兵种</span>
          <span>承受伤害</span>
        </div>
        
        {types.map(type => {
          const dealt = Math.floor(stats?.dealt[type] || 0);
          const taken = Math.floor(stats?.taken[type] || 0);
          
          return (
            <div key={type} className="grid grid-cols-3 items-center py-2">
              <div className="text-green-400 font-bold text-lg">{dealt}</div>
              <div className="flex flex-col items-center gap-1">
                <div 
                  className="w-8 h-8 hand-drawn-border border-white/20 flex items-center justify-center text-[10px] text-white font-bold"
                  style={{ backgroundColor: UNIT_COLORS[type] }}
                >
                  {unitLabels[type][0]}
                </div>
                <span className="text-[10px] text-zinc-400">{unitLabels[type]}</span>
              </div>
              <div className="text-red-400 font-bold text-lg">{taken}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4 text-sm w-full py-2">
        <div className="flex justify-between items-center bg-zinc-800/50 px-4 py-2 rounded">
            <span className="text-zinc-400">当前关卡:</span>
            <span className="text-blue-400 font-bold">LV.{level}</span>
        </div>
        <div className="flex justify-between items-center bg-zinc-800/50 px-4 py-2 rounded">
            <span className="text-zinc-400">拥有钻石:</span>
            <span className="text-cyan-300 font-bold">💎 {diamonds}</span>
        </div>
      </div>

      <div className="flex gap-6 justify-center w-full mt-2">
        {isVictory ? (
          <button 
            onClick={onContinue}
            className="w-16 h-16 bg-green-600 hover:bg-green-700 pixel-border pixel-shadow square-btn text-[10px] font-bold"
          >
            下一关
          </button>
        ) : (
          <button 
            onClick={onRetry}
            className="w-16 h-16 bg-red-600 hover:bg-red-700 pixel-border pixel-shadow square-btn text-[10px] font-bold"
          >
            重试
          </button>
        )}
        <button 
          onClick={onUpgrade}
          className="w-16 h-16 bg-blue-600 hover:bg-blue-700 pixel-border pixel-shadow square-btn text-[10px] font-bold"
        >
          兵工厂
        </button>
      </div>
    </div>
  );
};

export default PostBattle;
