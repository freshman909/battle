import React, { useState, useEffect, useRef } from 'react';
import { UnitType } from '../types';
import { UNIT_CONFIGS, UNIT_COLORS } from '../constants';
import { audio } from '../utils/audio';
import { drawUnitShowcase } from '../utils/unitDrawer';

const unitDetails = {
  [UnitType.ARCHER]: {
    name: '弓箭手',
    features: '远程狙击：优先攻击血量最低的敌人。警惕性强：当战场上存在剑盾兵时，会躲在剑盾兵后方进行安全输出。战术规避：当不存在剑盾兵保护时，与敌人保持75-250像素距离，≤75像素时会向四周远离敌人（优先远离墙壁方向）。',
    freq: '0.5s'
  },
  [UnitType.SWORDSMAN]: {
    name: '剑盾兵',
    features: '钢铁防线：极高的生命值和防御力。协同防御：周围每有1个己方单位（100px内），防御力和攻击力+3%。保护弓箭手：100px范围内有弓箭手时，为该范围内所有弓箭手抵挡1%伤害。优先攻击距离自己最近的敌人。',
    freq: '1.0s'
  },
  [UnitType.SPEARMAN]: {
    name: '矛兵',
    features: '毁灭冲锋：战斗开始时以极快速度冲向敌方后排，撞飞途中敌人。无畏打击：冲锋时对非矛兵单位造成高额伤害并击退。',
    freq: '0.5s'
  },
  [UnitType.CAVALRY]: {
    name: '骑兵',
    features: '奔跑值系统：开局奔跑值100，每10点增加0.1像素/秒移动速度。开局冲锋：游戏开始3秒内必定冲锋。击退冲锋：冲锋时击退路径上的敌人，造成高额伤害。战术撤退：奔跑值≤50时远离敌人积累奔跑值，>50时优先攻击血量最低敌人。',
    freq: '0.7s'
  },
  [UnitType.BLANK]: { name: '', features: '', freq: '' }
};

const UnitShowcase: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [index, setIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const types = [UnitType.SWORDSMAN, UnitType.SPEARMAN, UnitType.ARCHER, UnitType.CAVALRY];
  const current = types[index];
  const config = UNIT_CONFIGS[current];
  const detail = unitDetails[current];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glowGradient = ctx.createRadialGradient(100, 80, 0, 100, 80, 100);
    glowGradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
    glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    drawUnitShowcase(ctx, current, 100, 90, 2.5);

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, 170, 150);

    const cornerSize = 12;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(15, 15, cornerSize, 3);
    ctx.fillRect(15, 15, 3, cornerSize);
    ctx.fillRect(170, 15, cornerSize, 3);
    ctx.fillRect(182, 15, 3, cornerSize);
    ctx.fillRect(15, 162, cornerSize, 3);
    ctx.fillRect(15, 150, 3, cornerSize);
    ctx.fillRect(170, 162, cornerSize, 3);
    ctx.fillRect(182, 150, 3, cornerSize);

  }, [current]);

  const handleNext = () => {
    audio.playClick();
    setIndex((index + 1) % types.length);
  };

  const handlePrev = () => {
    audio.playClick();
    setIndex((index - 1 + types.length) % types.length);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 z-20 w-full max-w-md p-4 bg-gradient-to-b from-slate-900 to-slate-800 border border-slate-600 rounded-2xl shadow-2xl" style={{ height: '700px' }}>
      <div className="flex justify-between w-full items-center pb-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-yellow-400 rounded-full"></div>
          <h2 className="text-xl text-yellow-400 font-black tracking-wider">士兵志</h2>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full">
          <span className="text-slate-400 text-sm font-bold">{index + 1}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-500 text-sm">4</span>
        </div>
      </div>

      <div className="relative w-full flex items-center justify-center flex-1">
        <button 
          onClick={handlePrev} 
          className="absolute -left-2 w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-blue-600 border border-slate-500 hover:border-blue-400 rounded-full text-white transition-all duration-200 shadow-lg z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="w-full bg-slate-800/40 border border-slate-700 rounded-xl flex flex-col gap-3 items-center p-4" style={{ height: '520px' }}>
          <div className="relative">
            <canvas 
              ref={canvasRef} 
              width={200} 
              height={180}
              className="rounded-lg"
              style={{ imageRendering: 'pixelated' }}
            />
            <div 
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold shadow-lg border-2"
              style={{ 
                backgroundColor: UNIT_COLORS[current], 
                color: '#000',
                borderColor: 'rgba(255,255,255,0.3)'
              }}
            >
              {detail.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full mt-1">
            <div className="flex flex-col bg-slate-900/70 p-2 rounded-lg border border-slate-700/50">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">攻击力</span>
              <span className="text-lg text-orange-400 font-black">{config.attack}</span>
            </div>
            <div className="flex flex-col bg-slate-900/70 p-2 rounded-lg border border-slate-700/50">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">防御力</span>
              <span className="text-lg text-blue-400 font-black">{(config.defense * 100).toFixed(0)}%</span>
            </div>
            <div className="flex flex-col bg-slate-900/70 p-2 rounded-lg border border-slate-700/50">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">最大生命</span>
              <span className="text-lg text-green-400 font-black">{config.hp}</span>
            </div>
            <div className="flex flex-col bg-slate-900/70 p-2 rounded-lg border border-slate-700/50">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">攻击频率</span>
              <span className="text-lg text-purple-300 font-black">{detail.freq}</span>
            </div>
          </div>

          <div className="w-full bg-gradient-to-r from-slate-900/80 to-slate-800/80 p-3 rounded-lg border-l-4 border-yellow-400 flex-1">
            <span className="text-[10px] text-yellow-500/80 block mb-1 uppercase font-bold tracking-widest">战斗特点</span>
            <p className="text-xs leading-relaxed text-slate-300 overflow-y-auto" style={{ maxHeight: '80px' }}>{detail.features}</p>
          </div>
        </div>

        <button 
          onClick={handleNext} 
          className="absolute -right-2 w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-blue-600 border border-slate-500 hover:border-blue-400 rounded-full text-white transition-all duration-200 shadow-lg z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex gap-2">
        {types.map((_, i) => (
          <div 
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === index ? 'bg-yellow-400 w-6' : 'bg-slate-600 w-2'
            }`}
          />
        ))}
      </div>

      <button 
        onClick={() => { audio.playClick(); onBack(); }}
        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-500 hover:border-slate-400 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        返回主页
      </button>
    </div>
  );
};

export default UnitShowcase;