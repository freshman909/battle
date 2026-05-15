/**
 * 商店绘制工具 - 魔法师售货员和商品图标
 * 风格：像素/手绘混合风格
 */

// 绘制魔法师售货员
export function drawWizard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number = 1,
  time: number = 0, // 用于呼吸动画
  isTalking: boolean = false // 是否正在说话（嘴巴动画）
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 呼吸动画 - 整体轻微上下浮动
  const breathOffset = Math.sin(time * 2) * 2;
  ctx.translate(0, breathOffset);

  // 身体轻微左右摆动（类似人类站立时的自然晃动）
  const swayAngle = Math.sin(time * 1.5) * 0.02;
  ctx.rotate(swayAngle);

  // === 绘制魔法师 ===

  // 长袍下摆（紫色）
  ctx.fillStyle = '#6b21a8';
  ctx.beginPath();
  ctx.moveTo(-25, 80);
  ctx.lineTo(-30, 120);
  ctx.lineTo(30, 120);
  ctx.lineTo(25, 80);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4c1d95';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 长袍上身
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath();
  ctx.moveTo(-25, 30);
  ctx.lineTo(-28, 80);
  ctx.lineTo(28, 80);
  ctx.lineTo(25, 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 长袍领口（黄色星星装饰）
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(0, 35);
  ctx.lineTo(-3, 42);
  ctx.lineTo(-10, 42);
  ctx.lineTo(-5, 47);
  ctx.lineTo(-7, 55);
  ctx.lineTo(0, 50);
  ctx.lineTo(7, 55);
  ctx.lineTo(5, 47);
  ctx.lineTo(10, 42);
  ctx.lineTo(3, 42);
  ctx.closePath();
  ctx.fill();

  // 头部
  ctx.fillStyle = '#fde68a'; // 肤色
  ctx.beginPath();
  ctx.arc(0, 15, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d4a574';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 眼睛
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(-6, 12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6, 12, 3, 0, Math.PI * 2);
  ctx.fill();

  // 眼睛高光
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-5, 11, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7, 11, 1, 0, Math.PI * 2);
  ctx.fill();

  // 嘴巴（根据是否说话变化）
  if (isTalking) {
    // 说话时的O型嘴
    ctx.fillStyle = '#be123c';
    ctx.beginPath();
    ctx.ellipse(0, 22, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 平时的微笑
    ctx.strokeStyle = '#be123c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 20, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // 胡子（白色长胡子）
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(-8, 28);
  ctx.lineTo(-5, 50);
  ctx.lineTo(0, 55);
  ctx.lineTo(5, 50);
  ctx.lineTo(8, 28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 帽子（经典的尖顶巫师帽）
  ctx.fillStyle = '#6b21a8';
  ctx.beginPath();
  ctx.moveTo(-35, 5);
  ctx.quadraticCurveTo(-20, -30, 0, -50);
  ctx.quadraticCurveTo(20, -30, 35, 5);
  ctx.lineTo(25, 0);
  ctx.lineTo(-25, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4c1d95';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 帽子上的星星装饰
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(0, -35);
  ctx.lineTo(-2, -30);
  ctx.lineTo(-7, -30);
  ctx.lineTo(-3, -26);
  ctx.lineTo(-5, -20);
  ctx.lineTo(0, -23);
  ctx.lineTo(5, -20);
  ctx.lineTo(3, -26);
  ctx.lineTo(7, -30);
  ctx.lineTo(2, -30);
  ctx.closePath();
  ctx.fill();

  // 帽子边缘
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4c1d95';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 左手（持法杖）
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(-30, 50, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d4a574';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 法杖
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-30, 50);
  ctx.lineTo(-35, -20);
  ctx.stroke();

  // 法杖顶端的宝石
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.arc(-35, -20, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 宝石发光效果
  ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.beginPath();
  ctx.arc(-35, -20, 10, 0, Math.PI * 2);
  ctx.fill();

  // 右手（自然下垂）
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(30, 55, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d4a574';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// 绘制商品图标 - 恢复药剂
export function drawHealPotion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 瓶子底部（圆形）
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.arc(0, 15, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#14532d';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 液体（亮绿色）
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(0, 15, 16, 0, Math.PI * 2);
  ctx.fill();

  // 液体高光
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.ellipse(-5, 10, 6, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // 瓶颈
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-6, -15, 12, 20);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-6, -15, 12, 20);

  // 瓶口
  ctx.fillStyle = '#475569';
  ctx.fillRect(-8, -20, 16, 8);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-8, -20, 16, 8);

  // 瓶塞
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.moveTo(-6, -22);
  ctx.lineTo(-4, -28);
  ctx.lineTo(4, -28);
  ctx.lineTo(6, -22);
  ctx.closePath();
  ctx.fill();

  // 标签
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(-10, 5, 20, 15);
  ctx.strokeStyle = '#d4a574';
  ctx.lineWidth = 1;
  ctx.strokeRect(-10, 5, 20, 15);

  // 十字标志
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(0, 17);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, 12.5);
  ctx.lineTo(4, 12.5);
  ctx.stroke();

  ctx.restore();
}

// 绘制商品图标 - 狂暴药剂
export function drawBerserkPotion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 瓶子底部（方形，更有攻击性）
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(-18, 30);
  ctx.lineTo(-22, 5);
  ctx.lineTo(22, 5);
  ctx.lineTo(18, 30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#450a0a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 液体（红色）
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(-16, 28);
  ctx.lineTo(-19, 8);
  ctx.lineTo(19, 8);
  ctx.lineTo(16, 28);
  ctx.closePath();
  ctx.fill();

  // 液体中的气泡
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(-5, 15, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, 20, 2, 0, Math.PI * 2);
  ctx.fill();

  // 瓶颈（更粗）
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-8, -15, 16, 22);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-8, -15, 16, 22);

  // 瓶口（带尖刺装饰）
  ctx.fillStyle = '#475569';
  ctx.fillRect(-10, -22, 20, 10);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-10, -22, 20, 10);

  // 尖刺装饰
  ctx.fillStyle = '#dc2626';
  for (let i = 0; i < 4; i++) {
    const spikeX = -8 + i * 5;
    ctx.beginPath();
    ctx.moveTo(spikeX, -22);
    ctx.lineTo(spikeX + 2, -28);
    ctx.lineTo(spikeX + 4, -22);
    ctx.closePath();
    ctx.fill();
  }

  // 火焰标签
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(-12, 8, 24, 14);
  ctx.strokeStyle = '#d4a574';
  ctx.lineWidth = 1;
  ctx.strokeRect(-12, 8, 24, 14);

  // 火焰图标
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.moveTo(0, 11);
  ctx.quadraticCurveTo(-5, 15, -3, 20);
  ctx.quadraticCurveTo(0, 16, 3, 20);
  ctx.quadraticCurveTo(5, 15, 0, 11);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// 绘制商品图标 - 陨石药剂
export function drawMeteorPotion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 瓶子（圆形，像炸弹）
  ctx.fillStyle = '#7c2d12';
  ctx.beginPath();
  ctx.arc(0, 10, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#431407';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 液体（橙色）
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(0, 10, 18, 0, Math.PI * 2);
  ctx.fill();

  // 液体中的漩涡效果
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 10, 10, 0, Math.PI * 1.5);
  ctx.stroke();

  // 引线（从顶部伸出）
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(5, -25);
  ctx.stroke();

  // 引线火花
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(5, -25, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(5, -25, 2, 0, Math.PI * 2);
  ctx.fill();

  // 瓶口
  ctx.fillStyle = '#475569';
  ctx.fillRect(-8, -15, 16, 8);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-8, -15, 16, 8);

  // 警告标签
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(-12, 2, 24, 16);
  ctx.strokeStyle = '#d4a574';
  ctx.lineWidth = 1;
  ctx.strokeRect(-12, 2, 24, 16);

  // 爆炸标志
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.lineTo(-2, 10);
  ctx.lineTo(-6, 10);
  ctx.lineTo(-3, 13);
  ctx.lineTo(-4, 17);
  ctx.lineTo(0, 14);
  ctx.lineTo(4, 17);
  ctx.lineTo(3, 13);
  ctx.lineTo(6, 10);
  ctx.lineTo(2, 10);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// 绘制商品图标 - 攻击升级（剑）
export function drawAttackUpgrade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 剑刃
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(-6, 15);
  ctx.lineTo(0, 20);
  ctx.lineTo(6, 15);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 剑刃高光
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(-2, 15);
  ctx.lineTo(0, 18);
  ctx.closePath();
  ctx.fill();

  // 剑柄
  ctx.fillStyle = '#92400e';
  ctx.fillRect(-4, 20, 8, 12);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-4, 20, 8, 12);

  // 护手
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-12, 18, 24, 4);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-12, 18, 24, 4);

  // 剑柄末端
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, 34, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// 绘制商品图标 - 生命升级（盾牌）
export function drawHpUpgrade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 盾牌外框
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.quadraticCurveTo(18, -20, 20, 0);
  ctx.quadraticCurveTo(20, 20, 0, 30);
  ctx.quadraticCurveTo(-20, 20, -20, 0);
  ctx.quadraticCurveTo(-18, -20, 0, -25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 盾牌内面
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.quadraticCurveTo(14, -16, 15, 0);
  ctx.quadraticCurveTo(15, 16, 0, 25);
  ctx.quadraticCurveTo(-15, 16, -15, 0);
  ctx.quadraticCurveTo(-14, -16, 0, -20);
  ctx.closePath();
  ctx.fill();

  // 十字标志
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-3, -12, 6, 24);
  ctx.fillRect(-10, -3, 20, 6);

  // 十字高光
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(-3, -12, 2, 24);
  ctx.fillRect(-10, -3, 2, 6);

  ctx.restore();
}

