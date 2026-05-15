# 更新士兵攻击逻辑计划

## 目标
根据 `士兵数据配置.xlsx` 最新数据，修改剑盾兵、弓箭手、骑兵的攻击逻辑。

## 数据来源
Excel 文件：`e:\1\个人作品集\游戏制作\battle\士兵数据配置.xlsx`
JSON 缓存：`e:\1\个人作品集\游戏制作\battle\units.json`

## 当前攻击逻辑 vs Excel 配置

### 1. 剑盾兵 (SWORDSMAN)

**Excel 配置：**
- 攻击范围：30 像素
- 攻击速度：1 秒/次
- 目标选择：优先攻击距离自己最近的敌人
- 特殊技能 - 协同防御：周围每有1个己方单位（100px内），防御力和攻击力+3%
- 特殊技能 - 保护弓箭手：100px范围内有弓箭手时，为该范围内所有弓箭手抵挡1%伤害

**当前代码问题：**
- 缺少"协同防御"加成逻辑
- 缺少"保护弓箭手"伤害分担逻辑
- 攻击冷却时间使用全局 `ATTACK_COOLDOWN = 1.2s`，应改为 1.0s

**修改方案：**
1. 在 `Battlefield.tsx` 的 update 循环中，为剑盾兵添加协同防御计算
2. 添加保护弓箭手的伤害分担逻辑
3. 修改攻击冷却时间为 1.0 秒

### 2. 弓箭手 (ARCHER)

**Excel 配置：**
- 攻击范围：250 像素
- 攻击速度：0.5 秒/次
- 目标选择：优先攻击血量最低的敌人
- 特殊行为 - 寻掩护：有友方剑盾兵时，优先躲在剑盾兵后攻击
- 特殊行为 - 保持距离：无剑盾兵时，敌我距离 75~250px 才攻击；≤75px 时会向四周远离敌人（优先远离墙壁方向）

**当前代码问题：**
- 攻击冷却时间使用全局 `ATTACK_COOLDOWN = 1.2s`，应改为 0.5s
- 寻掩护逻辑已部分实现，但缺少"优先躲在剑盾兵后"的精确位置计算
- 保持距离逻辑已部分实现，但缺少"优先远离墙壁"的方向选择

**修改方案：**
1. 修改攻击冷却时间为 0.5 秒
2. 优化寻掩护逻辑：计算剑盾兵后方安全位置
3. 优化远离逻辑：添加墙壁检测，优先选择远离墙壁的方向

### 3. 骑兵 (CAVALRY)

**Excel 配置：**
- 攻击范围：30 像素（路径伤害）
- 攻击速度：0.7 秒/次
- 目标选择：优先血量最低的敌人
- 核心机制 - 奔跑值系统：
  - 开局奔跑值 = 100
  - 每 10 点奔跑值增加 0.1 像素/秒移动速度
  - 奔跑值 > 50：可对敌人进行冲锋攻击
  - 冲锋后奔跑值降为 10
  - 奔跑值 ≤ 50：无法近战，需远离敌人积累奔跑值
- 特殊技能 - 冲锋击退：冲锋路径上的敌人会被击退，最终撞击目标敌人并将其击退
- 特殊技能 - 开局冲锋：开局直接冲锋到敌方后排

**当前代码问题：**
- 奔跑值系统已部分实现，但缺少"每10点增加0.1像素/秒"的速度加成
- 冲锋后奔跑值降为10，但当前代码只降到10（正确）
- 缺少"开局直接冲锋到敌方后排"的逻辑
- 攻击冷却时间未单独设置

**修改方案：**
1. 添加奔跑值对移动速度的影响：每10点增加0.1像素/秒
2. 实现开局冲锋逻辑：开局时直接冲锋到敌方后排
3. 修改攻击冷却时间为 0.7 秒
4. 优化冲锋路径上的击退效果

## 实施步骤

### 步骤 1：读取 Excel 数据并更新 units.json
- 使用 excel-reader 技能读取最新数据
- 确保 units.json 与 Excel 同步

