
import React, { useState, useEffect, useRef } from 'react';
import { UnitType } from '../types';
import { UNIT_CONFIGS, UNIT_COLORS } from '../constants';
import { audio } from '../utils/audio';
import { drawUnitShowcase } from '../utils/unitDrawer';

const unitDetails = {
  [UnitType.ARCHER]: {
    name: '弓箭手',
    features: '远程狙击：优先攻击血量最低的敌人。警惕性强：当战场上存在剑盾兵时，会躲在剑盾兵后方进行安全输出。战术规避：当不存在剑盾兵保护时，会远离敌人（距离≥100）后再进行攻击。',
    freq: '1.2s'
  },
  [UnitType.SWORDSMAN]: {
    name: '剑盾兵',
    features: '钢铁防线：极高的生命值和防御力。稳扎稳打：移速较慢但能为后排提供绝对安全的输出环境。',
    freq: '1.2s'
  },
  [UnitType.SPEARMAN]: {
    name: '矛兵',
    features: '毁灭冲锋：战斗开始时以极快速度冲向敌方后排，撞飞途中敌人。无畏打击：冲锋时对非矛兵单位造成高额伤害并击退。',
    freq: '0.5s'
  },
  [UnitType.CAVALRY]: {
    name: '骑兵',
    features: '奔跑值系统：开局奔跑值100，自动冲锋。击退冲锋：冲锋时击退路径上的敌人，造成高额伤害。战术撤退：奔跑值≤50时远离敌人积累奔跑值，>50时优先攻击血量最低敌人。',
    freq: '-'
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

    // 清空画布 - 深色背景
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制背景光晕
    const glowGradient = ctx.createRadialGradient(100, 100, 0, 100, 100, 120);
    glowGradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
    glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制装饰性网格线
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

    // 绘制deepseek风格士兵
    drawUnitShowcase(ctx, current, 100, 110, 3);

    // 绘制装饰边框 - 科技感
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, 170, 190);

    // 绘制角落装饰 - 科技感角标
    const cornerSize = 15;
    ctx.fillStyle = '#3b82f6';
    // 左上
    ctx.fillRect(15, 15, cornerSize, 3);
    ctx.fillRect(15, 15, 3, cornerSize);
    // 右上
    ctx.fillRect(170, 15, cornerSize, 3);
    ctx.fillRect(182, 15, 3, cornerSize);
    // 左下
    ctx.fillRect(15, 202, cornerSize, 3);
    ctx.fillRect(15, 190, 3, cornerSize);
    // 右下
    ctx.fillRect(170, 202, cornerSize, 3);
    ctx.fillRect(182, 190, 3, cornerSize);

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
    <div className="flex flex-col items-center justify-center gap-5 z-20 w-full max-w-md p-6 bg-gradient-to-b from-slate-900 to-slate-800 border border-slate-600 rounded-2xl shadow-2xl">
      {/* 标题栏 */}
      <div className="flex justify-between w-full items-center pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-yellow-400 rounded-full"></div>
          <h2 className="text-2xl text-yellow-400 font-black tracking-wider">士兵志</h2>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full">
          <span className="text-slate-400 text-sm font-bold">{index + 1}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-500 text-sm">4</span>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="relative w-full flex items-center justify-center">
        {/* 左箭头 */}
        <button 
          onClick={handlePrev} 
          className="absolute -left-3 w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-blue-600 border border-slate-500 hover:border-blue-400 rounded-full text-white transition-all duration-200 shadow-lg z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        {/* 卡片内容 */}
        <div className="w-full bg-slate-800/40 border border-slate-700 rounded-xl flex flex-col gap-4 items-center p-5">
          {/* Canvas 士兵展示 */}
          <div className="relative">
            <canvas 
              ref={canvasRef} 
              width={200} 
              height={220}
              className="rounded-lg"
              style={{ imageRendering: 'pixelated' }}
            />
            {/* 类型标签 */}
            <div 
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg border-2"
              style={{ 
                backgroundColor: UNIT_COLORS[current], 
                color: '#000',
                borderColor: 'rgba(255,255,255,0.3)'
              }}
            >
              {detail.name}
            </div>
          </div>

          {/* 属性网格 */}
          <div className="grid grid-cols-2 gap-2.5 w-full mt-2">
            <div className="flex flex-col bg-slate-900/70 p-3 rounded-lg border border-slate-700/50 hover:border-orange-500/50 transition-colors">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">攻击力</span>
              <span className="text-xl text-orange-400 font-black">{config.attack}</span>
            </div>
            <div className="flex flex-col bg-slate-900/70 p-3 rounded-lg border border-slate-700/50 hover:border-blue-500/50 transition-colors">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">防御力</span>
              <span className="text-xl text-blue-400 font-black">{(config.defense * 100).toFixed(0)}%</span>
            </div>
            <div className="flex flex-col bg-slate-900/70 p-3 rounded-lg border border-slate-700/50 hover:border-green-500/50 transition-colors">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">最大生命</span>
              <span className="text-xl text-green-400 font-black">{config.hp}</span>
            </div>
            <div className="flex flex-col bg-slate-900/70 p-3 rounded-lg border border-slate-700/50 hover:border-purple-500/50 transition-colors">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">攻击频率</span>
              <span className="text-xl text-purple-300 font-black">{detail.freq}</span>
            </div>
          </div>

          {/* 战斗特点 */}
          <div className="w-full bg-gradient-to-r from-slate-900/80 to-slate-800/80 p-4 rounded-lg border-l-4 border-yellow-400">
            <span className="text-[10px] text-yellow-500/80 block mb-2 uppercase font-bold tracking-widest">战斗特点</span>
            <p className="text-sm leading-relaxed text-slate-300">{detail.features}</p>
          </div>
        </div>

        {/* 右箭头 */}
        <button 
          onClick={handleNext} 
          className="absolute -right-3 w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-blue-600 border border-slate-500 hover:border-blue-400 rounded-full text-white transition-all duration-200 shadow-lg z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* 底部指示器 */}
      <div className="flex gap-2">
        {types.map((_, i) => (
          <div 
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === index ? 'bg-yellow-400 w-6' : 'bg-slate-600'
            }`}
          />
        ))}
      </div>

      {/* 返回按钮 */}
      <button 
        onClick={() => { audio.playClick(); onBack(); }}
        className="mt-1 px-8 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-500 hover:border-slate-400 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg flex items-center gap-2"
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
