
export enum UnitType {
  ARCHER = 'ARCHER',
  SWORDSMAN = 'SWORDSMAN',
  SPEARMAN = 'SPEARMAN',
  CAVALRY = 'CAVALRY',
  BLANK = 'BLANK'
}

export enum GamePhase {
  START = 'START',
  MATCH_THREE = 'MATCH_THREE',
  BATTLE = 'BATTLE',
  POST_BATTLE = 'POST_BATTLE',
  UPGRADE = 'UPGRADE',
  SHOWCASE = 'SHOWCASE',
  TEST_MODE = 'TEST_MODE'
}

export interface UnitStats {
  hp: number;
  attack: number;
  range: number;
  speed: number;
  maxHp: number;
  defense: number;
}

export interface BattleStats {
  dealt: Record<UnitType, number>;
  taken: Record<UnitType, number>;
}

export interface Unit {
  id: string;
  type: UnitType;
  side: 'player' | 'enemy';
  x: number;
  y: number;
  stats: UnitStats;
  isAttacking: boolean;
  targetId?: string;
  isCharging?: boolean;
  isInvulnerable?: boolean;
  attackTimer: number;
  facing: 'left' | 'right';
  walkPhase: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  stamina?: number;
  isRunning?: boolean;
  chargeValue?: number;
  _chargedThisPass?: boolean;
}

export interface Tile {
  id: string;
  type: UnitType;
  x: number;
  y: number;
}

export interface GameState {
  level: number;
  diamonds: number;
  score: number;
  movesRemaining: number;
  playerQueue: UnitType[];
  upgrades: {
    attackBonus: number;
    hpBonus: number;
    initialMoves: number;
  };
  lastBattleStats?: BattleStats;
  survivingUnits: UnitType[];
  lastVictory: boolean;
  skills: SkillCard[];
}

export interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export enum SkillType {
  HEAL = 'HEAL',
  BERSERK = 'BERSERK',
  METEOR = 'METEOR'
}

export interface SkillConfig {
  type: SkillType;
  name: string;
  description: string;
  range: number;
  cost: number;
  effect: string;
  duration: number;
  cooldown: number;
}

export interface SkillCard {
  type: SkillType;
  quantity: number;
}

export interface ActiveSkillEffect {
  id: string;
  type: SkillType;
  x: number;
  y: number;
  range: number;
  startTime: number;
  duration: number;
  affectedUnits: string[];
  originalStats?: Record<string, { attack: number; speed: number }>; // 用于狂暴效果结束时恢复属性
}
