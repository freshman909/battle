# 技能系统设计方案

## 目标
建立一套完整的技能系统，玩家可以在兵工厂购买技能卡，在战斗中拖动技能到战场释放，形成圆形区域效果。

## 数据来源
Excel 文件：`e:\1\个人作品集\游戏制作\battle\士兵数据配置.xlsx`
技能数据（第6-9行）：

| 技能名称 | 效果 | 范围 | 价格（钻石） |
|----------|------|------|-------------|
| 恢复药剂 | 立即恢复30%最大生命值，每秒恢复2%，持续5秒 | 100像素 | 50 |
| 狂暴药剂 | 攻速+50%，攻击力+30%，持续5秒 | 100像素 | 75 |
| 陨石药剂 | 对范围内敌人造成10点伤害 | 100像素 | 100 |

## 系统架构

### 1. 数据层

#### 新增类型定义 (types.ts)
```typescript
export enum SkillType {
  HEAL = 'HEAL',      // 恢复药剂
  BERSERK = 'BERSERK', // 狂暴药剂
  METEOR = 'METEOR'   // 陨石药剂
}

export interface SkillConfig {
  type: SkillType;
  name: string;
  description: string;
  range: number;      // 作用范围（像素）
  cost: number;       // 价格（钻石）
  effect: string;     // 效果描述
  duration: number;   // 持续时间（秒）
  cooldown: number;   // 冷却时间（秒）
}

export interface SkillCard {
  config: SkillConfig;
  quantity: number;   // 持有数量
  cooldownEnd: number; // 冷却结束时间
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
}
```

#### 更新 GameState (types.ts)
```typescript
export interface GameState {
  // ... 现有字段
  skills: SkillCard[];  // 玩家拥有的技能
}
```

### 2. 配置层 (constants.ts)

```typescript
export const SKILL_CONFIGS: Record<SkillType, SkillConfig> = {
  [SkillType.HEAL]: {
    type: SkillType.HEAL,
    name: '恢复药剂',
    description: '立即恢复30%最大生命值，每秒恢复2%，持续5秒',
    range: 100,
    cost: 50,
    effect: 'heal',
    duration: 5,
    cooldown: 10,
  },
  [SkillType.BERSERK]: {
    type: SkillType.BERSERK,
    name: '狂暴药剂',
    description: '攻速+50%，攻击力+30%，持续5秒',
    range: 100,
    cost: 75,
    effect: 'buff',
    duration: 5,
    cooldown: 15,
  },
  [SkillType.METEOR]: {
    type: SkillType.METEOR,
    name: '陨石药剂',
    description: '对范围内敌人造成10点伤害',
    range: 100,
    cost: 100,
    effect: 'damage',
    duration: 0,
    cooldown: 20,
  },
};
```

### 3. 兵工厂界面扩展 (UpgradeMenu.tsx)

#### 新增技能购买区域
- 在现有升级选项下方添加"技能商店"区域
- 每个技能显示：名称、效果、范围、价格、持有数量
- 购买按钮：消耗钻石增加技能持有数量

#### 界面布局
```
┌─────────────────────────┐
│  军械库        💎 500   │
├─────────────────────────┤
│  攻击强度  +5    [购买] │
│  生命上限  +3    [购买] │
│  初始步数  +2    [购买] │
├─────────────────────────┤
│  技能商店               │
│  ┌───────────────────┐  │
│  │ 恢复药剂  💎50    │  │
│  │ 立即恢复30%生命   │  │
│  │ 范围: 100px       │  │
│  │ 持有: 3    [购买] │  │
│  ├───────────────────┤  │
│  │ 狂暴药剂  💎75    │  │
│  │ 攻速+50% 攻击+30% │  │
│  │ 范围: 100px       │  │
│  │ 持有: 1    [购买] │  │
│  ├───────────────────┤  │
│  │ 陨石药剂  💎100   │  │
│  │ 造成10点伤害      │  │
│  │ 范围: 100px       │  │
│  │ 持有: 0    [购买] │  │
│  └───────────────────┘  │
├─────────────────────────┤
│      [返回结算]         │
└─────────────────────────┘
```

### 4. 战斗界面技能栏 (Battlefield.tsx)

#### 右侧技能栏设计
- 位置：战场右侧（Canvas 外部）
- 宽度：80px
- 背景：半透明黑色
- 每个技能卡：60x60px，显示技能图标和剩余数量

