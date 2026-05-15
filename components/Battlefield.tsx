
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { UnitType, Unit, UnitStats, BattleStats, SmokeParticle, SkillType, SkillCard, ActiveSkillEffect } from '../types';
import { UNIT_CONFIGS, UNIT_COLORS, SKILL_CONFIGS } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { audio } from '../utils/audio';
import { drawUnit, drawUnitOnCanvas } from '../utils/unitDrawer';

interface VisualEffect {
  id: string;
  x: number;
  y: number;
  type: 'damage' | 'slash' | 'arrow' | 'particle' | 'skill_heal' | 'skill_berserk' | 'skill_meteor';
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
  survivingUnits?: UnitType[];
  skills: SkillCard[];
  onBattleEnd: (victory: boolean, score: number, stats: BattleStats, survivors: UnitType[]) => void;
  onUseSkill: (skillType: SkillType) => void;
}

const ATTACK_COOLDOWN = 1.2; 
const VISUAL_COOLDOWN = 0.25;
const CANVAS_HEIGHT = 400;
const GROUND_TOP = Math.ceil(CANVAS_HEIGHT / 5);
const GROUND_BOTTOM = CANVAS_HEIGHT - 20;

const getAttackCooldown = (unitType: UnitType) => {
  switch(unitType) {
    case UnitType.SWORDSMAN: return 1.0;
    case UnitType.ARCHER: return 0.5;
    case UnitType.CAVALRY: return 0.7;
    case UnitType.SPEARMAN: return 0.5;
    default: return 1.2;
  }
};

