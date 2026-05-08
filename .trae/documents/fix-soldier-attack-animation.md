# 士兵攻击逻辑与动画优化计划

## 问题诊断

### 核心问题
1. **士兵在攻击状态仍然摇摆** - 当前实现在 attacking 状态下，虽然设置了 `isMoving=false`，但绘制函数中仍有残留的摇晃动画
2. **攻击特性不明显** - 使用简单的布尔值切换，没有参考文件中的三段式攻击动画（前挥→保持→收回）
3. **状态切换不顺畅** - idle/moving/attacking 三个状态之间缺少平滑过渡
4. **无法边移动边攻击** - 当前状态机强制互斥

### 参考文件分析（剑盾兵.html）
参考实现的优秀设计：
- ✅ **攻击进度控制**：使用 `attackProgress` (0~1) 控制完整攻击周期
- ✅ **三段式攻击动画**：前挥(0→0.3) → 保持(0.3→0.6) → 收回(0.6→1.0)
- ✅ **状态分离**：攻击时不摇摆 (`isMoving && !isAttacking` 才摆动)
- ✅ **身体弹跳**：只在移动时有上下起伏 (`isMoving ? bobOffset : 0`)
- ✅ **腿部摆动**：只在行走时摆动 (`isMoving ? legSpread : 0`)
- ✅ **武器摆动**：移动时轻微摆动，攻击时完全停止摆动

## 解决方案

### 第一步：优化 Battlefield.tsx 的状态机逻辑

#### 1.1 重构三态行为状态机
**目标**：实现清晰的状态分离，允许"移动+攻击"同时进行

```typescript
// 新的状态机设计
if (dist > actualAttackRange * 1.5) {
  // 远距离：纯移动状态
  unit.state = 'moving';
  unit.isMoving = true;
  unit.isAttacking = false;
  // 快速接近目标
} else if (dist <= actualAttackRange) {
  // 在攻击范围内：可以边移动边攻击
  unit.isAttacking = true;  // 始终攻击
  unit.state = 'attacking';
  
  // 允许缓慢调整位置（边打边移）
  if (dist > actualAttackRange * 0.6) {
    unit.isMoving = true;   // 缓慢调整
    unit.state = 'moving-attacking';  // 新增混合状态
  } else {
    unit.isMoving = false;  // 站立攻击
  }
  
  // 更新攻击进度（循环）
  updateAttackProgress(unit, deltaTime);
}
```

#### 1.2 实现攻击进度循环
**目标**：参考剑盾兵.html的攻击动画时长（0.35s）和冷却（0.5s）

```typescript
// 攻击参数（参考剑盾兵.html）
const ATTACK_DURATION = 0.35;      // 攻击动画持续时间
const ATTACK_COOLDOWN_DURATION = 0.5; // 攻击冷却时间

function updateAttackProgress(unit: Unit, deltaTime: number) {
  if (!unit.isAttacking) return;
  
  // 如果正在攻击动画中
  if (unit.attackAnimationActive) {
    unit.attackProgress += deltaTime / ATTACK_DURATION;
    
    if (unit.attackProgress >= 1.0) {
      // 攻击动画完成，进入冷却
      unit.attackProgress = 0;
      unit.attackAnimationActive = false;
      unit.attackCooldownTimer = ATTACK_COOLDOWN_DURATION;
      
      // 触发伤害（在攻击动作的前半段命中）
      dealDamageToTarget(unit);
    }
  } else if (unit.attackCooldownTimer > 0) {
    // 冷却中
    unit.attackCooldownTimer -= deltaTime;
    if (unit.attackCooldownTimer <= 0) {
      // 冷却完成，开始新一轮攻击
      unit.attackAnimationActive = true;
      unit.attackProgress = 0;
    }
  }
}
```

#### 1.3 移除攻击状态的摇晃
**目标**：在 attacking 或 moving-attacking 状态下，不应用摇晃动画

```typescript
// 在 drawUnit 函数中
let yOffset = 0;
if (unit.state === 'idle') {
  // 只有idle状态才有呼吸摇晃
  yOffset = Math.sin(unit.idlePhase + currentTime * 0.003) * 2.5;
}
// moving/attacking/moving-attacking 状态都不摇晃！
ctx.translate(0, yOffset);
```

### 第二步：优化 unitDrawer.ts 的绘制函数

#### 2.1 为所有单位添加攻击进度动画
**目标**：参考剑盾兵.html的三段式武器旋转

