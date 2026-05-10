
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
}