const Battlefield: React.FC<BattlefieldProps> = ({ playerUnits, level, upgrades, survivingUnits = [], skills, onBattleEnd, onUseSkill }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const effectsRef = useRef<VisualEffect[]>([]);
  const ghostTrailsRef = useRef<Record<string, GhostFrame[]>>({});
  const smokeParticlesRef = useRef<SmokeParticle[]>([]);
  const [activeSkills, setActiveSkills] = useState<ActiveSkillEffect[]>([]);
  const [draggingSkill, setDraggingSkill] = useState<SkillType | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [skillCooldowns, setSkillCooldowns] = useState<Record<SkillType, number>>({
    [SkillType.HEAL]: 0,
    [SkillType.BERSERK]: 0,
    [SkillType.METEOR]: 0,
  });
  
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

    const lvl = Math.min(level, 10);

    const allPlayerUnits = [...survivingUnits, ...playerUnits].sort((a, b) => {
        const order = { [UnitType.SWORDSMAN]: 0, [UnitType.SPEARMAN]: 1, [UnitType.CAVALRY]: 2, [UnitType.ARCHER]: 3 };
        return order[a] - (order[b] ?? 0);
    });

    const baseEnemyCount = 10 + (lvl - 1) * 5;
    const playerCount = allPlayerUnits.length;
    const ratio = playerCount / baseEnemyCount;
    const extraEnemies = ratio >= 2 ? Math.floor((ratio - 1) * 10) : 0;
    const enemyCount = baseEnemyCount + extraEnemies;

    const types = lvl <= 2
      ? [UnitType.SWORDSMAN, UnitType.ARCHER]
      : lvl <= 4
        ? [UnitType.SWORDSMAN, UnitType.ARCHER, UnitType.SPEARMAN]
        : [UnitType.SWORDSMAN, UnitType.ARCHER, UnitType.SPEARMAN, UnitType.CAVALRY];

    const hpMult = 1 + (lvl - 1) * 0.15;
    const atkMult = 1 + (lvl - 1) * 0.08;

    allPlayerUnits.forEach((type) => {
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

    for(let i=0; i<enemyCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const config = { ...UNIT_CONFIGS[type] };
      config.hp *= hpMult;
      config.maxHp *= hpMult;
      config.attack *= atkMult;

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
    smokeParticlesRef.current = [];
    
    const timer = setInterval(() => {
        setCountdown(prev => {
            if (prev <= 1) {
                clearInterval(timer);
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
  }, [playerUnits, level, upgrades, survivingUnits]);

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
        
        // 检测死亡的士兵并生成烟雾
        prevUnits.forEach(prevUnit => {
          const currentUnit = newUnits.find(u => u.id === prevUnit.id);
          if (prevUnit.stats.hp > 0 && currentUnit && currentUnit.stats.hp <= 0) {
            for (let i = 0; i < 10; i++) {
              smokeParticlesRef.current.push({
                x: currentUnit.x + (Math.random() - 0.5) * 20,
                y: currentUnit.y - 10 + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 30,
                vy: -20 - Math.random() * 30,
                size: 5 + Math.random() * 8,
                alpha: 0.6,
                life: 1.5,
                maxLife: 1.5,
              });
            }
          }
        });

        const playerAlive = newUnits.some(u => u.side === 'player' && u.stats.hp > 0);
        const enemyAlive = newUnits.some(u => u.side === 'enemy' && u.stats.hp > 0);

        if (!playerAlive || !enemyAlive) {
          if (!isGameOver) {
            setIsGameOver(true);
            const playerUnitsAlive = newUnits.filter(u => u.side === 'player' && u.stats.hp > 0);
            const survivors = playerAlive ? playerUnitsAlive.map(u => u.type) : [];
            const survivalRatio = playerUnits.length > 0 ? playerUnitsAlive.length / playerUnits.length : 0;
            const baseScore = 1000 + level * 100;
            const survivalBonus = Math.floor(500 * survivalRatio);
            const finalScore = playerAlive ? baseScore + survivalBonus : 0;
            setTimeout(() => onBattleEnd(playerAlive, finalScore, statsRef.current, survivors), 2000);
          }
          return prevUnits;
        }

        // 剑盾兵协同防御：计算周围友军数量并应用加成
        newUnits.forEach(unit => {
          if (unit.type === UnitType.SWORDSMAN && unit.stats.hp > 0) {
            const nearbyAllies = newUnits.filter(u => 
              u.side === unit.side && u.id !== unit.id && dist(u.x, u.y, unit.x, unit.y) < 100
            );
            const buffMultiplier = 1 + nearbyAllies.length * 0.03;
            unit.stats.attack = Math.floor(UNIT_CONFIGS[unit.type].attack * buffMultiplier) + (unit.side === 'player' ? upgrades.attackBonus : 0);
            unit.stats.defense = Math.min(0.95, UNIT_CONFIGS[unit.type].defense * buffMultiplier);
          }
        });

        newUnits.forEach(unit => {
          if (unit.stats.hp <= 0) return;

          unit.prevX = unit.x;
          unit.prevY = unit.y;

          const enemies = newUnits.filter(e => e.side !== unit.side && e.stats.hp > 0);
          if (enemies.length === 0) return;

          if (unit.type === UnitType.SPEARMAN && unit.isCharging) {
            const targetX = unit.side === 'player' ? 780 : 20;
            const dx = targetX - unit.x;
            unit.facing = dx > 0 ? 'right' : 'left';
            unit.isInvulnerable = true;

            if (Math.abs(dx) < 30) {
              unit.isCharging = false;
              unit.isInvulnerable = false;
            } else {
              const speed = 300;
              unit.x += (dx > 0 ? 1 : -1) * speed * deltaTime;
              unit.walkPhase += 8 * Math.PI * 2 * deltaTime;

              if (!ghostTrailsRef.current[unit.id]) ghostTrailsRef.current[unit.id] = [];
              ghostTrailsRef.current[unit.id].unshift({ x: unit.x, y: unit.y, alpha: 0.6 });
              if (ghostTrailsRef.current[unit.id].length > 8) ghostTrailsRef.current[unit.id].pop();

              const nearbyEnemies = getNearbyEnemies(enemies, unit.x, unit.y, 18);
              if (nearbyEnemies.length > 0 && nearbyEnemies[0].type !== UnitType.SPEARMAN) {
                const hitEnemy = nearbyEnemies[0];
                if (!hitEnemy._chargedThisPass) {
                  applyChargeDamage(unit, hitEnemy, 22, 50, '#a855f7', 80, 30);
                  hitEnemy._chargedThisPass = true;
                }
              }
              return;
            }
          }

          if (unit.type === UnitType.CAVALRY) {
            if (unit.chargeValue === undefined) unit.chargeValue = 100;

            // 计算奔跑值对速度的影响：每10点增加0.1像素/秒
            const speedBonus = unit.chargeValue ? (unit.chargeValue / 10) * 0.1 : 0;

            unit.chargeValue += 10 * deltaTime;

            const lowestHpEnemy = enemies.length > 0 ? enemies.reduce((prev, curr) => {
              return curr.stats.hp < prev.stats.hp ? curr : prev;
            }) : null;

            // 开局冲锋：游戏开始3秒内必定冲锋
            const isInitialCharge = unit.chargeValue >= 100;
            const canCharge = unit.chargeValue > 50 && lowestHpEnemy;
            const distToLowest = lowestHpEnemy ? dist(unit.x, unit.y, lowestHpEnemy.x, lowestHpEnemy.y) : Infinity;
            const shouldStartCharge = (isInitialCharge || canCharge) && !unit.isCharging && distToLowest > 50 && distToLowest < 500;

            if (shouldStartCharge) {
              unit.isCharging = true;
            }

            if (unit.isCharging) {
              const targetX = lowestHpEnemy ? lowestHpEnemy.x : (unit.side === 'player' ? 780 : 20);
              const targetY = lowestHpEnemy ? lowestHpEnemy.y : unit.y;
              const dx = targetX - unit.x;
              const dy = targetY - unit.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dx !== 0) unit.facing = dx > 0 ? 'right' : 'left';

              const speedBoost = 1 + (unit.chargeValue || 0) * 0.001;
              const speed = (speedBoost * 150) + speedBonus;

              if (dist > 15) {
                const angle = Math.atan2(dy, dx);
                unit.x += Math.cos(angle) * speed * deltaTime;
                unit.y += Math.sin(angle) * speed * deltaTime;
                unit.walkPhase += 8 * Math.PI * 2 * deltaTime;

                if (!ghostTrailsRef.current[unit.id]) ghostTrailsRef.current[unit.id] = [];
                ghostTrailsRef.current[unit.id].unshift({ x: unit.x, y: unit.y, alpha: 0.5 });
                if (ghostTrailsRef.current[unit.id].length > 6) ghostTrailsRef.current[unit.id].pop();

                const nearbyEnemies = getNearbyEnemies(enemies, unit.x, unit.y, 18);
                if (nearbyEnemies.length > 0) {
                  const hitEnemy = nearbyEnemies[0];
                  if (!hitEnemy._chargedThisPass) {
                    applyChargeDamage(unit, hitEnemy, 15, 40, '#fbbf24', 60, 20);
                    hitEnemy._chargedThisPass = true;
                  }
                }
              } else {
                unit.isCharging = false;
                unit.chargeValue = 10;
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
                unit.x += (dx > 0 ? 1 : -1) * (60 + speedBonus) * deltaTime;
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
              // 优先躲在最近的剑盾兵后方
              let nearestShield = shields[0];
              let minSDist = Infinity;
              shields.forEach(s => {
                const d = dist(s.x, s.y, unit.x, unit.y);
                if (d < minSDist) { minSDist = d; nearestShield = s; }
              });

              // 计算剑盾兵后方安全位置（远离敌人的方向）
              const enemyDirX = target.x - nearestShield.x;
              const enemyDirY = target.y - nearestShield.y;
              const enemyDist = Math.sqrt(enemyDirX * enemyDirX + enemyDirY * enemyDirY);
              const safeX = nearestShield.x - (enemyDirX / enemyDist) * 50;
              const safeY = nearestShield.y - (enemyDirY / enemyDist) * 50;

              const distToSafe = dist(unit.x, unit.y, safeX, safeY);
              if (distToSafe > 10) {
                const angle = Math.atan2(safeY - unit.y, safeX - unit.x);
                unit.facing = safeX > unit.x ? 'right' : 'left';
                unit.x += Math.cos(angle) * unit.stats.speed * 50 * deltaTime;
                unit.y += Math.sin(angle) * unit.stats.speed * 50 * deltaTime;
                unit.walkPhase += 7 * Math.PI * 2 * deltaTime;
              }
            } else {
              // 无剑盾兵时，保持距离，优先远离墙壁
              const nearestDist = dist(unit.x, unit.y, target.x, target.y);
              if (nearestDist < 75) {
                // 远离敌人，优先选择远离墙壁的方向
                const fleeAngle = Math.atan2(unit.y - target.y, unit.x - target.x);
                
                // 检查墙壁距离，调整方向
                const wallDistLeft = unit.x - 20;
                const wallDistRight = 780 - unit.x;
                const wallDistTop = unit.y - (GROUND_TOP + 10);
                const wallDistBottom = GROUND_BOTTOM - unit.y;
                
                let adjustedAngle = fleeAngle;
                if (wallDistLeft < 50) adjustedAngle += 0.5;
                if (wallDistRight < 50) adjustedAngle -= 0.5;
                if (wallDistTop < 30) adjustedAngle += 0.3;
                if (wallDistBottom < 30) adjustedAngle -= 0.3;
                
                unit.facing = unit.x > target.x ? 'right' : 'left';
                unit.x += Math.cos(adjustedAngle) * unit.stats.speed * 80 * deltaTime;
                unit.y += Math.sin(adjustedAngle) * unit.stats.speed * 80 * deltaTime;
                unit.walkPhase += 7 * Math.PI * 2 * deltaTime;
                unit.isAttacking = false;
              } else if (nearestDist > 250) {
                // 距离过远，靠近敌人
                const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
                unit.facing = target.x > unit.x ? 'right' : 'left';
                unit.x += Math.cos(angle) * unit.stats.speed * 30 * deltaTime;
                unit.y += Math.sin(angle) * unit.stats.speed * 30 * deltaTime;
                unit.walkPhase += 7 * Math.PI * 2 * deltaTime;
              } else {
                // 在有效攻击范围内，可以攻击
                unit.isAttacking = true;
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
                audio.playAttack(unit.type === UnitType.ARCHER, unit.type);
                let dmg = unit.stats.attack * (1 - target.stats.defense);
                
                // 剑盾兵保护弓箭手：100px范围内有剑盾兵时，分担1%伤害
                if (target.type === UnitType.ARCHER) {
                  const protectingShields = newUnits.filter(u => 
                    u.type === UnitType.SWORDSMAN && u.side === target.side && 
                    u.stats.hp > 0 && dist(u.x, u.y, target.x, target.y) < 100
                  );
                  if (protectingShields.length > 0) {
                    const sharedDmg = dmg * 0.01;
                    dmg -= sharedDmg;
                    protectingShields.forEach(shield => {
                      shield.stats.hp -= sharedDmg / protectingShields.length;
                    });
                  }
                }
                
                const dmgValue = Math.floor(dmg);
                target.stats.hp -= dmg;
                if (unit.side === 'player') statsRef.current.dealt[unit.type] += dmg;
                else statsRef.current.taken[target.type] += dmg;
                audio.playHit(unit.type === UnitType.CAVALRY || unit.type === UnitType.SPEARMAN);
                
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

        // 碰撞处理：冲锋单位无视碰撞，其余使用弹簧模型
        const SPRING_K = 600;
        const DAMPING = 0.88;
        const MIN_DISTANCE = 16;

        for (let i = 0; i < newUnits.length; i++) {
          const u1 = newUnits[i];
          if (u1.stats.hp <= 0 || u1.isCharging) continue;
          for (let j = i + 1; j < newUnits.length; j++) {
            const u2 = newUnits[j];
            if (u2.stats.hp <= 0 || u2.isCharging) continue;

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

        // 软边界：单位停留在边界上，不会被弹飞
        const BOUNDARY_FORCE = 300;
        newUnits.forEach(u => {
          if (u.stats.hp <= 0) return;

          if (u.x < 20) {
            u.vx += (20 - u.x) * BOUNDARY_FORCE * deltaTime;
            u.x = Math.max(20, u.x);
          }
          if (u.x > 780) {
            u.vx -= (u.x - 780) * BOUNDARY_FORCE * deltaTime;
            u.x = Math.min(780, u.x);
          }
          if (u.y < GROUND_TOP + 10) {
            u.vy += (GROUND_TOP + 10 - u.y) * BOUNDARY_FORCE * deltaTime;
            u.y = Math.max(GROUND_TOP + 10, u.y);
          }
          if (u.y > GROUND_BOTTOM) {
            u.vy -= (u.y - GROUND_BOTTOM) * BOUNDARY_FORCE * deltaTime;
            u.y = Math.min(GROUND_BOTTOM, u.y);
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

        // 更新烟雾粒子
        smokeParticlesRef.current = smokeParticlesRef.current.map(p => {
          p.vy -= 15 * deltaTime;
          p.vx *= 0.98;
          p.size += 3 * deltaTime;
          p.life -= deltaTime;
          p.alpha = Math.max(0, p.life / p.maxLife);
          p.x += p.vx * deltaTime;
          p.y += p.vy * deltaTime;
          return p;
        }).filter(p => p.life > 0);

        // 更新技能冷却
        setSkillCooldowns(prev => {
          const newCooldowns = { ...prev };
          Object.keys(newCooldowns).forEach(key => {
            if (newCooldowns[key as SkillType] > 0) {
              newCooldowns[key as SkillType] -= deltaTime;
            }
          });
          return newCooldowns;
        });

        // 更新活跃技能效果
        setActiveSkills(prev => {
          return prev.map(skill => {
            const elapsed = (Date.now() - skill.startTime) / 1000;
            if (elapsed > skill.duration) {
              // 技能结束，恢复狂暴效果的原始属性
              if (skill.type === SkillType.BERSERK && skill.originalStats) {
                newUnits.forEach(unit => {
                  if (skill.originalStats![unit.id]) {
                    unit.stats.attack = skill.originalStats![unit.id].attack;
                    unit.stats.speed = skill.originalStats![unit.id].speed;
                  }
                });
              }
              return null;
            }
            // 应用持续效果
            if (skill.type === SkillType.HEAL) {
              // 每秒恢复1%最大生命值
              const healAmount = 0.01 * deltaTime;
              newUnits.forEach(unit => {
                if (unit.side === 'player' && unit.stats.hp > 0 && skill.affectedUnits.includes(unit.id)) {
                  unit.stats.hp = Math.min(unit.stats.maxHp, unit.stats.hp + unit.stats.maxHp * healAmount);
                }
              });
            }
            return skill;
          }).filter(Boolean) as ActiveSkillEffect[];
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

  // 技能释放函数
  const handleSkillRelease = useCallback((skillType: SkillType, x: number, y: number) => {
    const config = SKILL_CONFIGS[skillType];
    const now = Date.now();
    
    // 检查冷却
    if (skillCooldowns[skillType] > 0) return;
    
    // 设置冷却
    setSkillCooldowns(prev => ({ ...prev, [skillType]: config.cooldown }));
    
    // 获取范围内的单位
    const affectedUnits = units.filter(u => {
      const distance = dist(u.x, u.y, x, y);
      return distance < config.range && u.stats.hp > 0;
    }).map(u => u.id);
    
    // 创建技能效果
    const newEffect: ActiveSkillEffect = {
      id: uuidv4(),
      type: skillType,
      x,
      y,
      range: config.range,
      startTime: now,
      duration: config.duration,
      affectedUnits,
    };
    
    // 狂暴效果需要记录原始属性
    if (skillType === SkillType.BERSERK) {
      newEffect.originalStats = {};
      units.forEach(unit => {
        if (unit.side === 'player' && unit.stats.hp > 0 && affectedUnits.includes(unit.id)) {
          newEffect.originalStats![unit.id] = {
            attack: unit.stats.attack,
            speed: unit.stats.speed,
          };
        }
      });
    }
    
    setActiveSkills(prev => [...prev, newEffect]);
    
    // 立即应用效果
    if (skillType === SkillType.HEAL) {
      // 立即恢复30%最大生命值
      setUnits(prevUnits => {
        return prevUnits.map(unit => {
          if (unit.side === 'player' && unit.stats.hp > 0 && affectedUnits.includes(unit.id)) {
            return {
              ...unit,
              stats: {
                ...unit.stats,
                hp: Math.min(unit.stats.maxHp, unit.stats.hp + unit.stats.maxHp * 0.3)
              }
            };
          }
          return unit;
        });
      });
      // 添加绿色治疗粒子效果
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 50;
        effectsRef.current.push({
          id: uuidv4(),
          x: x + Math.cos(angle) * Math.random() * config.range,
          y: y + Math.sin(angle) * Math.random() * config.range,
          type: 'skill_heal',
          life: 1.5,
          vx: Math.cos(angle) * speed,
          vy: -50 - Math.random() * 30,
          size: 3 + Math.random() * 4,
          color: '#4ade80',
        });
      }
      audio.playAttack(false, 'HEAL');
    } else if (skillType === SkillType.BERSERK) {
      // 攻速+50%，攻击力+30%
      setUnits(prevUnits => {
        return prevUnits.map(unit => {
          if (unit.side === 'player' && unit.stats.hp > 0 && affectedUnits.includes(unit.id)) {
            return {
              ...unit,
              stats: {
                ...unit.stats,
                attack: unit.stats.attack * 1.3,
                speed: unit.stats.speed * 1.3,
              }
            };
          }
          return unit;
        });
      });
      // 添加红色狂暴粒子效果
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 60;
        effectsRef.current.push({
          id: uuidv4(),
          x: x + Math.cos(angle) * Math.random() * config.range,
          y: y + Math.sin(angle) * Math.random() * config.range,
          type: 'skill_berserk',
          life: 1.2,
          vx: Math.cos(angle) * speed,
          vy: -30 - Math.random() * 20,
          size: 4 + Math.random() * 5,
          color: '#ef4444',
        });
      }
      audio.playAttack(false, 'BERSERK');
    } else if (skillType === SkillType.METEOR) {
      // 对敌人造成40点伤害
      setUnits(prevUnits => {
        return prevUnits.map(unit => {
          if (unit.side === 'enemy' && unit.stats.hp > 0 && affectedUnits.includes(unit.id)) {
            return {
              ...unit,
              stats: {
                ...unit.stats,
                hp: Math.max(0, unit.stats.hp - 40)
              }
            };
          }
          return unit;
        });
      });
      // 添加陨石粒子效果
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 80;
        effectsRef.current.push({
          id: uuidv4(),
          x: x + Math.cos(angle) * Math.random() * config.range * 0.5,
          y: y + Math.sin(angle) * Math.random() * config.range * 0.5,
          type: 'skill_meteor',
          life: 1.0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 20,
          size: 5 + Math.random() * 6,
          color: '#f97316',
        });
      }
      audio.playAttack(false, 'METEOR');
    }
  }, [units, skillCooldowns]);

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
      } else if (e.type === 'skill_heal' || e.type === 'skill_berserk' || e.type === 'skill_meteor') {
        // 技能粒子效果
        ctx.globalAlpha = Math.max(0, e.life / 1.5) * 0.8;
        ctx.fillStyle = e.color || '#ffffff';
        const sz = e.size || 4;
        
        // 绘制圆形粒子
        ctx.beginPath();
        ctx.arc(e.x, e.y, sz / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加发光效果
        ctx.globalAlpha = Math.max(0, e.life / 1.5) * 0.3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, sz, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });

    // 绘制烟雾粒子
    smokeParticlesRef.current.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.4;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, 'rgba(150, 150, 150, 0.8)');
      gradient.addColorStop(0.5, 'rgba(100, 100, 100, 0.4)');
      gradient.addColorStop(1, 'rgba(80, 80, 80, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 绘制技能效果 - 魔法符文风格
    activeSkills.forEach(skill => {
      const elapsed = (Date.now() - skill.startTime) / 1000;
      const progress = skill.duration > 0 ? elapsed / skill.duration : 1;
      const alpha = Math.max(0, 1 - progress);
      const pulseScale = 1 + Math.sin(elapsed * 8) * 0.05;
      
      ctx.save();
      ctx.translate(skill.x, skill.y);
      
      if (skill.type === SkillType.HEAL) {
        // 绿色生命符文 - 旋转的魔法阵
        const rotation = elapsed * 2;
        
        // 外圈光环
        ctx.globalAlpha = alpha * 0.4;
        const outerGrad = ctx.createRadialGradient(0, 0, skill.range * 0.7, 0, 0, skill.range);
        outerGrad.addColorStop(0, 'rgba(34, 197, 94, 0)');
        outerGrad.addColorStop(0.5, 'rgba(34, 197, 94, 0.15)');
        outerGrad.addColorStop(1, 'rgba(34, 197, 94, 0.3)');
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, skill.range * pulseScale, 0, Math.PI * 2);
        ctx.fill();
        
        // 旋转的符文环
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + rotation;
          const x = Math.cos(angle) * skill.range * 0.85;
          const y = Math.sin(angle) * skill.range * 0.85;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // 内圈六芒星
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = 'rgba(134, 239, 172, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const angle1 = (i / 3) * Math.PI * 2 - rotation * 0.5;
          const angle2 = ((i + 1.5) / 3) * Math.PI * 2 - rotation * 0.5;
          ctx.moveTo(Math.cos(angle1) * skill.range * 0.5, Math.sin(angle1) * skill.range * 0.5);
          ctx.lineTo(Math.cos(angle2) * skill.range * 0.5, Math.sin(angle2) * skill.range * 0.5);
        }
        ctx.stroke();
        
        // 中心光点
        ctx.globalAlpha = alpha * 0.9;
        const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, skill.range * 0.2);
        centerGrad.addColorStop(0, 'rgba(187, 247, 208, 0.8)');
        centerGrad.addColorStop(1, 'rgba(187, 247, 208, 0)');
        ctx.fillStyle = centerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, skill.range * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
      } else if (skill.type === SkillType.BERSERK) {
        // 红色烈焰符文 - 燃烧的火焰环
        const rotation = -elapsed * 3;
        
        // 外圈火焰光环
        ctx.globalAlpha = alpha * 0.5;
        const outerGrad = ctx.createRadialGradient(0, 0, skill.range * 0.5, 0, 0, skill.range);
        outerGrad.addColorStop(0, 'rgba(239, 68, 68, 0.1)');
        outerGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.25)');
        outerGrad.addColorStop(1, 'rgba(220, 38, 38, 0.4)');
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, skill.range * pulseScale, 0, Math.PI * 2);
        ctx.fill();
        
        // 锯齿火焰环
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const spikes = 12;
        for (let i = 0; i <= spikes; i++) {
          const angle = (i / spikes) * Math.PI * 2 + rotation;
          const innerR = skill.range * 0.75;
          const outerR = skill.range * 0.9;
          const r = i % 2 === 0 ? outerR : innerR;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // 内圈旋转符文
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = 'rgba(252, 165, 165, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + rotation * 1.5;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * skill.range * 0.6, Math.sin(angle) * skill.range * 0.6);
        }
        ctx.stroke();
        
        // 中心烈焰核心
        ctx.globalAlpha = alpha * 0.8;
        const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, skill.range * 0.25);
        centerGrad.addColorStop(0, 'rgba(254, 202, 202, 0.9)');
        centerGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.5)');
        centerGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = centerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, skill.range * 0.25, 0, Math.PI * 2);
        ctx.fill();
        
      } else if (skill.type === SkillType.METEOR) {
        // 橙色陨石符文 - 坠落的陨石轨迹
        
        // 冲击波光环
        ctx.globalAlpha = alpha * 0.6;
        const shockGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, skill.range);
        shockGrad.addColorStop(0, 'rgba(251, 146, 60, 0.3)');
        shockGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.2)');
        shockGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = shockGrad;
        ctx.beginPath();
        ctx.arc(0, 0, skill.range * (1 + progress * 0.3), 0, Math.PI * 2);
        ctx.fill();
        
        // 裂纹地面效果
        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.6)';
        ctx.lineWidth = 2;
        const cracks = 8;
        for (let i = 0; i < cracks; i++) {
          const angle = (i / cracks) * Math.PI * 2 + (i % 2) * 0.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          const len = skill.range * (0.6 + Math.random() * 0.3);
          ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
          ctx.stroke();
        }
        
        // 外圈陨石环
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = 'rgba(253, 186, 116, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, skill.range * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        
        // 中心陨石撞击点
        ctx.globalAlpha = alpha * 0.9;
        const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, skill.range * 0.3);
        centerGrad.addColorStop(0, 'rgba(255, 237, 213, 1)');
        centerGrad.addColorStop(0.3, 'rgba(251, 146, 60, 0.8)');
        centerGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = centerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, skill.range * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });

    // 绘制拖动中的技能范围指示器 - 优化版
    if (draggingSkill) {
      const config = SKILL_CONFIGS[draggingSkill];
      const time = Date.now() / 1000;
      const pulseAlpha = 0.3 + Math.sin(time * 6) * 0.1;
      
      ctx.save();
      ctx.translate(dragPosition.x, dragPosition.y);
      
      // 外圈脉冲
      ctx.globalAlpha = pulseAlpha * 0.5;
      let indicatorColor = 'rgba(255, 255, 255';
      if (draggingSkill === SkillType.HEAL) indicatorColor = 'rgba(74, 222, 128';
      else if (draggingSkill === SkillType.BERSERK) indicatorColor = 'rgba(248, 113, 113';
      else if (draggingSkill === SkillType.METEOR) indicatorColor = 'rgba(251, 146, 60';
      
      ctx.fillStyle = indicatorColor + ', 0.15)';
      ctx.beginPath();
      ctx.arc(0, 0, config.range * 1.1, 0, Math.PI * 2);
      ctx.fill();
      
      // 主圆环
      ctx.globalAlpha = pulseAlpha * 0.8;
      ctx.strokeStyle = indicatorColor + ', 0.8)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 4]);
      ctx.lineDashOffset = -time * 30;
      ctx.beginPath();
      ctx.arc(0, 0, config.range, 0, Math.PI * 2);
      ctx.stroke();
      
      // 内圈填充
      ctx.globalAlpha = pulseAlpha * 0.2;
      ctx.fillStyle = indicatorColor + ', 0.3)';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, config.range, 0, Math.PI * 2);
      ctx.fill();
      
      // 中心点
      ctx.globalAlpha = pulseAlpha;
      ctx.fillStyle = indicatorColor + ', 1)';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }

  }, [units, countdown, isGameOver, activeSkills, draggingSkill, dragPosition]);

  const getSkillQuantity = (type: SkillType) => {
    const skill = skills.find(s => s.type === type);
    return skill ? skill.quantity : 0;
  };

  const handleMouseDown = (e: React.MouseEvent, skillType: SkillType) => {
    if (getSkillQuantity(skillType) <= 0 || skillCooldowns[skillType] > 0 || countdown > 0 || isGameOver) return;
    setDraggingSkill(skillType);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragPosition({
        x: (e.clientX - rect.left) * (800 / rect.width),
        y: (e.clientY - rect.top) * (400 / rect.height)
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingSkill) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragPosition({
        x: (e.clientX - rect.left) * (800 / rect.width),
        y: (e.clientY - rect.top) * (400 / rect.height)
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!draggingSkill) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left) * (800 / rect.width);
      const y = (e.clientY - rect.top) * (400 / rect.height);
      
      // 检查是否在战场范围内
      if (x >= 0 && x <= 800 && y >= 0 && y <= 400) {
        handleSkillRelease(draggingSkill, x, y);
        // 通知父组件减少技能数量
        onUseSkill(draggingSkill);
      }
    }
    setDraggingSkill(null);
  };

  return (
    <div className="flex items-center gap-4 z-10 w-full max-w-4xl px-4">
      {/* 左侧战场 */}
      <div className="flex flex-col items-center gap-4 flex-1">
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
        
        <div 
          className="relative w-full shadow-2xl rounded-lg overflow-hidden border-2 border-slate-700"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setDraggingSkill(null)}
        >
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

      {/* 右侧技能栏 */}
      <div className="flex flex-col gap-3 p-3 bg-slate-800/80 border border-slate-600 rounded-lg">
        <h3 className="text-xs text-yellow-400 font-bold text-center">技能</h3>
        {Object.values(SKILL_CONFIGS).map(config => {
          const quantity = getSkillQuantity(config.type);
          const cooldown = skillCooldowns[config.type];
          const isAvailable = quantity > 0 && cooldown <= 0 && countdown === 0 && !isGameOver;
          
          return (
            <div 
              key={config.type}
              className={`relative w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isAvailable 
                  ? 'border-yellow-400 bg-yellow-400/20 hover:bg-yellow-400/30' 
                  : 'border-slate-600 bg-slate-700/50 opacity-50'
              }`}
              onMouseDown={(e) => handleMouseDown(e, config.type)}
            >
              <span className="text-lg font-bold">
                {config.type === SkillType.HEAL ? '🟢' : config.type === SkillType.BERSERK ? '🔴' : '🟠'}
              </span>
              <span className="text-[10px] text-white font-bold">{quantity}</span>
              {cooldown > 0 && (
                <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-white font-bold">{Math.ceil(cooldown)}s</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Battlefield;