#### 交互流程
1. **鼠标按下**：在技能卡上按下，生成一个跟随鼠标的圆形范围指示器
2. **拖动**：移动鼠标，圆形指示器跟随，显示作用范围
3. **鼠标释放**：
   - 如果在战场范围内：释放技能，消耗1个技能卡
   - 如果在战场范围外：取消释放，技能卡不消耗

#### 技能效果实现

**恢复药剂 (HEAL)**
- 立即效果：范围内友军恢复 30% 最大生命值
- 持续效果：每秒恢复 2% 最大生命值，持续 5 秒
- 视觉：绿色圆形区域，向上飘绿色粒子

**狂暴药剂 (BERSERK)**
- 立即效果：范围内友军攻速 +50%，攻击力 +30%
- 持续效果：持续 5 秒
- 视觉：红色圆形区域，士兵身上红色光环

**陨石药剂 (METEOR)**
- 立即效果：范围内敌人受到 10 点伤害
- 视觉：橙色圆形区域，从天而降的陨石动画

### 5. 技能效果管理

#### 状态管理
```typescript
// Battlefield.tsx 中新增
const [activeSkills, setActiveSkills] = useState<ActiveSkillEffect[]>([]);
const [skillCooldowns, setSkillCooldowns] = useState<Record<SkillType, number>>({});
```

#### 更新循环
```typescript
// 每帧更新技能效果
activeSkills.forEach(skill => {
  const elapsed = (Date.now() - skill.startTime) / 1000;
  if (elapsed > skill.duration) {
    // 技能结束，移除效果
    removeSkillEffect(skill);
  } else {
    // 应用持续效果
    applySkillEffect(skill, elapsed);
  }
});
```

#### 渲染
```typescript
// 在 Canvas 上绘制技能效果
activeSkills.forEach(skill => {
  ctx.beginPath();
  ctx.arc(skill.x, skill.y, skill.range, 0, Math.PI * 2);
  ctx.fillStyle = getSkillColor(skill.type, alpha);
  ctx.fill();
});
```

### 6. 文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `types.ts` | 添加 SkillType, SkillConfig, SkillCard, ActiveSkillEffect 类型 |
| `constants.ts` | 添加 SKILL_CONFIGS 配置 |
| `App.tsx` | 在 GameState 中添加 skills 字段，处理技能购买逻辑 |
| `UpgradeMenu.tsx` | 添加技能商店界面，技能购买功能 |
| `Battlefield.tsx` | 添加右侧技能栏，拖动释放逻辑，技能效果渲染 |
| `Battlefield.tsx` | 添加技能效果更新逻辑（恢复、狂暴、伤害） |

### 7. 实施步骤

#### 步骤 1：数据层准备
1. 在 `types.ts` 中添加技能相关类型
2. 在 `constants.ts` 中添加技能配置
3. 更新 `GameState` 接口，添加 `skills` 字段

#### 步骤 2：兵工厂扩展
1. 修改 `UpgradeMenu.tsx`，添加技能商店区域
2. 实现技能购买逻辑
3. 更新 `App.tsx`，处理技能购买状态更新

#### 步骤 3：战斗界面技能栏
1. 修改 `Battlefield.tsx`，在右侧添加技能栏
2. 实现技能卡渲染（图标、数量）
3. 实现鼠标拖动逻辑

#### 步骤 4：技能释放逻辑
1. 实现鼠标按下生成圆形指示器
2. 实现鼠标拖动更新指示器位置
3. 实现鼠标释放判断是否在战场内
4. 实现技能效果应用

#### 步骤 5：技能效果实现
1. 恢复药剂：立即恢复 + 持续恢复
2. 狂暴药剂：攻速和攻击力 Buff
3. 陨石药剂：范围伤害

#### 步骤 6：视觉效果
1. 圆形区域渲染（不同颜色）
2. 粒子效果（恢复绿色、狂暴红色、陨石橙色）
3. 技能冷却显示

#### 步骤 7：TypeScript 编译验证
- 运行 `npx tsc --noEmit` 确保无类型错误

### 8. 注意事项

1. **性能**：技能效果使用对象池，避免频繁创建/销毁
2. **平衡**：技能价格可能需要根据游戏进度调整
3. **兼容性**：确保技能系统不影响现有战斗逻辑
4. **视觉反馈**：技能释放时需要有明显的视觉和音效反馈
