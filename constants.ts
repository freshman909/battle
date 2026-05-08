
import { UnitType, UnitStats } from './types';

export const GRID_SIZE = 4;
export const INITIAL_MOVES = 10;
export const DIAMOND_REWARD_PER_LEVEL = 50;

export const UNIT_CONFIGS: Record<UnitType, UnitStats> = {
  [UnitType.ARCHER]: {
    hp: 40,
    maxHp: 40,
    attack: 18,
    range: 250,
    speed: 1,
    defense: 0.1,
  },
  [UnitType.SWORDSMAN]: {
    hp: 180,
    maxHp: 180,
    attack: 8,
    range: 30,
    speed: 0.8,
    defense: 0.4,
  },
  [UnitType.SPEARMAN]: {
    hp: 80,
    maxHp: 80,
    attack: 22,
    range: 45,
    speed: 1.2,
    defense: 0.05,
  },
  [UnitType.CAVALRY]: {
    hp: 100,
    maxHp: 100,
    attack: 15,
    range: 30,
    speed: 1,
    defense: 0.2,
  },
  [UnitType.BLANK]: {
    hp: 0,
    maxHp: 0,
    attack: 0,
    range: 0,
    speed: 0,
    defense: 0,
  },
};

export const UNIT_COLORS: Record<UnitType, string> = {
  [UnitType.ARCHER]: '#60a5fa',
  [UnitType.SWORDSMAN]: '#4ade80',
  [UnitType.SPEARMAN]: '#f87171',
  [UnitType.CAVALRY]: '#fbbf24',
  [UnitType.BLANK]: '#ffffff',
};

/**
 * 士兵素材配置区
 * 请在此处填入您的图片 URL 或 Base64 字符串
 */
export const UNIT_ASSETS: Record<UnitType, { idle?: string; walk?: string; attack?: string }> = {
  [UnitType.SWORDSMAN]: {
    idle: "",
    walk: "",
    attack: ""
  },
  [UnitType.ARCHER]: {
    idle: "",
    walk: "",
    attack: ""
  },
  [UnitType.SPEARMAN]: {
    idle: "",
    walk: "",
    attack: ""
  },
  [UnitType.CAVALRY]: {
    idle: "",
    walk: "",
    attack: ""
  },
  [UnitType.BLANK]: {}
};

export const UPGRADE_COSTS = {
  attack: 100,
  hp: 100,
  moves: 150,
};
