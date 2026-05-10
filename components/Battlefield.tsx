
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { UnitType, Unit, UnitStats, BattleStats } from '../types';
import { UNIT_CONFIGS, UNIT_COLORS } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { audio } from '../utils/audio';
import { drawUnit, drawUnitOnCanvas } from '../utils/unitDrawer';

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
const CANVAS_HEIGHT = 400;
const GROUND_TOP = Math.ceil(CANVAS_HEIGHT / 5);
const GROUND_BOTTOM = CANVAS_HEIGHT - 20;

const Battlefield: React.FC<BattlefieldProps> = ({ playerUnits, level, upgrades, onBattleEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const effectsRef = useRef<VisualEffect[]>([]);
  const ghostTrailsRef = useRef<Record<string, GhostFrame[]>>({});
  
  const statsRef = useRef<BattleStats>({
    dealt: { [UnitType.ARCHER]: 0, [UnitType.SWORDSMAN]: 0, [UnitType.SPEARMAN]: 0, [UnitType.CAVALRY]: 0, [UnitType.BLANK]: 0 },
    taken: { [UnitType.ARCHER]: 0, [UnitType.SWORDSMAN]: 0, [UnitType.SPEARMAN]: 0, [UnitType.CAVALRY]: 0, [UnitType.BLANK]: 0 },
  });
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const dist = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const clampX = (x: number) => Math.max(20, Math.min(780, x));
  const clampY = (y: number) => Math.max(GROUND_TOP + 10, Math.min(GROUND_BOTTOM, y));
  const getNearbyEnemies = (enemies: Unit[], x: number, y: number, radius: number) =>
    enemies.filter(e => dist(e.x, e.y, x, y) < radius);

  const initBattle = useCallback(() => {
    const spawnedUnits: Unit[] = [];
    const width = 800;
    const height = 400;

    const sortedPlayerTypes = [...playerUnits].sort((a, b) => {
        const order = { [UnitType.SWORDSMAN]: 0, [UnitType.SPEARMAN]: 1, [UnitType.CAVALRY]: 2, [UnitType.ARCHER]: 3 };
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
      else if (type === UnitType.CAVALRY) startX = 100;
      else startX = 40;

      spawnedUnits.push({
        id: uuidv4(),
        type,
        side: 'player',
        x: startX + Math.random() * 40,
        y: GROUND_TOP + 20 + Math.random() * (GROUND_BOTTOM - GROUND_TOP - 40),
        stats: config,
        isAttacking: false,
        isCharging: type === UnitType.SPEARMAN,
        isInvulnerable: false,
        attackTimer: Math.random() * 0.5,
        facing: 'right',
        walkPhase: Math.random() * Math.PI * 2,
        prevX: 0,
        prevY: 0,
        vx: 0,
        vy: 0,
        chargeValue: type === UnitType.CAVALRY ? 100 : undefined,
      });
    });

    const enemyCount = Math.floor((20 + level * 5) * (2/3));
    const enemyTypes = [UnitType.SWORDSMAN, UnitType.ARCHER, UnitType.SPEARMAN, UnitType.CAVALRY];

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
        y: GROUND_TOP + 20 + Math.random() * (GROUND_BOTTOM - GROUND_TOP - 40),
        stats: config,
        isAttacking: false,
        isCharging: type === UnitType.SPEARMAN,
        isInvulnerable: false,
        attackTimer: Math.random() * 0.5,
        facing: 'left',
        walkPhase: Math.random() * Math.PI * 2,
        prevX: 0,
        prevY: 0,
        vx: 0,
        vy: 0,
        chargeValue: type === UnitType.CAVALRY ? 100 : undefined,
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

  const applyChargeDamage = useCallback((
    unit: Unit,
    target: Unit,
    baseDamage: number,
    knockback: number,
    particleColor: string,
    particleSpeed: number,
    particleVyOffset: number
  ) => {
    if (target.isInvulnerable) return;
    
    const knockbackDir = unit.side === 'player' ? 1 : -1;
    target.x += knockbackDir * knockback;
    const chargeDmg = Math.floor(baseDamage * (1 - target.stats.defense));
    target.stats.hp -= chargeDmg;
    if (unit.side === 'player') statsRef.current.dealt[unit.type] += chargeDmg;
    else statsRef.current.taken[target.type] += chargeDmg;
    effectsRef.current.push({
      id: uuidv4(), x: target.x, y: target.y - 20,
      type: 'damage', life: 1, value: chargeDmg, isCrit: true
    });
    for (let i = 0; i < 6; i++) {
      const pa = (Math.random() - 0.5) * Math.PI;
      const sp = particleSpeed + Math.random() * (particleSpeed * 0.5);
      effectsRef.current.push({
        id: uuidv4(), x: target.x, y: target.y - 10,
        type: 'particle', life: 0.4,
        vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp - particleVyOffset,
        size: 2 + Math.random() * 3, color: particleColor
      });
    }
  }, []);

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
            setTimeout(() => onBattleEnd(playerAlive, playerAlive ? Math.floor(1000 + level * 100) : 0, statsRef.current), 2000);
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
              if (!ghostTrailsRef.current[unit.id]) ghostTrailsRef.current[unit.id] = [];
              ghostTrailsRef.current[unit.id].unshift({ x: unit.x, y: unit.y, alpha: 0.6 });
              if (ghostTrailsRef.current[unit.id].length > 8) ghostTrailsRef.current[unit.id].pop();
              return;
            }
          }

          if (unit.type === UnitType.SPEARMAN) {
            if (unit.isCharging) {
              const targetX = unit.side === 'player' ? 780 : 20;
              const dx = targetX - unit.x;
              unit.facing = dx > 0 ? 'right' : 'left';
              if (Math.abs(dx) < 30) {
                unit.isCharging = false;
              } else {
                const speed = (1 + unit.chargeValue * 0.001) * 120;
                unit.x += (dx > 0 ? 1 : -1) * speed * deltaTime;
                unit.walkPhase += 8 * Math.PI * 2 * deltaTime;

                const nearbyEnemies = getNearbyEnemies(enemies, unit.x, unit.y, 20);
                if (nearbyEnemies.length > 0 && nearbyEnemies[0].type !== UnitType.SPEARMAN) {
                  applyChargeDamage(unit, nearbyEnemies[0], 22, 50, '#a855f7', 80, 30);
                }
                return;
              }
            }
          }

          if (unit.type === UnitType.CAVALRY) {
            if (unit.chargeValue === undefined) unit.chargeValue = 100;

            unit.chargeValue += 10 * deltaTime;

            const lowestHpEnemy = enemies.length > 0 ? enemies.reduce((prev, curr) => {
              return curr.stats.hp < prev.stats.hp ? curr : prev;
            }) : null;

            if (unit.chargeValue > 50 && !unit.isCharging && lowestHpEnemy) {
              unit.isCharging = true;
            }

            if (unit.isCharging) {
              const targetX = lowestHpEnemy ? lowestHpEnemy.x : (unit.side === 'player' ? 780 : 20);
              const targetY = lowestHpEnemy ? lowestHpEnemy.y : unit.y;
              const dx = targetX - unit.x;
              const dy = targetY - unit.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dx !== 0) unit.facing = dx > 0 ? 'right' : 'left';

              const speedBoost = 1 + unit.chargeValue * 0.001;
              const speed = speedBoost * 150;

              if (dist > 15) {
                const angle = Math.atan2(dy, dx);
                unit.x += Math.cos(angle) * speed * deltaTime;
                unit.y += Math.sin(angle) * speed * deltaTime;
                unit.walkPhase += 8 * Math.PI * 2 * deltaTime;

                if (!ghostTrailsRef.current[unit.id]) ghostTrailsRef.current[unit.id] = [];
                ghostTrailsRef.current[unit.id].unshift({ x: unit.x, y: unit.y, alpha: 0.5 });
                if (ghostTrailsRef.current[unit.id].length > 6) ghostTrailsRef.current[unit.id].pop();

                const nearbyEnemies = getNearbyEnemies(enemies, unit.x, unit.y, 20);
                if (nearbyEnemies.length > 0) {
                  applyChargeDamage(unit, nearbyEnemies[0], 15, 40, '#fbbf24', 60, 20);
                  unit.chargeValue = 10;
                  unit.isCharging = false;
                }
              } else {
                unit.isCharging = false;
              }

              unit.x = clampX(unit.x);
              unit.y = clampY(unit.y);
              return;
            }

            if (!unit.isCharging && unit.chargeValue <= 50) {
              if (enemies.length === 0) return;
              const nearestEnemy = enemies.reduce((prev, curr) => {
                const d1 = dist(prev.x, prev.y, unit.x, unit.y);
                const d2 = dist(curr.x, curr.y, unit.x, unit.y);
                return d2 < d1 ? curr : prev;
              });
              const fleeDist = 150;
              const fleeX = unit.side === 'player' 
                ? Math.min(unit.x - fleeDist, 200)
                : Math.max(unit.x + fleeDist, 600);
              const dx = fleeX - unit.x;
              const fleeDistAbs = Math.abs(dx);
              if (dx !== 0) unit.facing = dx > 0 ? 'right' : 'left';
              if (fleeDistAbs > 10) {
                unit.x += (dx > 0 ? 1 : -1) * 60 * deltaTime;
                unit.walkPhase += 5 * Math.PI * 2 * deltaTime;
              }
              unit.y = clampY(unit.y);
              return;
            }
          }

          if (enemies.length === 0) return;

          let nearestEnemy: Unit = enemies[0];
          let minDist = Infinity;
          enemies.forEach(e => {
            const d = dist(e.x, e.y, unit.x, unit.y);
            if (d < minDist) { minDist = d; nearestEnemy = e; }
          });

          let target: Unit | null = nearestEnemy;

          if (unit.type === UnitType.ARCHER) {
            target = enemies.reduce((prev, curr) => (curr.stats.hp / curr.stats.maxHp < prev.stats.hp / prev.stats.maxHp) ? curr : prev);
            
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

              const distToSafe = dist(unit.x, unit.y, safeX, safeY);
              if (distToSafe > 10) {
                const angle = Math.atan2(safeY - unit.y, safeX - unit.x);
                unit.facing = safeX > unit.x ? 'right' : 'left';
                unit.x += Math.cos(angle) * unit.stats.speed * 50 * deltaTime;
                unit.y += Math.sin(angle) * unit.stats.speed * 50 * deltaTime;
                unit.walkPhase += 7 * Math.PI * 2 * deltaTime;
              }
            } else {
              const nearestDist = dist(unit.x, unit.y, target.x, target.y);
              if (nearestDist < 100) {
                const angle = Math.atan2(unit.y - target.y, unit.x - target.x);
                unit.facing = unit.x > target.x ? 'right' : 'left';
                unit.x += Math.cos(angle) * unit.stats.speed * 80 * deltaTime;
                unit.y += Math.sin(angle) * unit.stats.speed * 80 * deltaTime;
                unit.walkPhase += 7 * Math.PI * 2 * deltaTime;
                unit.isAttacking = false;
              } else {
                const angle = Math.atan2(unit.y - target.y, unit.x - target.x);
                unit.facing = target.x > unit.x ? 'right' : 'left';
                unit.x += Math.cos(angle) * unit.stats.speed * 30 * deltaTime;
                unit.y += Math.sin(angle) * unit.stats.speed * 30 * deltaTime;
                unit.walkPhase += 7 * Math.PI * 2 * deltaTime;
              }
            }
            unit.x = clampX(unit.x);
            unit.y = Math.max(GROUND_TOP + 15, Math.min(GROUND_BOTTOM, unit.y));
          } else {
            const targetDist = dist(unit.x, unit.y, target.x, target.y);
            if (targetDist > unit.stats.range) {
              const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
              unit.facing = target.x > unit.x ? 'right' : 'left';
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
              const cooldown = unit.type === UnitType.SPEARMAN ? 0.5 : ATTACK_COOLDOWN;
              unit.attackTimer = cooldown;
              if (!target.isInvulnerable) {
                audio.playAttack(unit.type === UnitType.ARCHER);
                const dmg = unit.stats.attack * (1 - target.stats.defense);
                const dmgValue = Math.floor(dmg);
                target.stats.hp -= dmg;
                if (unit.side === 'player') statsRef.current.dealt[unit.type] += dmg;
                else statsRef.current.taken[target.type] += dmg;
                audio.playHit();
                
                // 矛兵突刺特效
                if (unit.type === UnitType.SPEARMAN) {
                  const thrustDist = unit.side === 'player' ? 10 : -10;
                  target.x += thrustDist * 0.5;
                  effectsRef.current.push({
                    id: uuidv4(), x: target.x, y: target.y - 10,
                    type: 'particle', life: 0.3,
                    vx: (unit.side === 'player' ? 1 : -1) * 100,
                    vy: -30,
                    size: 4, color: '#f87171'
                  });
                }
                
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
            if (enemies.length > 0) {
              const nearestThreat = enemies.reduce((prev, curr) => {
                const d1 = dist(prev.x, prev.y, unit.x, unit.y);
                const d2 = dist(curr.x, curr.y, unit.x, unit.y);
                return d2 < d1 ? curr : prev;
              });
              unit.facing = (nearestThreat.x > unit.x) ? 'right' : 'left';
            }
          }

          if (unit.type !== UnitType.ARCHER) {
            unit.facing = (target.x > unit.x) ? 'right' : 'left';
          }
        });

        // 弹簧碰撞模型：施加弹力到速度，而非直接修改位置
        const SPRING_K = 800;
        const DAMPING = 0.85;
        const MIN_DISTANCE = 18;

        for (let i = 0; i < newUnits.length; i++) {
          const u1 = newUnits[i];
          if (u1.stats.hp <= 0) continue;
          for (let j = i + 1; j < newUnits.length; j++) {
            const u2 = newUnits[j];
            if (u2.stats.hp <= 0) continue;

            const dx = u2.x - u1.x;
            const dy = u2.y - u1.y;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d < MIN_DISTANCE && d > 0) {
              const overlap = MIN_DISTANCE - d;
              const nx = dx / d;
              const ny = dy / d;
              const force = overlap * SPRING_K;
              u1.vx -= nx * force * deltaTime;
              u1.vy -= ny * force * deltaTime;
              u2.vx += nx * force * deltaTime;
              u2.vy += ny * force * deltaTime;
            }
          }
        }

        // 边界弹簧力
        const BOUNDARY_SPRING_K = 600;
        const BOUNDARY_BUFFER = 5;
        newUnits.forEach(u => {
          if (u.stats.hp <= 0) return;

          if (u.x < 15 + BOUNDARY_BUFFER) {
            u.vx += (15 + BOUNDARY_BUFFER - u.x) * BOUNDARY_SPRING_K * deltaTime;
          }
          if (u.x > 785 - BOUNDARY_BUFFER) {
            u.vx -= (u.x - (785 - BOUNDARY_BUFFER)) * BOUNDARY_SPRING_K * deltaTime;
          }
          if (u.y < GROUND_TOP + 10 + BOUNDARY_BUFFER) {
            u.vy += (GROUND_TOP + 10 + BOUNDARY_BUFFER - u.y) * BOUNDARY_SPRING_K * deltaTime;
          }
          if (u.y > GROUND_BOTTOM - BOUNDARY_BUFFER) {
            u.vy -= (u.y - (GROUND_BOTTOM - BOUNDARY_BUFFER)) * BOUNDARY_SPRING_K * deltaTime;
          }
        });

        // 应用阻尼和更新位置
        newUnits.forEach(u => {
          if (u.stats.hp <= 0) return;

          u.vx *= DAMPING;
          u.vy *= DAMPING;

          u.x += u.vx * deltaTime;
          u.y += u.vy * deltaTime;

          u.x = clampX(u.x);
          u.y = clampY(u.y);
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

  // 战场背景
  const drawBackground = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const w = canvas.width;
    const h = canvas.height;
    const skyH = h / 5;

    // 天空渐变（上部分1/5）
    const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(0.4, '#B0E0E6');
    skyGrad.addColorStop(0.8, '#E8F4F8');
    skyGrad.addColorStop(1, '#F5E6D3');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, skyH);

    // 太阳
    ctx.fillStyle = '#FFF8DC';
    ctx.beginPath();
    ctx.arc(w * 0.8, skyH * 0.3, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 248, 220, 0.3)';
    ctx.beginPath();
    ctx.arc(w * 0.8, skyH * 0.3, 40, 0, Math.PI * 2);
    ctx.fill();

    // 云朵
    const drawCloud = (cx: number, cy: number, size: number) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.arc(cx + size * 0.8, cy - size * 0.2, size * 0.7, 0, Math.PI * 2);
      ctx.arc(cx + size * 1.4, cy, size * 0.6, 0, Math.PI * 2);
      ctx.arc(cx - size * 0.6, cy + size * 0.1, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCloud(w * 0.15, skyH * 0.35, 12);
    drawCloud(w * 0.5, skyH * 0.25, 15);
    drawCloud(w * 0.7, skyH * 0.45, 10);

    // 远山
    ctx.fillStyle = '#8B9DAF';
    ctx.beginPath();
    ctx.moveTo(0, skyH);
    ctx.lineTo(w * 0.1, skyH * 0.6);
    ctx.lineTo(w * 0.2, skyH * 0.75);
    ctx.lineTo(w * 0.35, skyH * 0.4);
    ctx.lineTo(w * 0.5, skyH * 0.7);
    ctx.lineTo(w * 0.65, skyH * 0.35);
    ctx.lineTo(w * 0.8, skyH * 0.65);
    ctx.lineTo(w * 0.9, skyH * 0.5);
    ctx.lineTo(w, skyH * 0.7);
    ctx.lineTo(w, skyH);
    ctx.closePath();
    ctx.fill();

    // 近山
    ctx.fillStyle = '#6B8E7B';
    ctx.beginPath();
    ctx.moveTo(0, skyH);
    ctx.lineTo(w * 0.15, skyH * 0.7);
    ctx.lineTo(w * 0.3, skyH * 0.85);
    ctx.lineTo(w * 0.45, skyH * 0.6);
    ctx.lineTo(w * 0.6, skyH * 0.8);
    ctx.lineTo(w * 0.75, skyH * 0.55);
    ctx.lineTo(w * 0.9, skyH * 0.75);
    ctx.lineTo(w, skyH * 0.65);
    ctx.lineTo(w, skyH);
    ctx.closePath();
    ctx.fill();

    // 战场地面（下部分4/5）
    const groundGrad = ctx.createLinearGradient(0, skyH, 0, h);
    groundGrad.addColorStop(0, '#E8D5A3');
    groundGrad.addColorStop(0.3, '#D4C08A');
    groundGrad.addColorStop(0.7, '#C8B078');
    groundGrad.addColorStop(1, '#B8A068');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, skyH, w, h - skyH);

    // 沙地纹理
    ctx.fillStyle = 'rgba(180, 160, 120, 0.15)';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * w;
      const y = skyH + Math.random() * (h - skyH);
      const r = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 石块装饰
    const drawRock = (x: number, y: number, size: number) => {
      ctx.fillStyle = '#8B8680';
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x - size * 0.5, y - size * 0.7);
      ctx.lineTo(x + size * 0.3, y - size * 0.8);
      ctx.lineTo(x + size, y - size * 0.3);
      ctx.lineTo(x + size * 0.8, y + size * 0.2);
      ctx.lineTo(x - size * 0.2, y + size * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#9B9690';
      ctx.beginPath();
      ctx.moveTo(x - size * 0.3, y - size * 0.5);
      ctx.lineTo(x + size * 0.3, y - size * 0.6);
      ctx.lineTo(x + size * 0.5, y - size * 0.2);
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
    };
    drawRock(w * 0.08, skyH + (h - skyH) * 0.3, 12);
    drawRock(w * 0.25, skyH + (h - skyH) * 0.6, 8);
    drawRock(w * 0.42, skyH + (h - skyH) * 0.2, 10);
    drawRock(w * 0.58, skyH + (h - skyH) * 0.7, 14);
    drawRock(w * 0.72, skyH + (h - skyH) * 0.4, 9);
    drawRock(w * 0.88, skyH + (h - skyH) * 0.5, 11);
    drawRock(w * 0.15, skyH + (h - skyH) * 0.8, 7);
    drawRock(w * 0.65, skyH + (h - skyH) * 0.15, 6);

    // 植物装饰（干草/灌木）
    const drawBush = (x: number, y: number, size: number) => {
      ctx.fillStyle = '#6B8E4E';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.arc(x - size * 0.6, y + size * 0.2, size * 0.7, 0, Math.PI * 2);
      ctx.arc(x + size * 0.5, y + size * 0.3, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7BA05E';
      ctx.beginPath();
      ctx.arc(x - size * 0.2, y - size * 0.2, size * 0.5, 0, Math.PI * 2);
      ctx.arc(x + size * 0.3, y, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    };
    drawBush(w * 0.12, skyH + (h - skyH) * 0.5, 10);
    drawBush(w * 0.35, skyH + (h - skyH) * 0.75, 8);
    drawBush(w * 0.55, skyH + (h - skyH) * 0.25, 12);
    drawBush(w * 0.78, skyH + (h - skyH) * 0.6, 9);
    drawBush(w * 0.92, skyH + (h - skyH) * 0.35, 7);
    drawBush(w * 0.48, skyH + (h - skyH) * 0.85, 11);

    // 干草
    const drawGrass = (x: number, y: number, height: number) => {
      ctx.strokeStyle = '#8B9A5E';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        const h = height * (0.7 + Math.random() * 0.3);
        ctx.beginPath();
        ctx.moveTo(x + i * 3, y);
        ctx.lineTo(x + i * 3 + Math.cos(angle) * h * 0.3, y + Math.sin(angle) * h);
        ctx.stroke();
      }
    };
    drawGrass(w * 0.2, skyH + (h - skyH) * 0.4, 15);
    drawGrass(w * 0.45, skyH + (h - skyH) * 0.55, 12);
    drawGrass(w * 0.68, skyH + (h - skyH) * 0.3, 18);
    drawGrass(w * 0.82, skyH + (h - skyH) * 0.7, 14);
    drawGrass(w * 0.3, skyH + (h - skyH) * 0.85, 10);

    // 中线标记（虚线）
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, skyH);
    ctx.lineTo(w / 2, h);
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

  }, [units, countdown, isGameOver]);

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
