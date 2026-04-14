
import { UnitType, UnitStats } from './types';

export const GRID_SIZE = 4;
export const INITIAL_MOVES = 10;
export const DIAMOND_REWARD_PER_LEVEL = 50;

export const UNIT_CONFIGS: Record<UnitType, UnitStats> = {
  [UnitType.ARCHER]: {
    hp: 35,
    maxHp: 35,
    attack: 12,
    range: 250,
    speed: 1.0, 
    defense: 0.1,
  },
  [UnitType.SWORDSMAN]: {
    hp: 180,
    maxHp: 180,
    attack: 6,
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
  [UnitType.BLANK]: '#ffffff',
};

/**
 * 士兵素材配置区
 * 请在此处填入您的图片 URL 或 Base64 字符串
 */
export const UNIT_ASSETS: Record<UnitType, { idle?: string; walk?: string; attack?: string }> = {
  [UnitType.SWORDSMAN]: {
    idle: "",   // 剑盾兵-静止
    walk: "",   // 剑盾兵-左右移动
    attack: ""  // 剑盾兵-攻击
  },
  [UnitType.ARCHER]: {
    idle: "",   // 弓箭手-静止
    walk: "",   // 弓箭手-移动
    attack: ""  // 弓箭手-攻击
  },
  [UnitType.SPEARMAN]: {
    idle: "",   // 矛兵-静止
    walk: "",   // 矛兵-移动 (含冲锋)
    attack: ""  // 矛兵-攻击
  },
  [UnitType.BLANK]: {}
};

export const UPGRADE_COSTS = {
  attack: 100,
  hp: 100,
  moves: 150,
};
