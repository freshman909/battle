# 战场美化与士兵边界/形象修复计划

## 问题分析

### 问题 1：士兵活动范围无限制
- **现状**：X 轴只在弓箭手逃跑时有 `Math.max(20, Math.min(780, ...))` 限制，Y 轴仅在弓箭手有 `Math.max(40, Math.min(360, ...))` 限制
- **其他移动路径**（第 328-336 行、343-351 行、363-371 行）**完全没有边界检查**
- **结果**：士兵会跑出画布可视区域

### 问题 2：战场下半部分视觉问题
- **虚线**：第 1389-1397 行绘制了中线虚线分隔，用户不想要
- **沙漠波浪线**：第 1358-1370 行的 16 条正弦波浪线太规则、太假

### 问题 3：英雄形象问题
- **头身空隙**：
  - 身体顶部在 `y = -8s + bobOffset = -24`（s=3）
  - 头盔底部在 `y = -18s + 8s = -10s = -30`
  - 中间有 **6px（即 18 像素）的空隙**
  - 根因：头部起始位置 `-18s` 太高，与身体顶部 `-8s` 不衔接
- **展示页面英雄太大**：UnitShowcase.tsx 第 126 行对所有兵种统一使用 `scale=3`，英雄 3×3=9 倍像素面积超出展示框（200×200 画布，中心 100,110）

---

## 修复步骤

### Step 1: 添加士兵活动范围边界限制
**文件**: `components/Battlefield.tsx`

在所有移动逻辑之后统一添加边界 clamp：

1. **定义边界常量**（在第 57 行后添加）:
```typescript
const BATTLE_MARGIN_X = 25;   // 左右边距
const BATTLE_MARGIN_TOP = height * 0.2 + 20;  // 上边距（沙地内）
const BATTLE_MARGIN_BOTTOM = 30; // 下边距
```

2. **在 3 个移动分支末尾分别添加 clamp**:
   - 第 300-301 行（弓箭手逃跑）：已有，保持不变
   - 第 336-337 行后（快速接近）：添加 `unit.y = Math.max(BATTLE_MARGIN_TOP, Math.min(height - BATTLE_MARGIN_BOTTOM, unit.y));`
   - 第 351-352 行后（缓慢调整）：同上
   - 第 371-372 行后（近战接近）：同上

### Step 2: 美化战场下半部分
**文件**: `components/Battlefield.tsx`

1. **删除虚线**（第 1389-1397 行）：直接删除整个中线虚线代码块

2. **改善沙漠纹理**（替换第 1358-1370 行）:
   - 将 16 条规则波浪线替换为更自然的方案：
     - 减少到 6-8 条线
     - 使用更大的振幅和更低频率
     - 添加随机偏移打破规律性
     - 降低透明度使其更微妙
     - 可选：用细小的随机点/短线代替连续波浪

### Step 3: 修复英雄头身空隙
**文件**: `utils/unitDrawer.ts`

修改 `drawMiniHero` 函数中的头部位置（第 758-767 行）:

- **当前**: 头部起始 `y = -18s`（=-54），身体顶部 `y = -8s`（=-24），空隙 30px
- **修复**: 将头部整体下移，使头盔底部紧贴身体顶部
  - 头盔主体：`-18s` → `-14s`（从 -54 到 -42）
  - 头盔中层：`-22s` → `-17s`
  - 头盔顶层：`-25s` → `-20s`
  - 头盔尖端：`-27s` → `-23s`
  - 脸部：`-13s` → `-10s`（从 -39 到 -30，紧贴身体顶部 -24）
  - 羽饰、护鼻等相应下移

### Step 4: 修复展示页面英雄大小
**文件**: `components\UnitShowcase.tsx`

修改第 124-127 行的绘制逻辑:

- **当前**: 所有兵种统一 `scale=3`
- **修复**: 英雄使用较小缩放，普通兵种保持 3
```typescript
// 当前
drawUnitOnCanvas(ctx, current, 100, 110 + floatOffset, 3);

// 修复后
const scale = current === UnitType.HERO ? 2 : 3;
const heroOffsetY = current === UnitType.HERO ? 125 : 110; // 英雄稍靠下
drawUnitOnCanvas(ctx, current, 100, heroOffsetY + floatOffset, scale);
```

同时调整阴影大小以匹配：
```typescript
const shadowRx = current === UnitType.HERO ? 18 : 24;
const shadowRy = current === UnitType.HERO ? 7 : 9;
ctx.beginPath();
ctx.ellipse(100, 118, shadowRx, shadowRy, 0, 0, Math.PI * 2);
```

---

## 验证清单
- [ ] 士兵不会跑出画布左右边界（X 在 25~775 范围内）
- [ ] 士兵不会跑出画布上下边界（Y 在沙地区域内）
- [ ] 战场中间没有虚线
- [ ] 沙漠纹理看起来自然（不明显是规则的波浪线）
- [ ] 英雄的头和身体之间没有明显空隙
- [ ] 展示页面中英雄不会超出 200×200 展示框
- [ ] 普通兵种在展示页面中的大小不受影响
