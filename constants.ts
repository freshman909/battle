
import { UnitType, UnitStats, SkillType, SkillConfig } from './types';
import unitsData from './units.json';

export const GRID_SIZE = 4;
export const INITIAL_MOVES = 10;
export const DIAMOND_REWARD_PER_LEVEL = 50;

// 从 units.json 读取士兵配置
function parseUnitStats(data: any): UnitStats {
  return {
    hp: data['生命值 (HP)'] || 0,
    maxHp: data['生命值 (HP)'] || 0,
    attack: data['攻击力 (ATK)'] || 0,
    range: data['攻击范围 (像素)'] || 0,
    speed: data['移动速度 (像素/秒)'] || 0,
    defense: data['防御力 (DEF)'] || 0,
  };
}

// 从 units.json 动态生成 UNIT_CONFIGS
export const UNIT_CONFIGS: Record<UnitType, UnitStats> = {
  [UnitType.SWORDSMAN]: parseUnitStats(unitsData.units['剑盾兵 (SWORDSMAN)']),
  [UnitType.ARCHER]: parseUnitStats(unitsData.units['弓箭手 (ARCHER)']),
  [UnitType.SPEARMAN]: parseUnitStats(unitsData.units['矛兵 (SPEARMAN)']),
  [UnitType.CAVALRY]: parseUnitStats(unitsData.units['骑兵']),
  [UnitType.BLANK]: parseUnitStats(unitsData.units['空位 (BLANK)']),
};

export const UNIT_COLORS: Record<UnitType, string> = {
  [UnitType.ARCHER]: '#4ade80',
  [UnitType.SWORDSMAN]: '#3b82f6',
  [UnitType.SPEARMAN]: '#a855f7',
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

// 从 units.json 读取技能配置
function parseSkillConfig(type: SkillType, data: any): SkillConfig {
  const effectText = data['效果'] || '';
  const rangeText = data['范围'] || '100像素';
  const cost = data['价格（钻石为单位）'] || 0;

  // 解析范围数值
  const rangeMatch = rangeText.match(/(\d+)/);
  const range = rangeMatch ? parseInt(rangeMatch[1]) : 100;

  // 根据效果文本判断技能类型和参数
  let effect = 'heal';
  let duration = 0;

  if (type === SkillType.HEAL) {
    effect = 'heal';
    duration = 5;
  } else if (type === SkillType.BERSERK) {
    effect = 'buff';
    duration = 5;
  } else if (type === SkillType.METEOR) {
    effect = 'damage';
    duration = 0;
  }

  return {
    type,
    name: type === SkillType.HEAL ? '恢复药剂' : type === SkillType.BERSERK ? '狂暴药剂' : '陨石药剂',
    description: effectText,
    range,
    cost,
    effect,
    duration,
    cooldown: type === SkillType.HEAL ? 10 : type === SkillType.BERSERK ? 15 : 20,
  };
}

// 从 units.json 动态生成 SKILL_CONFIGS
export const SKILL_CONFIGS: Record<SkillType, SkillConfig> = {
  [SkillType.HEAL]: parseSkillConfig(SkillType.HEAL, unitsData.skills['恢复药剂']),
  [SkillType.BERSERK]: parseSkillConfig(SkillType.BERSERK, unitsData.skills['狂暴药剂']),
  [SkillType.METEOR]: parseSkillConfig(SkillType.METEOR, unitsData.skills['陨石药剂']),
};