### 步骤 2：修改 Battlefield.tsx 的攻击逻辑

#### 2.1 添加兵种特定的攻击冷却时间
```typescript
const getAttackCooldown = (unitType: UnitType) => {
  switch(unitType) {
    case UnitType.SWORDSMAN: return 1.0;
    case UnitType.ARCHER: return 0.5;
    case UnitType.CAVALRY: return 0.7;
    case UnitType.SPEARMAN: return 0.5;
    default: return 1.2;
  }
};
```

#### 2.2 实现剑盾兵协同防御逻辑
在 update 循环中，为每个剑盾兵计算周围友军数量，动态调整属性：
```typescript
if (unit.type === UnitType.SWORDSMAN) {
  const nearbyAllies = newUnits.filter(u => 
    u.side === unit.side && u.id !== unit.id && dist(u.x, u.y, unit.x, unit.y) < 100
  );
  const buffMultiplier = 1 + nearbyAllies.length * 0.03;
  // 应用到攻击和防御
}
```

#### 2.3 实现剑盾兵保护弓箭手逻辑
当剑盾兵 100px 范围内有弓箭手时，为弓箭手分担 1% 伤害：
```typescript
// 在伤害计算时，检查是否有剑盾兵保护
const protectingShields = newUnits.filter(u => 
  u.type === UnitType.SWORDSMAN && u.side === target.side && 
  dist(u.x, u.y, target.x, target.y) < 100
);
if (protectingShields.length > 0 && target.type === UnitType.ARCHER) {
  // 分担 1% 伤害给每个保护的剑盾兵
}
```

#### 2.4 优化弓箭手寻掩护逻辑
```typescript
// 计算剑盾兵后方安全位置
const getSafePositionBehindShield = (archer: Unit, shield: Unit) => {
  const dx = shield.x - archer.x;
  const dy = shield.y - archer.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  // 在剑盾兵后方 50px 处
  return {
    x: shield.x + (dx/dist) * 50,
    y: shield.y + (dy/dist) * 50
  };
};
```

#### 2.5 优化弓箭手远离墙壁逻辑
```typescript
// 优先选择远离墙壁的方向
const getFleeDirection = (unit: Unit, target: Unit) => {
  const angle = Math.atan2(unit.y - target.y, unit.x - target.x);
  // 检查墙壁距离，优先远离墙壁
  const wallDistLeft = unit.x;
  const wallDistRight = 800 - unit.x;
  // 调整角度以远离最近的墙壁
};
```

#### 2.6 实现骑兵奔跑值速度加成
```typescript
if (unit.type === UnitType.CAVALRY && unit.chargeValue) {
  const speedBonus = (unit.chargeValue / 10) * 0.1;
  const totalSpeed = unit.stats.speed + speedBonus;
}
```

#### 2.7 实现骑兵开局冲锋逻辑
```typescript
// 在 initBattle 中，为骑兵设置初始冲锋状态
if (unit.type === UnitType.CAVALRY) {
  unit.isCharging = true;
  unit.chargeValue = 100;
}
```

### 步骤 3：更新士兵展示界面
- 更新 `UnitShowcase.tsx` 中的士兵描述，反映新的攻击逻辑

### 步骤 4：TypeScript 编译验证
- 运行 `npx tsc --noEmit` 确保无类型错误

### 步骤 5：测试验证
- 测试剑盾兵的协同防御和保护弓箭手效果
- 测试弓箭手的攻击频率和寻掩护逻辑
- 测试骑兵的奔跑值系统和开局冲锋

## 文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `Battlefield.tsx` | 修改攻击冷却时间、添加协同防御、保护弓箭手、奔跑值速度加成、开局冲锋 |
| `UnitShowcase.tsx` | 更新士兵描述 |
| `units.json` | 同步最新 Excel 数据 |

## 注意事项

1. **性能影响**：协同防御和保护弓箭手需要额外的距离计算，注意优化
2. **平衡性**：协同防御的 3% 加成可能叠加过高，需要测试调整
3. **兼容性**：确保修改不影响其他兵种（矛兵）的正常行为
