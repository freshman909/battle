
import React from 'react';
import { UPGRADE_COSTS } from '../constants';

interface UpgradeMenuProps {
  diamonds: number;
  upgrades: {
    attackBonus: number;
    hpBonus: number;
    initialMoves: number;
  };
  onApplyUpgrade: (type: 'attack' | 'hp' | 'moves', cost: number) => void;
  onBack: () => void;
}

const UpgradeMenu: React.FC<UpgradeMenuProps> = ({ diamonds, upgrades, onApplyUpgrade, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-12 z-20 p-12 bg-zinc-800/90 hand-drawn-border max-w-2xl w-full h-auto">
      <div className="flex justify-between w-full items-center mb-4">
          <h2 className="text-3xl text-cyan-400 pixel-text-shadow">军械库</h2>
          <div className="text-lg bg-black/60 px-6 py-2 hand-drawn-border">
            💎 {diamonds}
          </div>
      </div>

      <div className="grid grid-cols-1 gap-8 w-full">
        {/* Attack Upgrade */}
        <div className="bg-black/30 p-6 hand-drawn-border flex items-center justify-between">
            <div className="flex flex-col gap-1">
                <span className="text-sm text-zinc-400">攻击强度</span>
                <span className="text-xl text-yellow-400">当前奖励: +{upgrades.attackBonus}</span>
            </div>
            <button 
              disabled={diamonds < UPGRADE_COSTS.attack}
              onClick={() => onApplyUpgrade('attack', UPGRADE_COSTS.attack)}
              className={`w-16 h-16 text-xs pixel-border pixel-shadow square-btn ${diamonds >= UPGRADE_COSTS.attack ? 'bg-orange-600 hover:bg-orange-700' : 'bg-zinc-600 opacity-50'}`}
            >
              💎{UPGRADE_COSTS.attack}
            </button>
        </div>

        {/* HP Upgrade */}
        <div className="bg-black/30 p-6 hand-drawn-border flex items-center justify-between">
            <div className="flex flex-col gap-1">
                <span className="text-sm text-zinc-400">生命上限</span>
                <span className="text-xl text-green-400">当前奖励: +{upgrades.hpBonus}</span>
            </div>
            <button 
              disabled={diamonds < UPGRADE_COSTS.hp}
              onClick={() => onApplyUpgrade('hp', UPGRADE_COSTS.hp)}
              className={`w-16 h-16 text-xs pixel-border pixel-shadow square-btn ${diamonds >= UPGRADE_COSTS.hp ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-zinc-600 opacity-50'}`}
            >
              💎{UPGRADE_COSTS.hp}
            </button>
        </div>

        {/* Moves Upgrade */}
        <div className="bg-black/30 p-6 hand-drawn-border flex items-center justify-between">
            <div className="flex flex-col gap-1">
                <span className="text-sm text-zinc-400">策略深度(步数)</span>
                <span className="text-xl text-blue-400">当前奖励: +{upgrades.initialMoves}</span>
            </div>
            <button 
              disabled={diamonds < UPGRADE_COSTS.moves}
              onClick={() => onApplyUpgrade('moves', UPGRADE_COSTS.moves)}
              className={`w-16 h-16 text-xs pixel-border pixel-shadow square-btn ${diamonds >= UPGRADE_COSTS.moves ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-zinc-600 opacity-50'}`}
            >
              💎{UPGRADE_COSTS.moves}
            </button>
        </div>
      </div>

      <button 
        onClick={onBack}
        className="w-16 h-16 bg-zinc-600 hover:bg-zinc-500 pixel-border pixel-shadow square-btn text-xs"
      >
        返回
      </button>
    </div>
  );
};

export default UpgradeMenu;
