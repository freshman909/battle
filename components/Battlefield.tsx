
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { UnitType, Unit, UnitStats, BattleStats } from '../types';
import { UNIT_CONFIGS, UNIT_COLORS } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { audio } from '../utils/audio';

interface VisualEffect {
  id: string;
  x: number;
  y: number;
  type: 'damage' | 'slash' | 'arrow';
  life: number;
  value?: number;
  angle?: number;
  isCrit?: boolean;
}

interface GhostFrame {
  x: number;
  y: number;
  alpha: number;
}

interface BattlefieldProps {
  playerUnits: UnitType[];
  level: number;
  upgrades: {
    attackBonus: number;
    hpBonus: number;
  };
  onBattleEnd: (victory: boolean, score: number, stats: BattleStats) => void;
}

const ATTACK_COOLDOWN = 1.2; 
const VISUAL_COOLDOWN = 0.25;

const Battlefield: React.FC<BattlefieldProps> = ({ playerUnits, level, upgrades, onBattleEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const effectsRef = useRef<VisualEffect[]>([]);
  const ghostTrailsRef = useRef<Record<string, GhostFrame[]>>({});
  
  const statsRef = useRef<BattleStats>({
    dealt: { [UnitType.ARCHER]: 0, [UnitType.SWORDSMAN]: 0, [UnitType.SPEARMAN]: 0, [UnitType.BLANK]: 0 },
    taken: { [UnitType.ARCHER]: 0, [UnitType.SWORDSMAN]: 0, [UnitType.SPEARMAN]: 0, [UnitType.BLANK]: 0 },
  });
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const initBattle = useCallback(() => {
    const spawnedUnits: Unit[] = [];
    const width = 800;
    const height = 400;

    const sortedPlayerTypes = [...playerUnits].sort((a, b) => {
        const order = { [UnitType.SWORDSMAN]: 0, [UnitType.SPEARMAN]: 1, [UnitType.ARCHER]: 2 };
        return order[a] - (order[b] ?? 0);
    });

    sortedPlayerTypes.forEach((type) => {
      const config = { ...UNIT_CONFIGS[type] };
      config.hp += upgrades.hpBonus;
      config.maxHp += upgrades.hpBonus;
      config.attack += upgrades.attackBonus;

      let startX = 50;
      if (type === UnitType.SWORDSMAN) startX = 180;
      else if (type === UnitType.SPEARMAN) startX = 120;
      else startX = 40;

      spawnedUnits.push({
        id: uuidv4(),
        type,
        side: 'player',
        x: startX + Math.random() * 40,
        y: 60 + Math.random() * (height - 120),
        stats: config,
        isAttacking: false,
        isCharging: type === UnitType.SPEARMAN,
        isInvulnerable: false,
        attackTimer: Math.random() * 0.5,
        facing: 'right',
      });
    });

    const enemyCount = Math.floor((20 + level * 5) * (2/3));
    const enemyTypes = [UnitType.SWORDSMAN, UnitType.ARCHER, UnitType.SPEARMAN];

    for(let i=0; i<enemyCount; i++) {
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      const config = { ...UNIT_CONFIGS[type] };
      config.hp *= (1 + level * 0.12);
      config.maxHp *= (1 + level * 0.12);
      config.attack *= (1 + level * 0.08);

      spawnedUnits.push({
        id: uuidv4(),
        type,
        side: 'enemy',
        x: width - 50 - Math.random() * 200,
        y: 60 + Math.random() * (height - 120),
        stats: config,
        isAttacking: false,
        isCharging: type === UnitType.SPEARMAN,
        isInvulnerable: false,
        attackTimer: Math.random() * 0.5,
        facing: 'left',
      });
    }

    setUnits(spawnedUnits);
    effectsRef.current = [];
    ghostTrailsRef.current = {};
    
    const timer = setInterval(() => {
        setCountdown(prev => {
            if (prev <= 1) {
                clearInterval(timer);
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
  }, [playerUnits, level, upgrades]);

  useEffect(() => { initBattle(); }, [initBattle]);

  const update = useCallback((time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      effectsRef.current = effectsRef.current.map(e => ({ ...e, life: e.life - deltaTime * 2 })).filter(e => e.life > 0);

      setUnits(prevUnits => {
        if (isGameOver || countdown > 0) return prevUnits;

        const newUnits = prevUnits.map(u => ({ ...u, stats: { ...u.stats } }));
        const playerAlive = newUnits.some(u => u.side === 'player' && u.stats.hp > 0);
        const enemyAlive = newUnits.some(u => u.side === 'enemy' && u.stats.hp > 0);

        if (!playerAlive || !enemyAlive) {
          if (!isGameOver) {
            setIsGameOver(true);
            setTimeout(() => onBattleEnd(playerAlive, playerAlive ? Math.floor(1000 + level * 100) : 0, statsRef.current), 2000);
          }
          return prevUnits;
        }

        newUnits.forEach(unit => {
          if (unit.stats.hp <= 0) return;

          const enemies = newUnits.filter(e => e.side !== unit.side && e.stats.hp > 0);
          if (enemies.length === 0) return;

          if (unit.type === UnitType.SPEARMAN && unit.isCharging) {
            const targetX = unit.side === 'player' ? 750 : 50;
            unit.isInvulnerable = true;
            const dx = targetX - unit.x;
            if (Math.abs(dx) < 20) {
              unit.isCharging = false;
              unit.isInvulnerable = false;
            } else {
              unit.x += (dx > 0 ? 1 : -1) * 350 * deltaTime;
              if (!ghostTrailsRef.current[unit.id]) ghostTrailsRef.current[unit.id] = [];
              ghostTrailsRef.current[unit.id].unshift({ x: unit.x, y: unit.y, alpha: 0.6 });
              if (ghostTrailsRef.current[unit.id].length > 8) ghostTrailsRef.current[unit.id].pop();
              return;
            }
          }

          let nearestEnemy: Unit = enemies[0];
          let minDist = Infinity;
          enemies.forEach(e => {
            const d = Math.sqrt(Math.pow(e.x - unit.x, 2) + Math.pow(e.y - unit.y, 2));
            if (d < minDist) { minDist = d; nearestEnemy = e; }
          });

          let target: Unit | null = nearestEnemy;

          if (unit.type === UnitType.ARCHER) {
            // 弓箭手：找到血量最低的敌人作为目标
            target = enemies.reduce((prev, curr) => (curr.stats.hp / curr.stats.maxHp < prev.stats.hp / prev.stats.maxHp) ? curr : prev);
            
            // 弓箭手始终面向目标（弓朝向敌人）
            unit.facing = (target.x > unit.x) ? 'right' : 'left';
            
            const shields = newUnits.filter(u => u.side === unit.side && u.type === UnitType.SWORDSMAN && u.stats.hp > 0);
            if (shields.length > 0) {
              let nearestShield = shields[0];
              let minSDist = Infinity;
              shields.forEach(s => {
                const d = Math.sqrt(Math.pow(s.x - unit.x, 2) + Math.pow(s.y - unit.y, 2));
                if (d < minSDist) { minSDist = d; nearestShield = s; }
              });

              const vx = nearestShield.x - target.x;
              const vy = nearestShield.y - target.y;
              const vMag = Math.sqrt(vx*vx + vy*vy);
              
              const safeX = nearestShield.x + (vx / vMag) * 50;
              const safeY = nearestShield.y + (vy / vMag) * 50;

              const distToSafe = Math.sqrt(Math.pow(unit.x - safeX, 2) + Math.pow(unit.y - safeY, 2));
              if (distToSafe > 10) {
                const angle = Math.atan2(safeY - unit.y, safeX - unit.x);
                unit.x += Math.cos(angle) * unit.stats.speed * 50 * deltaTime;
                unit.y += Math.sin(angle) * unit.stats.speed * 50 * deltaTime;
              }
            } else {
              const angle = Math.atan2(unit.y - target.y, unit.x - target.x);
              unit.x += Math.cos(angle) * unit.stats.speed * 30 * deltaTime;
              unit.y += Math.sin(angle) * unit.stats.speed * 30 * deltaTime;
            }
            unit.x = Math.max(20, Math.min(780, unit.x));
            unit.y = Math.max(40, Math.min(360, unit.y));
          } else {
            const dist = Math.sqrt(Math.pow(target.x - unit.x, 2) + Math.pow(target.y - unit.y, 2));
            if (dist > unit.stats.range) {
              const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
              unit.x += Math.cos(angle) * unit.stats.speed * 60 * deltaTime;
              unit.y += Math.sin(angle) * unit.stats.speed * 60 * deltaTime;
              unit.isAttacking = false;
            } else {
              unit.isAttacking = true;
            }
          }

          const finalDist = Math.sqrt(Math.pow(target.x - unit.x, 2) + Math.pow(target.y - unit.y, 2));
          if (finalDist <= unit.stats.range) {
            unit.isAttacking = true;
            unit.attackTimer -= deltaTime;
            if (unit.attackTimer <= 0) {
              unit.attackTimer = ATTACK_COOLDOWN;
              if (!target.isInvulnerable) {
                audio.playAttack(unit.type === UnitType.ARCHER);
                const dmg = unit.stats.attack * (1 - target.stats.defense);
                const dmgValue = Math.floor(dmg);
                target.stats.hp -= dmg;
                if (unit.side === 'player') statsRef.current.dealt[unit.type] += dmg;
                else statsRef.current.taken[target.type] += dmg;
                audio.playHit();
                
                const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
                if (unit.type === UnitType.ARCHER) {
                  effectsRef.current.push({ 
                    id: uuidv4(), x: unit.x, y: unit.y, 
                    type: 'arrow', life: 0.3, angle 
                  });
                } else {
                  effectsRef.current.push({ 
                    id: uuidv4(), x: target.x, y: target.y, 
                    type: 'slash', life: 0.3, angle 
                  });
                }
                // 伤害数值显示
                effectsRef.current.push({ 
                  id: uuidv4(), x: target.x, y: target.y - 20, 
                  type: 'damage', life: 1, value: dmgValue,
                  isCrit: dmgValue > unit.stats.attack * 0.9
                });
              }
            }
          } else if (unit.type === UnitType.ARCHER) {
            unit.isAttacking = false;
            // 非攻击状态下弓箭手也保持面向最近的敌人
            const nearestThreat = enemies.reduce((prev, curr) => {
              const d1 = Math.sqrt(Math.pow(prev.x - unit.x, 2) + Math.pow(prev.y - unit.y, 2));
              const d2 = Math.sqrt(Math.pow(curr.x - unit.x, 2) + Math.pow(curr.y - unit.y, 2));
              return d2 < d1 ? curr : prev;
            });
            unit.facing = (nearestThreat.x > unit.x) ? 'right' : 'left';
          }

          // 其他兵种面向目标
          if (unit.type !== UnitType.ARCHER) {
            unit.facing = (target.x > unit.x) ? 'right' : 'left';
          }
        });

        Object.keys(ghostTrailsRef.current).forEach(id => {
          ghostTrailsRef.current[id] = ghostTrailsRef.current[id].map(f => ({ ...f, alpha: f.alpha - deltaTime * 4 })).filter(f => f.alpha > 0);
        });

        return newUnits.filter(u => u.stats.hp > 0 || u.isInvulnerable);
      });
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(update);
  }, [isGameOver, countdown, level, onBattleEnd]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [update]);

  // 绘制小巧美观的像素士兵
  const drawUnit = (ctx: CanvasRenderingContext2D, unit: Unit) => {
    const isAttackingVisual = unit.isAttacking && unit.attackTimer > (ATTACK_COOLDOWN - VISUAL_COOLDOWN);
    const flip = unit.facing === 'left' ? -1 : 1;
    
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.scale(flip, 1);

    const colors = {
      player: { main: '#3b82f6', dark: '#1e40af' },
      enemy: { main: '#ef4444', dark: '#b91c1c' }
    };
    const team = unit.side === 'player' ? colors.player : colors.enemy;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (unit.type === UnitType.SWORDSMAN) {
      drawMiniSwordsman(ctx, team, isAttackingVisual);
    } else if (unit.type === UnitType.SPEARMAN) {
      drawMiniSpearman(ctx, team, isAttackingVisual);
    } else if (unit.type === UnitType.ARCHER) {
      drawMiniArcher(ctx, team, isAttackingVisual);
    }

    ctx.restore();

    if (!unit.isInvulnerable) {
      drawHealthBar(ctx, unit);
    }
  };

  // 剑盾兵 - 小巧版
  const drawMiniSwordsman = (ctx: CanvasRenderingContext2D, team: any, isAttacking: boolean) => {
    // 身体
    ctx.fillStyle = team.main;
    ctx.fillRect(-5, -8, 10, 10);
    // 盔甲条纹
    ctx.fillStyle = team.dark;
    ctx.fillRect(-3, -6, 6, 2);
    
    // 头盔
    ctx.fillStyle = team.dark;
    ctx.fillRect(-4, -13, 8, 5);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-1, -14, 2, 2);
    
    // 小盾牌
    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.arc(-6, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = team.main;
    ctx.fillRect(-7, -3, 2, 2);
    
    // 剑
    const swordAngle = isAttacking ? Math.PI / 3 : -Math.PI / 6;
    ctx.save();
    ctx.translate(6, -5);
    ctx.rotate(swordAngle);
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(-1, -10, 2, 12);
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(-2, 2, 4, 2);
    ctx.restore();
  };

  // 矛兵 - 小巧版
  const drawMiniSpearman = (ctx: CanvasRenderingContext2D, team: any, isAttacking: boolean) => {
    // 瘦长身体
    ctx.fillStyle = team.main;
    ctx.fillRect(-4, -10, 8, 12);
    ctx.fillStyle = team.dark;
    ctx.fillRect(-2, -8, 4, 8);
    
    // 角盔
    ctx.fillStyle = team.dark;
    ctx.fillRect(-3, -14, 6, 4);
    ctx.fillStyle = team.main;
    ctx.fillRect(-4, -12, 1, 3);
    ctx.fillRect(3, -12, 1, 3);
    
    // 长矛
    const spearAngle = isAttacking ? -Math.PI / 4 : -Math.PI / 8;
    ctx.save();
    ctx.translate(5, -4);
    ctx.rotate(spearAngle);
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(-1, -25, 2, 32);
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(-2, -25);
    ctx.lineTo(2, -25);
    ctx.fill();
    ctx.restore();
  };

  // 弓箭手 - 小巧版（修正：弓在前，箭筒在后）
  const drawMiniArcher = (ctx: CanvasRenderingContext2D, team: any, isAttacking: boolean) => {
    // 身体
    ctx.fillStyle = team.main;
    ctx.fillRect(-4, -8, 8, 9);
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(-3, -6, 6, 5);
    
    // 兜帽
    ctx.fillStyle = team.dark;
    ctx.beginPath();
    ctx.arc(0, -11, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(-2, -12, 4, 3);
    
    // 箭袋（在背后）
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(-5, -10, 3, 9);
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(-4, -13, 1, 4);
    ctx.fillRect(-4, -11, 1, 3);
    
    // 弓（在前面 - 棕色弯曲弓身）
    ctx.save();
    ctx.translate(5, -4);
    // 弓身（棕色，弯曲向前）
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();
    // 弓弦（白色/银色）
    ctx.strokeStyle = isAttacking ? '#fbbf24' : '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(isAttacking ? 5 : 0, 0);
    ctx.lineTo(0, 8);
    ctx.stroke();
    ctx.restore();
  };

  // 血条
  const drawHealthBar = (ctx: CanvasRenderingContext2D, unit: Unit) => {
    const hpPercent = Math.max(0, unit.stats.hp / unit.stats.maxHp);
    const barWidth = 18;
    const barHeight = 3;
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(unit.x - barWidth/2, unit.y - 22, barWidth, barHeight);
    
    let hpColor = '#22c55e';
    if (hpPercent < 0.3) hpColor = '#ef4444';
    else if (hpPercent < 0.6) hpColor = '#eab308';
    
    ctx.fillStyle = hpColor;
    ctx.fillRect(unit.x - barWidth/2, unit.y - 22, barWidth * hpPercent, barHeight);
  };

  // 战场背景
  const drawBackground = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#0f172a');
    skyGradient.addColorStop(0.5, '#1e293b');
    skyGradient.addColorStop(1, '#334155');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const groundGradient = ctx.createLinearGradient(0, canvas.height - 60, 0, canvas.height);
    groundGradient.addColorStop(0, '#374151');
    groundGradient.addColorStop(1, '#1f2937');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
    
    ctx.fillStyle = '#065f46';
    for (let i = 0; i < canvas.width; i += 25) {
      ctx.fillRect(i, canvas.height - 60, 2, 4 + Math.random() * 4);
    }
    
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    drawBackground(ctx, canvas);

    const trails = Object.values(ghostTrailsRef.current) as GhostFrame[][];
    trails.forEach(trail => {
      trail.forEach(f => {
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = UNIT_COLORS[UnitType.SPEARMAN];
        ctx.fillRect(f.x - 4, f.y - 8, 8, 12);
      });
    });
    ctx.globalAlpha = 1.0;

    [...units].sort((a, b) => a.y - b.y).forEach(unit => {
      if (unit.isInvulnerable) {
        ctx.save();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      drawUnit(ctx, unit);
    });

    // 绘制特效和伤害数值
    effectsRef.current.forEach(e => {
      ctx.save();
      
      if (e.type === 'damage' && e.value !== undefined) {
        // 伤害数值
        const floatY = e.y - (1 - e.life) * 20;
        const alpha = Math.min(1, e.life * 2);
        
        ctx.globalAlpha = alpha;
        ctx.font = e.isCrit ? 'bold 14px Arial' : '12px Arial';
        ctx.fillStyle = e.isCrit ? '#fbbf24' : '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(`-${e.value}`, e.x, floatY);
        ctx.fillText(`-${e.value}`, e.x, floatY);
        
        // 暴击标记
        if (e.isCrit) {
          ctx.font = '10px Arial';
          ctx.fillStyle = '#ef4444';
          ctx.fillText('!', e.x + 20, floatY - 5);
        }
      } else if (e.type === 'slash') {
        ctx.globalAlpha = e.life;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const angle = e.angle || 0;
        ctx.moveTo(e.x - Math.cos(angle) * 15, e.y - Math.sin(angle) * 15);
        ctx.lineTo(e.x + Math.cos(angle) * 18, e.y + Math.sin(angle) * 18);
        ctx.stroke();
      } else if (e.type === 'arrow') {
        // 更明显的箭矢效果
        ctx.globalAlpha = Math.min(1, e.life * 1.5);
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle || 0);
        
        // 箭杆（更粗更明显）
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-2, -2, 28, 4);
        ctx.fillStyle = '#a0522d';
        ctx.fillRect(0, -1, 24, 2);
        
        // 箭羽（白色羽毛）
        ctx.fillStyle = '#f5f5f5';
        ctx.beginPath();
        ctx.moveTo(-2, -4);
        ctx.lineTo(-8, -6);
        ctx.lineTo(-6, -2);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-6, 2);
        ctx.lineTo(-8, 6);
        ctx.lineTo(-2, 4);
        ctx.fill();
        
        // 箭头（金属质感）
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.moveTo(26, -4);
        ctx.lineTo(34, 0);
        ctx.lineTo(26, 4);
        ctx.fill();
        ctx.fillStyle = '#e8e8e8';
        ctx.beginPath();
        ctx.moveTo(26, -2);
        ctx.lineTo(30, 0);
        ctx.lineTo(26, 2);
        ctx.fill();
        
        // 箭矢拖尾效果
        ctx.fillStyle = 'rgba(255, 255, 200, 0.5)';
        ctx.fillRect(-15, -1, 12, 2);
        
        ctx.restore();
      }
      
      ctx.restore();
    });

  }, [units, countdown]);

  return (
    <div className="flex flex-col items-center gap-4 z-10 w-full max-w-4xl px-4">
      <div className="flex justify-between w-full px-6 py-3 bg-gradient-to-b from-slate-800/80 to-slate-900/80 border border-slate-600 rounded-lg shadow-lg">
        <div className="flex flex-col items-start">
          <span className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">我方军势</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="text-blue-300 font-bold text-xl">{units.filter(u => u.side === 'player').length}</div>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">战场等级</span>
          <div className="text-yellow-400 font-bold text-2xl">Lv.{level}</div>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">敌方规模</span>
          <div className="flex items-center gap-2">
            <div className="text-red-300 font-bold text-xl">{units.filter(u => u.side === 'enemy').length}</div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
      
      <div className="relative w-full shadow-2xl rounded-lg overflow-hidden border-2 border-slate-700">
        <canvas 
          ref={canvasRef} width={800} height={400} 
          className="w-full"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {countdown > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-8xl text-yellow-400 font-black animate-bounce drop-shadow-lg">
              {countdown}
            </div>
            <div className="text-lg text-white font-bold tracking-widest mt-4 uppercase">列阵中...</div>
          </div>
        )}
        
        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="text-5xl text-white font-black italic tracking-tight mb-4 drop-shadow-lg">
              战役结束
            </div>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent"></div>
          </div>
        )}
      </div>
      
      <div className="flex gap-6 px-4 py-2 bg-slate-800/60 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
          <span className="text-xs text-slate-300">剑盾</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
          <span className="text-xs text-slate-300">矛兵</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
          <span className="text-xs text-slate-300">弓箭</span>
        </div>
      </div>
    </div>
  );
};

export default Battlefield;
