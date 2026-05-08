import React, { useEffect, useRef, useState, useCallback } from 'react';
import { UnitType, Unit, BattleStats } from '../types';
import { UNIT_CONFIGS } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { audio } from '../utils/audio';
import { drawUnitOnCanvas } from '../utils/unitDrawer';

interface VisualEffect {
  id: string;
  x: number;
  y: number;
  type: 'damage' | 'slash' | 'arrow' | 'particle';
  life: number;
  value?: number;
  angle?: number;
  isCrit?: boolean;
  vx?: number;
  vy?: number;
  size?: number;
  color?: string;
}

const ATTACK_COOLDOWN = 1.2;
const VISUAL_COOLDOWN = 0.25;
const CANVAS_HEIGHT = 400;
const GROUND_TOP = Math.ceil(CANVAS_HEIGHT / 5);
const GROUND_BOTTOM = CANVAS_HEIGHT - 20;

const TestMode: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);
  const effectsRef = useRef<VisualEffect[]>([]);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const initBattle = useCallback(() => {
    const spawnedUnits: Unit[] = [];
    const width = 800;
    const height = 400;
    const unitCount = 5;

    const playerTypes = [
      UnitType.SWORDSMAN,
      UnitType.SWORDSMAN,
      UnitType.ARCHER,
      UnitType.SPEARMAN,
      UnitType.CAVALRY,
    ];

    const enemyTypes = [
      UnitType.SWORDSMAN,
      UnitType.SWORDSMAN,
      UnitType.ARCHER,
      UnitType.SPEARMAN,
      UnitType.CAVALRY,
    ];

    playerTypes.forEach((type, index) => {
      const config = { ...UNIT_CONFIGS[type] };
      spawnedUnits.push({
        id: uuidv4(),
        type,
        side: 'player',
        x: 50 + index * 30 + Math.random() * 20,
        y: GROUND_TOP + 20 + index * 40 + Math.random() * 30,
        stats: config,
        isAttacking: false,
        isCharging: type === UnitType.SPEARMAN,
        isInvulnerable: false,
        attackTimer: Math.random() * 0.5,
        facing: 'right',
        walkPhase: Math.random() * Math.PI * 2,
        prevX: 0,
        prevY: 0,
        stamina: type === UnitType.CAVALRY ? 0 : undefined,
        isRunning: type === UnitType.CAVALRY ? false : undefined,
      });
    });

    enemyTypes.forEach((type, index) => {
      const config = { ...UNIT_CONFIGS[type] };
      spawnedUnits.push({
        id: uuidv4(),
        type,
        side: 'enemy',
        x: width - 80 - index * 30 - Math.random() * 20,
        y: GROUND_TOP + 20 + index * 40 + Math.random() * 30,
        stats: config,
        isAttacking: false,
        isCharging: type === UnitType.SPEARMAN,
        isInvulnerable: false,
        attackTimer: Math.random() * 0.5,
        facing: 'left',
        walkPhase: Math.random() * Math.PI * 2,
        prevX: 0,
        prevY: 0,
        stamina: type === UnitType.CAVALRY ? 0 : undefined,
        isRunning: type === UnitType.CAVALRY ? false : undefined,
      });
    });

    setUnits(spawnedUnits);
    effectsRef.current = [];

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    initBattle();
  }, [initBattle]);

  const update = useCallback((time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;

      effectsRef.current = effectsRef.current.map(e => {
        if (e.type === 'particle') {
          return { ...e, life: e.life - deltaTime, x: e.x + (e.vx || 0) * deltaTime, y: e.y + (e.vy || 0) * deltaTime, vy: (e.vy || 0) + 200 * deltaTime };
        }
        return { ...e, life: e.life - deltaTime * 2 };
      }).filter(e => e.life > 0);

      setUnits(prevUnits => {
        if (isGameOver || countdown > 0) return prevUnits;

        const newUnits = prevUnits.map(u => ({ ...u, stats: { ...u.stats } }));
        const playerAlive = newUnits.some(u => u.side === 'player' && u.stats.hp > 0);
        const enemyAlive = newUnits.some(u => u.side === 'enemy' && u.stats.hp > 0);

        if (!playerAlive || !enemyAlive) {
          if (!isGameOver) {
            setIsGameOver(true);
            setWinner(playerAlive ? 'player' : 'enemy');
          }
          return prevUnits;
        }

        newUnits.forEach(unit => {
          if (unit.stats.hp <= 0) return;

          unit.prevX = unit.x;
          unit.prevY = unit.y;

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
              unit.walkPhase += 7 * Math.PI * 2 * deltaTime;
              return;
            }
          }

          if (unit.type === UnitType.CAVALRY) {
            if (unit.stamina === undefined) unit.stamina = 0;
            if (unit.isRunning === undefined) unit.isRunning = false;

            if (unit.isRunning) {
              const targetX = unit.side === 'player' ? 780 : 20;
              const dx = targetX - unit.x;
              if (Math.abs(dx) < 30 || unit.stamina < 10) {
                unit.isRunning = false;
              } else {
                unit.x += (dx > 0 ? 1 : -1) * 200 * deltaTime;
                unit.walkPhase += 8 * Math.PI * 2 * deltaTime;
                return;
              }
            }

            if (!unit.isRunning) {
              unit.stamina += 10 * deltaTime;
              if (unit.stamina >= 50 && Math.random() < 0.02) {
                unit.isRunning = true;
              }
            }
          }

          let nearestEnemy: Unit = enemies[0];
          let minDist = Infinity;
          enemies.forEach(e => {
            const d = Math.sqrt(Math.pow(e.x - unit.x, 2) + Math.pow(e.y - unit.y, 2));
            if (d < minDist) { minDist = d; nearestEnemy = e; }
          });

          let target: Unit = nearestEnemy;

          if (unit.type === UnitType.ARCHER) {
            target = enemies.reduce((prev, curr) => (curr.stats.hp / curr.stats.maxHp < prev.stats.hp / prev.stats.maxHp) ? curr : prev);
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
              const vMag = Math.sqrt(vx * vx + vy * vy);
              const safeX = nearestShield.x + (vx / vMag) * 50;
              const safeY = nearestShield.y + (vy / vMag) * 50;

              const distToSafe = Math.sqrt(Math.pow(unit.x - safeX, 2) + Math.pow(unit.y - safeY, 2));
              if (distToSafe > 10) {
                const angle = Math.atan2(safeY - unit.y, safeX - unit.x);
                unit.x += Math.cos(angle) * unit.stats.speed * 50 * deltaTime;
                unit.y += Math.sin(angle) * unit.stats.speed * 50 * deltaTime;
                unit.walkPhase += 7 * Math.PI * 2 * deltaTime;
              }
            } else {
              const angle = Math.atan2(unit.y - target.y, unit.x - target.x);
              unit.x += Math.cos(angle) * unit.stats.speed * 30 * deltaTime;
              unit.y += Math.sin(angle) * unit.stats.speed * 30 * deltaTime;
              unit.walkPhase += 7 * Math.PI * 2 * deltaTime;
            }
            unit.x = Math.max(20, Math.min(780, unit.x));
            unit.y = Math.max(GROUND_TOP + 15, Math.min(GROUND_BOTTOM, unit.y));
          } else {
            const dist = Math.sqrt(Math.pow(target.x - unit.x, 2) + Math.pow(target.y - unit.y, 2));
            if (dist > unit.stats.range) {
              const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
              unit.x += Math.cos(angle) * unit.stats.speed * 60 * deltaTime;
              unit.y += Math.sin(angle) * unit.stats.speed * 60 * deltaTime;
              unit.isAttacking = false;
              unit.walkPhase += 7 * Math.PI * 2 * deltaTime;
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

                for (let i = 0; i < 8; i++) {
                  const pa = (unit.facing === 'right' ? -0.5 : Math.PI + 0.5) + (Math.random() - 0.5) * 1.2;
                  const sp = 70 + Math.random() * 160;
                  effectsRef.current.push({
                    id: uuidv4(),
                    x: target.x,
                    y: target.y - 10,
                    type: 'particle',
                    life: 0.4,
                    vx: Math.cos(pa) * sp,
                    vy: Math.sin(pa) * sp - 20,
                    size: 2 + Math.random() * 3,
                    color: '#f8e8c0'
                  });
                }

                effectsRef.current.push({
                  id: uuidv4(), x: target.x, y: target.y - 20,
                  type: 'damage', life: 1, value: dmgValue,
                  isCrit: dmgValue > unit.stats.attack * 0.9
                });
              }
            }
          } else if (unit.type === UnitType.ARCHER) {
            unit.isAttacking = false;
            const nearestThreat = enemies.reduce((prev, curr) => {
              const d1 = Math.sqrt(Math.pow(prev.x - unit.x, 2) + Math.pow(prev.y - unit.y, 2));
              const d2 = Math.sqrt(Math.pow(curr.x - unit.x, 2) + Math.pow(curr.y - unit.y, 2));
              return d2 < d1 ? curr : prev;
            });
            unit.facing = (nearestThreat.x > unit.x) ? 'right' : 'left';
          }

          if (unit.type !== UnitType.ARCHER) {
            unit.facing = (target.x > unit.x) ? 'right' : 'left';
          }
        });

        // 碰撞分离：士兵之间保持最小距离
        const MIN_DISTANCE = 18;
        for (let i = 0; i < newUnits.length; i++) {
          const u1 = newUnits[i];
          if (u1.stats.hp <= 0) continue;
          for (let j = i + 1; j < newUnits.length; j++) {
            const u2 = newUnits[j];
            if (u2.stats.hp <= 0) continue;

            const dx = u2.x - u1.x;
            const dy = u2.y - u1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < MIN_DISTANCE && dist > 0) {
              const overlap = (MIN_DISTANCE - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;

              u1.x -= nx * overlap;
              u1.y -= ny * overlap;
              u2.x += nx * overlap;
              u2.y += ny * overlap;

              u1.x = Math.max(15, Math.min(785, u1.x));
              u1.y = Math.max(GROUND_TOP + 10, Math.min(GROUND_BOTTOM, u1.y));
              u2.x = Math.max(15, Math.min(785, u2.x));
              u2.y = Math.max(GROUND_TOP + 10, Math.min(GROUND_BOTTOM, u2.y));
            }
          }
        }

        return newUnits.filter(u => u.stats.hp > 0 || u.isInvulnerable);
      });
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(update);
  }, [isGameOver, countdown]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [update]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

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

      const isActuallyMoving = unit.prevX !== unit.x || unit.prevY !== unit.y;
      const attackProgress = unit.isAttacking ? 1 - (unit.attackTimer / ATTACK_COOLDOWN) : 0;
      const flip = unit.facing === 'left' ? -1 : 1;

      ctx.save();
      ctx.translate(unit.x, unit.y);
      ctx.scale(flip, 1);

      const colors = {
        player: { main: '#3b82f6', dark: '#1e40af' },
        enemy: { main: '#ef4444', dark: '#b91c1c' }
      };
      const team = unit.side === 'player' ? colors.player : colors.enemy;

      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 10, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      drawUnitOnCanvas(ctx, unit.type, 0, 0, 1, team, unit.isAttacking, unit.walkPhase, attackProgress, isActuallyMoving);

      ctx.restore();

      if (!unit.isInvulnerable) {
        const hpPercent = Math.max(0, unit.stats.hp / unit.stats.maxHp);
        const barWidth = 18;
        const barHeight = 3;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(unit.x - barWidth / 2, unit.y - 22, barWidth, barHeight);

        let hpColor = '#22c55e';
        if (hpPercent < 0.3) hpColor = '#ef4444';
        else if (hpPercent < 0.6) hpColor = '#eab308';

        ctx.fillStyle = hpColor;
        ctx.fillRect(unit.x - barWidth / 2, unit.y - 22, barWidth * hpPercent, barHeight);
      }
    });

    effectsRef.current.forEach(e => {
      ctx.save();
      if (e.type === 'damage' && e.value !== undefined) {
        const floatY = e.y - (1 - e.life) * 20;
        const alpha = Math.min(1, e.life * 2);
        ctx.globalAlpha = alpha;
        ctx.font = e.isCrit ? 'bold 14px Arial' : '12px Arial';
        ctx.fillStyle = e.isCrit ? '#fbbf24' : '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(`-${e.value}`, e.x, floatY);
        ctx.fillText(`-${e.value}`, e.x, floatY);
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
        ctx.globalAlpha = Math.min(1, e.life * 1.5);
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle || 0);
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-2, -2, 28, 4);
        ctx.fillStyle = '#a0522d';
        ctx.fillRect(0, -1, 24, 2);
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
        ctx.fillStyle = 'rgba(255, 255, 200, 0.5)';
        ctx.fillRect(-15, -1, 12, 2);
        ctx.restore();
      } else if (e.type === 'particle') {
        ctx.globalAlpha = e.life / 0.4;
        ctx.fillStyle = e.color || '#f8e8c0';
        const sz = e.size || 3;
        ctx.fillRect(e.x - sz / 2, e.y - sz / 2, sz, sz);
      }
      ctx.restore();
    });

    if (countdown > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 80px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(countdown.toString(), canvas.width / 2, canvas.height / 2);
      ctx.restore();
    }

    if (isGameOver && winner) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = winner === 'player' ? '#22c55e' : '#ef4444';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(winner === 'player' ? '蓝方胜利!' : '红方胜利!', canvas.width / 2, canvas.height / 2);
      ctx.restore();
    }
  }, [units, countdown, isGameOver, winner]);

  const playerCount = units.filter(u => u.side === 'player' && u.stats.hp > 0).length;
  const enemyCount = units.filter(u => u.side === 'enemy' && u.stats.hp > 0).length;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-4">
      <div className="flex items-center gap-8 text-white">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>蓝方: {playerCount}</span>
        </div>
        <span className="text-zinc-500">VS</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>红方: {enemyCount}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="border border-zinc-700 rounded-lg"
      />

      <button
        onClick={() => { audio.playClick(); onBack(); }}
        className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white pixel-border"
      >
        返回
      </button>

      {isGameOver && (
        <button
          onClick={() => { audio.playClick(); setIsGameOver(false); setWinner(null); initBattle(); setCountdown(3); }}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white pixel-border"
        >
          重新开始
        </button>
      )}
    </div>
  );
};

export default TestMode;