// 绘制商品图标 - 步数升级（靴子）
export function drawMovesUpgrade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 靴子主体
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.moveTo(-8, -15);
  ctx.lineTo(8, -15);
  ctx.lineTo(10, 10);
  ctx.lineTo(18, 15);
  ctx.lineTo(18, 25);
  ctx.lineTo(-10, 25);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 靴子高光
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.moveTo(-5, -12);
  ctx.lineTo(0, -12);
  ctx.lineTo(2, 10);
  ctx.lineTo(-5, 10);
  ctx.closePath();
  ctx.fill();

  // 鞋带
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -5);
  ctx.lineTo(6, -2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(6, 5);
  ctx.stroke();

  // 鞋底
  ctx.fillStyle = '#451a03';
  ctx.fillRect(-12, 25, 34, 5);
  ctx.strokeStyle = '#291001';
  ctx.lineWidth = 1;
  ctx.strokeRect(-12, 25, 34, 5);

  // 速度线（表示快速）
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-20, 5);
  ctx.lineTo(-28, 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-18, 12);
  ctx.lineTo(-26, 12);
  ctx.stroke();

  ctx.restore();
}

// 绘制对话框 - 战斗场景风格（深色半透明）
export function drawDialogBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string
) {
  ctx.save();

  // 对话框背景 - 深色半透明
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 对话框边框装饰
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 2]);
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 3, width - 6, height - 6, 6);
  ctx.stroke();
  ctx.setLineDash([]);

  // 小三角（指向魔法师）- 在底部中央
  const triangleX = x + width / 2;
  const triangleY = y + height;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.beginPath();
  ctx.moveTo(triangleX - 10, triangleY);
  ctx.lineTo(triangleX, triangleY + 10);
  ctx.lineTo(triangleX + 10, triangleY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 文字 - 白色
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '13px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // 自动换行
  const words = text.split('');
  let line = '';
  let lineY = y + 10;
  const maxWidth = width - 20;
  const lineHeight = 17;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x + 10, lineY);
      line = words[i];
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x + 10, lineY);

  ctx.restore();
}

// 绘制货架背景 - 战斗场景风格（简洁网格）
export function drawShelf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  ctx.save();
  ctx.translate(x, y);

  // 背景面板 - 半透明深色
  ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 顶部高光
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(12, 1);
  ctx.lineTo(width - 12, 1);
  ctx.stroke();

  ctx.restore();
}

// 绘制商品卡片背景 - 战斗场景风格（深色圆角卡片）
export function drawItemCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  isSelected: boolean = false,
  isHovered: boolean = false
) {
  ctx.save();
  ctx.translate(x, y);

  // 卡片背景 - 半透明深色
  if (isSelected) {
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.shadowColor = 'rgba(251, 191, 36, 0.4)';
    ctx.shadowBlur = 12;
  } else if (isHovered) {
    ctx.fillStyle = 'rgba(51, 65, 85, 0.85)';
  } else {
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
  }

  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 8);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 卡片边框
  if (isSelected) {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
  } else if (isHovered) {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
  } else {
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
  }
  ctx.stroke();

  // 顶部高光线条
  ctx.strokeStyle = isSelected ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, 1);
  ctx.lineTo(width - 8, 1);
  ctx.stroke();

  ctx.restore();
}