##### 剑盾兵的武器动画（drawMiniSwordsman）：
```typescript
// 武器握持点
const gripX = 6;
const gripY = -3;

// 关键改进：只在非攻击状态才摆动
const swayOffset = (state === 'moving' && !isAttacking) 
  ? Math.sin(walkPhase + Math.PI * 0.7) * 1.5 
  : 0;

ctx.translate(gripX, gripY + swayOffset);

// 攻击时的旋转动画（参考剑盾兵.html 第859-874行）
let attackRotation = 0;
if (isAttacking && attackProgress !== undefined) {
  const p = attackProgress;
  if (p < 0.3) {
    // 前挥阶段：0 -> ~56度
    attackRotation = (p / 0.3) * 1.15;
  } else if (p < 0.6) {
    // 保持阶段：保持在最大角度
    attackRotation = 1.15;
  } else {
    // 收回阶段：56度 -> 0
    attackRotation = 1.15 * (1 - (p - 0.6) / 0.4);
  }
  attackRotation *= (Math.PI / 3.2); // 转换为弧度
}
ctx.rotate(attackRotation);
```

##### 矛兵的武器动画（drawMiniSpearman）：
```typescript
// 矛兵攻击：向前刺出
let spearThrust = 0;
if (isAttacking && attackProgress !== undefined) {
  const p = attackProgress;
  if (p < 0.4) {
    // 前刺阶段
    spearThrust = (p / 0.4) * 8;
  } else if (p < 0.7) {
    // 保持刺出
    spearThrust = 8;
  } else {
    // 收回
    spearThrust = 8 * (1 - (p - 0.7) / 0.3);
  }
}
ctx.translate(spearThrust, 0);
```

##### 弓箭手的武器动画（drawMiniArcher）：
```typescript
// 弓箭手攻击：拉弓射箭
let bowPull = 0;
if (isAttacking && attackProgress !== undefined) {
  const p = attackProgress;
  if (p < 0.5) {
    // 拉弓阶段
    bowPull = (p / 0.5) * 5;
  } else {
    // 松弦（快速）
    bowPull = 5 * (1 - (p - 0.5) / 0.5);
  }
}
// 弦拉到 bowPull 位置
```

##### 骑兵的武器动画（drawMiniCavalry）：
```typescript
// 骑兵攻击：长矛前冲
let cavalryThrust = 0;
if (isAttacking && attackProgress !== undefined) {
  const p = attackProgress;
  if (p < 0.3) {
    cavalryThrust = (p / 0.3) * 10;
  } else if (p < 0.6) {
    cavalryThrust = 10;
  } else {
    cavalryThrust = 10 * (1 - (p - 0.6) / 0.4);
  }
}
ctx.translate(cavalryThrust, 0);
```

##### 英雄的武器动画（drawMiniHero）：
```typescript
// 英雄巨剑攻击：大范围挥砍
let heroSwing = 0;
if (isAttacking && attackProgress !== undefined) {
  const t = attackProgress;
  if (t < 0.25) {
    // 举剑蓄力
    heroSwing = -(t / 0.25) * 0.8;
  } else if (t < 0.5) {
    // 向下劈砍（快速）
    heroSwing = -0.8 + ((t - 0.25) / 0.25) * 2.8;
  } else if (t < 0.75) {
    // 保持下劈
    heroSwing = 2.0;
  } else {
    // 收回
    heroSwing = 2.0 * (1 - (t - 0.75) / 0.25);
  }
}
ctx.rotate(-Math.PI / 6 + heroSwing);
```

#### 2.2 为所有单位添加状态感知的身体动画
**目标**：参考剑盾兵.html的身体弹跳和腿部摆动逻辑

```typescript
// 所有单位的通用改进
const drawUnitWithState = (ctx, type, team, isAttacking, walkPhase, attackProgress, isMoving, state) => {
  // 身体弹跳：只在移动时有
  const bobOffset = (state === 'moving' || state === 'moving-attacking')
    ? Math.abs(Math.cos(walkPhase)) * 2.5  // 参考剑盾兵.html的bobAmplitude
    : 0;
  
  // 腿部摆动：只在移动时有
  const legSwing = (state === 'moving' || state === 'moving-attacking')
    ? Math.sin(walkPhase) * (type === UnitType.CAVALRY ? 4 : 2)
    : 0;
  
  // 应用弹跳偏移到身体及以上模块
  ctx.save();
  ctx.translate(0, -bobOffset);
  
  // 绘制腿部（带摆动）、身体、头部、武器...
  
  ctx.restore(); // 恢复弹跳偏移
};
```

### 第三步：添加攻击粒子特效（可选增强）

**目标**：参考剑盾兵.html的第611-656行，为攻击命中添加火花粒子

```typescript
// 在攻击命中的瞬间生成粒子
if (shouldSpawnParticles) {
  spawnAttackParticles(weaponTipX, weaponTipY, facingRight);
}

function spawnAttackParticles(x, y, facingRight) {
  const count = 8 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const angle = (facingRight ? -0.6 : Math.PI + 0.6) + (Math.random() - 0.5) * 1.2;
    const speed = 60 + Math.random() * 180;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 40,
      life: 0.35 + Math.random() * 0.3,
      size: 1.5 + Math.random() * 3.5,
      color: Math.random() < 0.5 ? '#f8e8c0' : '#e8d090',
    });
  }
}
```

## 实施步骤

### 步骤 1：修改 Battlefield.tsx（预计改动 150 行）
- [ ] 1.1 添加新的状态常量（ATTACK_DURATION, ATTACK_COOLDOWN_DURATION）
- [ ] 1.2 在 Unit 接口中添加新字段（attackAnimationActive, attackCooldownTimer）
- [ ] 1.3 重构三态行为状态机（允许移动+攻击并存）
- [ ] 1.4 实现 updateAttackProgress 辅助函数
- [ ] 1.5 修改 drawUnit 函数，移除攻击状态的摇晃
- [ ] 1.6 初始化新字段（initBattle函数）

### 步骤 2：修改 unitDrawer.ts（预计改动 300 行）
- [ ] 2.1 修改 drawMiniSwordsman：添加三段式剑砍动画
- [ ] 2.2 修改 drawMiniSpearman：添加三段式矛刺动画
- [ ] 2.3 修改 drawMiniArcher：添加拉弓射箭动画
- [ ] 2.4 修改 drawMiniCavalry：添加骑兵冲锋动画
- [ ] 2.5 修改 drawMiniHero：优化巨剑挥砍动画
- [ ] 2.6 为所有单位添加状态感知的身体弹跳和腿部摆动
- [ ] 2.7 确保攻击时武器不摆动（`!isAttacking` 条件）

### 步骤 3：测试验证（预计 30 分钟）
- [ ] 3.1 验证 idle 状态：只有轻微呼吸摇晃，无腿部摆动
- [ ] 3.2 验证 moving 状态：有身体弹跳+腿部摆动+武器轻微摆动
- [ ] 3.3 验证 attacking 状态：无摇晃，只有明显的武器攻击动画
- [ ] 3.4 验证 moving-attacking 状态：有弹跳+腿部摆动，但武器只做攻击动作不摆动
- [ ] 3.5 验证攻击循环：每 0.85s 一次攻击（0.35s 动画 + 0.5s 冷却）

## 预期效果

### 改进前 ❌
- 士兵在攻击时左右摇晃，看起来像在跳舞
- 攻击动作只是简单的角度切换，缺乏力度感
- 只能看到一部分士兵有攻击反馈（可能是状态同步问题）
- 无法边移动边攻击

### 改进后 ✅
- **Idle 状态**：静止站立，只有轻微的呼吸动画（±2.5px）
- **Moving 状态**：身体上下弹跳（±2.5px），腿部交替摆动，武器轻微晃动
- **Attacking 状态**：**完全静止**（无摇晃），武器执行明显的三段式攻击动画
- **Moving+Attacking 混合状态**：有弹跳和腿部摆动，但武器专注执行攻击动作
- **攻击循环明显**：每 0.85s 一次完整的攻击动作，带有粒子特效
- **所有单位都有攻击反馈**：不再是简单的布尔切换，而是完整的进度动画

## 技术要点总结

### 核心原则（来自剑盾兵.html）
1. **状态分离**：移动动画和攻击动画必须完全解耦
2. **进度驱动**：使用 0~1 的进度值控制动画，而非布尔值
3. **三段式动画**：准备→执行→收回，符合物理直觉
4. **条件渲染**：`isMoving && !isAttacking` 才显示摆动
5. **身体分层**：阴影固定，腿/身/头整体弹跳，武器独立旋转

### 性能考虑
- 攻击进度计算每帧执行（轻量级数学运算）
- 粒子数量限制在 60 个以内（参考剑盾兵.html）
- 无额外 DOM 操作，纯 Canvas 渲染

## 文件修改清单

| 文件 | 改动类型 | 预计行数 |
|------|---------|---------|
| `Battlefield.tsx` | 重构状态机、添加攻击进度逻辑 | ~150 行修改 |
| `unitDrawer.ts` | 重构所有绘制函数、添加三段式动画 | ~300 行修改 |
| `types.ts` | 添加 2 个新字段到 Unit 接口 | ~5 行修改 |

**总计**：约 455 行代码修改/新增
