import { UnitType } from '../types';

const ATTACK_COOLDOWN = 1.2;
const VISUAL_COOLDOWN = 0.25;

interface TeamColors {
  main: string;
  dark: string;
}

// 绘制士兵的主函数
export const drawUnitOnCanvas = (
  ctx: CanvasRenderingContext2D,
  type: UnitType,
  centerX: number,
  centerY: number,
  scale: number = 2,
  team?: { main: string; dark: string },
  isAttacking: boolean = false,
  walkPhase: number = 0,
  attackProgress: number = 0,
  isMoving: boolean = false,
  state?: 'idle' | 'moving' | 'attacking'
) => {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);

  const defaultTeam = { main: '#3b82f6', dark: '#1e40af' };
  const colors = team || defaultTeam;

  // 阴影
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (type === UnitType.SWORDSMAN) {
    drawMiniSwordsman(ctx, colors, isAttacking, walkPhase, isMoving, attackProgress);
  } else if (type === UnitType.SPEARMAN) {
    drawMiniSpearman(ctx, colors, isAttacking, walkPhase, isMoving, attackProgress);
  } else if (type === UnitType.ARCHER) {
    drawMiniArcher(ctx, colors, isAttacking, walkPhase, isMoving, attackProgress);
  } else if (type === UnitType.CAVALRY) {
    drawMiniCavalry(ctx, colors, isAttacking, walkPhase, isMoving, attackProgress);
  }

  ctx.restore();
};

// 剑盾兵 - 美化版（参考deepseek HTML重装剑盾风格，支持三段式攻击动画）
const drawMiniSwordsman = (
  ctx: CanvasRenderingContext2D,
  team: TeamColors,
  isAttacking: boolean,
  walkPhase: number = 0,
  isMoving: boolean = false,
  attackProgress: number = 0
) => {
  const bobOffset = isMoving ? Math.abs(Math.cos(walkPhase)) * 2.5 : 0;
  const legSwing = isMoving ? Math.sin(walkPhase) * 3 : 0;

  ctx.save();
  ctx.translate(0, -bobOffset);

  // 腿部（粗壮）
  ctx.fillStyle = team.dark;
  ctx.fillRect(-5 + legSwing * 0.3, 8, 5, 12);
  ctx.fillRect(0 - legSwing * 0.3, 8, 5, 12);
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(-6 + legSwing * 0.3, 18, 7, 5);
  ctx.fillRect(-1 - legSwing * 0.3, 18, 7, 5);
  ctx.fillStyle = '#5a3a28';
  ctx.fillRect(-5 + legSwing * 0.3, 18, 5, 2);
  ctx.fillRect(0 - legSwing * 0.3, 18, 5, 2);
  ctx.fillStyle = team.main;
  ctx.fillRect(-4 + legSwing * 0.3, 14, 4, 2);
  ctx.fillRect(1 - legSwing * 0.3, 14, 4, 2);

  // 身体 - 宽厚板甲带渐变
  const bodyGrad = ctx.createLinearGradient(-8, -10, -8, 8);
  bodyGrad.addColorStop(0, team.main);
  bodyGrad.addColorStop(0.6, team.dark);
  bodyGrad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(-8, -10, 16, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, -10, 2, 18);
  ctx.fillStyle = team.dark;
  ctx.fillRect(-11, -10, 3, 8);
  ctx.fillRect(8, -10, 3, 8);
  ctx.fillStyle = team.main;
  ctx.fillRect(-11, -10, 3, 2);
  ctx.fillRect(8, -10, 3, 2);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-9, 6, 18, 4);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-2, 4, 4, 5);

  // 盾牌 - 大型塔盾
  const shieldSway = isMoving ? Math.sin(walkPhase + Math.PI) * 1.5 * 0.3 : 0;
  ctx.save();
  ctx.translate(-12 + shieldSway, -6);
  const shieldGrad = ctx.createLinearGradient(0, 0, 9, 0);
  shieldGrad.addColorStop(0, '#b91c1c');
  shieldGrad.addColorStop(0.5, '#ef4444');
  shieldGrad.addColorStop(1, '#b91c1c');
  ctx.fillStyle = shieldGrad;
  ctx.fillRect(0, 0, 9, 20);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(1, 2, 7, 16);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(2, 6, 5, 8);
  ctx.restore();

  // 头部 - 全封闭头盔
  ctx.fillStyle = '#c8a878';
  ctx.fillRect(-2, -14, 4, 3);
  const helmGrad = ctx.createLinearGradient(0, -22, 0, -10);
  helmGrad.addColorStop(0, team.main);
  helmGrad.addColorStop(0.6, team.dark);
  helmGrad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = helmGrad;
  ctx.fillRect(-6, -20, 12, 14);
  ctx.fillStyle = team.main;
  ctx.fillRect(-4, -24, 8, 5);
  ctx.fillRect(-3, -27, 6, 4);
  ctx.fillRect(-1, -29, 2, 3);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(1, -31, 2, 7);
  ctx.fillRect(2, -33, 1, 3);
  ctx.fillStyle = '#f06060';
  ctx.fillRect(2, -34, 1, 2);
  ctx.fillStyle = '#111111';
  ctx.fillRect(-3, -16, 2, 1.5);
  ctx.fillRect(2, -16, 2, 1.5);
  ctx.fillStyle = team.main;
  ctx.fillRect(-6, -10, 12, 2);

  // 武器（剑）- 三段式攻击动画
  const swayOffset = (isMoving && !isAttacking)
    ? Math.sin(walkPhase + Math.PI * 0.7) * 1
    : 0;
  ctx.save();
  ctx.translate(6, -4 + swayOffset);

  let attackRotation = 0;
  if (isAttacking) {
    const p = attackProgress;
    if (p < 0.25) {
      attackRotation = (p / 0.25) * 1.2;
    } else if (p < 0.6) {
      attackRotation = 1.2;
    } else {
      attackRotation = 1.2 * (1 - (p - 0.6) / 0.4);
    }
    attackRotation = attackRotation * (Math.PI / 3.5);
  }
  ctx.rotate(attackRotation);

  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-1, 0, 4, 7);
  ctx.fillStyle = '#d4a840';
  ctx.fillRect(0, 1, 2, 5);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-4, -2, 10, 2);
  ctx.fillStyle = '#d4a840';
  ctx.fillRect(-3, -1.5, 8, 1);
  ctx.fillStyle = '#d8d8e0';
  ctx.fillRect(0.5, -22, 3, 20);
  ctx.fillStyle = '#f0f0f5';
  ctx.fillRect(1.5, -20, 1, 16);
  ctx.fillStyle = '#d8d8e0';
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(4, -22);
  ctx.lineTo(2, -28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f0f0f5';
  ctx.fillRect(1.5, -26, 1, 4);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(1, 7, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4a840';
  ctx.beginPath();
  ctx.arc(1, 7, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
};

// 矛兵 - 美化版（deepseek风格，支持三段式矛刺动画）
const drawMiniSpearman = (
  ctx: CanvasRenderingContext2D,
  team: TeamColors,
  isAttacking: boolean,
  walkPhase: number = 0,
  isMoving: boolean = false,
  attackProgress: number = 0
) => {
  const bobOffset = isMoving ? Math.abs(Math.cos(walkPhase)) * 2.5 : 0;
  const legSwing = isMoving ? Math.sin(walkPhase) * 3.5 : 0;

  ctx.save();
  ctx.translate(0, -bobOffset);

  // 腿部（纤细）
  ctx.fillStyle = team.dark;
  ctx.fillRect(-4 + legSwing * 0.3, 8, 4, 12);
  ctx.fillRect(0 - legSwing * 0.3, 8, 4, 12);
  ctx.fillStyle = '#4a3a28';
  ctx.fillRect(-5 + legSwing * 0.3, 18, 6, 5);
  ctx.fillRect(-1 - legSwing * 0.3, 18, 6, 5);
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(-4 + legSwing * 0.3, 18, 4, 2);
  ctx.fillRect(0 - legSwing * 0.3, 18, 4, 2);

  // 身体 - 轻便皮甲/布甲
  const bodyGrad = ctx.createLinearGradient(-6, -8, -6, 8);
  bodyGrad.addColorStop(0, team.main);
  bodyGrad.addColorStop(0.5, team.dark);
  bodyGrad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(-6, -8, 12, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, -8, 2, 16);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-7, 5, 14, 3);
  ctx.fillStyle = team.dark;
  ctx.fillRect(-7, -6, 2, 6);
  ctx.fillRect(5, -6, 2, 6);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-1, 3, 3, 4);

  // 头部 - 带角头盔
  ctx.fillStyle = '#c8a878';
  ctx.fillRect(-3, -12, 6, 3);
  const helmGrad = ctx.createLinearGradient(0, -20, 0, -10);
  helmGrad.addColorStop(0, team.main);
  helmGrad.addColorStop(0.6, team.dark);
  helmGrad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = helmGrad;
  ctx.fillRect(-5, -18, 10, 12);
  ctx.fillStyle = team.main;
  ctx.fillRect(-3, -22, 6, 5);
  ctx.fillRect(-2, -25, 4, 4);
  ctx.fillStyle = team.main;
  ctx.save();
  ctx.translate(-4, -16);
  ctx.rotate(-0.4);
  ctx.fillRect(-0.5, -4, 1.5, 5);
  ctx.restore();
  ctx.save();
  ctx.translate(4, -16);
  ctx.rotate(0.4);
  ctx.fillRect(-1, -4, 1.5, 5);
  ctx.restore();
  ctx.fillStyle = '#111111';
  ctx.fillRect(-2, -14, 1.5, 1.5);
  ctx.fillRect(1, -14, 1.5, 1.5);

  // 长矛 - 和剑盾兵一样的挥砍动画
  const swayOffset = (isMoving && !isAttacking)
    ? Math.sin(walkPhase + Math.PI * 0.7) * 1
    : 0;
  ctx.save();
  ctx.translate(5, -3 + swayOffset);

  let attackRotation = 0;
  if (isAttacking) {
    const p = attackProgress;
    if (p < 0.25) {
      attackRotation = (p / 0.25) * 1.2;
    } else if (p < 0.6) {
      attackRotation = 1.2;
    } else {
      attackRotation = 1.2 * (1 - (p - 0.6) / 0.4);
    }
    attackRotation = attackRotation * (Math.PI / 3.5);
  }
  ctx.rotate(attackRotation);

  // 矛杆
  ctx.fillStyle = '#8b7355';
  ctx.fillRect(-1, -22, 2.5, 28);

  // 矛尖
  ctx.fillStyle = '#c0c0c0';
  ctx.beginPath();
  ctx.moveTo(0.25, -30);
  ctx.lineTo(-2, -22);
  ctx.lineTo(2.5, -22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e0e0e8';
  ctx.beginPath();
  ctx.moveTo(0.25, -30);
  ctx.lineTo(-1, -22);
  ctx.lineTo(1.5, -22);
  ctx.closePath();
  ctx.fill();

  // 矛尾装饰
  ctx.fillStyle = '#6b5a3a';
  ctx.fillRect(-1.5, 6, 3, 3);

  ctx.restore();
  ctx.restore();
};

// 弓箭手 - 美化版（deepseek风格，弓箭代码保持不变）
const drawMiniArcher = (
  ctx: CanvasRenderingContext2D,
  team: TeamColors,
  isAttacking: boolean,
  walkPhase: number = 0,
  isMoving: boolean = false,
  attackProgress: number = 0
) => {
  const bobOffset = isMoving ? Math.abs(Math.cos(walkPhase)) * 2.5 : 0;
  const legSwing = isMoving ? Math.sin(walkPhase) * 3.5 : 0;

  ctx.save();
  ctx.translate(0, -bobOffset);

  // 腿部（纤细）
  ctx.fillStyle = team.dark;
  ctx.fillRect(-4 + legSwing * 0.3, 8, 4, 12);
  ctx.fillRect(0 - legSwing * 0.3, 8, 4, 12);
  ctx.fillStyle = '#4a3a28';
  ctx.fillRect(-5 + legSwing * 0.3, 18, 6, 5);
  ctx.fillRect(-1 - legSwing * 0.3, 18, 6, 5);
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(-4 + legSwing * 0.3, 18, 4, 2);
  ctx.fillRect(0 - legSwing * 0.3, 18, 4, 2);

  // 身体 - 轻便皮甲/布甲
  const bodyGrad = ctx.createLinearGradient(-6, -8, -6, 8);
  bodyGrad.addColorStop(0, team.main);
  bodyGrad.addColorStop(0.5, team.dark);
  bodyGrad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(-6, -8, 12, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, -8, 2, 16);
  ctx.fillStyle = '#c8a030';
  ctx.fillRect(-7, 5, 14, 3);
  ctx.fillStyle = team.dark;
  ctx.fillRect(-7, -6, 2, 6);
  ctx.fillRect(5, -6, 2, 6);
  ctx.fillStyle = '#c8a850';
  ctx.fillRect(-1, 3, 3, 3);

  // 头部 - 兜帽/轻盔
  ctx.fillStyle = '#e8c9a0';
  ctx.fillRect(-3, -12, 6, 3);
  const hoodGrad = ctx.createLinearGradient(0, -18, 0, -10);
  hoodGrad.addColorStop(0, team.dark);
  hoodGrad.addColorStop(0.5, team.main);
  hoodGrad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = hoodGrad;
  ctx.fillRect(-6, -16, 12, 10);
  ctx.fillStyle = team.dark;
  ctx.fillRect(-4, -20, 8, 5);
  ctx.fillStyle = '#c8a030';
  ctx.fillRect(1, -24, 2, 6);
  ctx.fillStyle = '#111111';
  ctx.fillRect(-2, -14, 1.5, 1.5);
  ctx.fillRect(1, -14, 1.5, 1.5);

  // 箭袋（在背后）
  ctx.save();
  ctx.translate(-5, -8);
  const quiverGrad = ctx.createLinearGradient(0, 0, 3, 0);
  quiverGrad.addColorStop(0, '#8b4513');
  quiverGrad.addColorStop(0.5, '#a0552a');
  quiverGrad.addColorStop(1, '#6b3510');
  ctx.fillStyle = quiverGrad;
  ctx.fillRect(0, 0, 3, 9);
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(0.5, -3, 1, 4);
  ctx.fillRect(0.5, -1, 1, 3);
  ctx.restore();

  // 弓（在前面）- 拉弓射箭动画（保留正确的弓箭代码）
  ctx.save();
  ctx.translate(5, -4);

  let bowPull = 0;
  if (isAttacking) {
    const p = attackProgress;
    if (p < 0.6) {
      bowPull = (p / 0.6) * 5;
    } else {
      bowPull = 5 * (1 - (p - 0.6) / 0.4);
    }
  }

  // 弓身（棕色，弯曲向前）
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 8, -Math.PI / 2, Math.PI / 2, false);
  ctx.stroke();

  // 弓弦（白色/银色）- 根据攻击状态拉紧
  ctx.strokeStyle = isAttacking ? '#fbbf24' : '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(bowPull, 0);
  ctx.lineTo(0, 8);
  ctx.stroke();

  // 箭矢（拉弓时显示）
  if (isAttacking && attackProgress < 0.35) {
    ctx.fillStyle = '#c0a070';
    ctx.fillRect(-10, 0, 10, 1.5);
    ctx.fillStyle = '#e0d0b0';
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-15, -2);
    ctx.lineTo(-15, 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
};

// 英雄 - 美化版（3倍体型，支持四段式巨剑挥砍动画）
const drawMiniHero = (
  ctx: CanvasRenderingContext2D,
  team: TeamColors,
  isAttacking: boolean,
  walkPhase: number,
  attackProgress: number,
  isMoving: boolean
) => {
  const s = 3;
  const bobAmp = 2.5;

  let bobOffset = 0;
  let legSwing = 0;

  if (isMoving) {
    bobOffset = Math.abs(Math.cos(walkPhase)) * bobAmp;
    legSwing = Math.sin(walkPhase) * 4;
  }

  // 披风（血红色，在身体后面）
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.moveTo(-5 * s, -8 * s + bobOffset);
  ctx.lineTo(-9 * s, 6 * s + bobOffset);
  ctx.lineTo(-5 * s, 8 * s + bobOffset);
  ctx.lineTo(0, 6 * s + bobOffset);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.moveTo(-3 * s, -7 * s + bobOffset);
  ctx.lineTo(-6 * s, 4 * s + bobOffset);
  ctx.lineTo(-3 * s, 6 * s + bobOffset);
  ctx.closePath();
  ctx.fill();

  // 左腿
  ctx.fillStyle = team.dark;
  ctx.fillRect(-4 * s, 2 * s + bobOffset, 3 * s, 6 * s + legSwing * 0.3);
  ctx.fillStyle = team.main;
  ctx.fillRect(-3.5 * s, 6 * s + bobOffset + legSwing * 0.3, 2.5 * s, 2 * s);

  // 右腿
  ctx.fillStyle = team.dark;
  ctx.fillRect(1 * s, 2 * s + bobOffset, 3 * s, 6 * s - legSwing * 0.3);
  ctx.fillStyle = team.main;
  ctx.fillRect(1.5 * s, 6 * s + bobOffset - legSwing * 0.3, 2.5 * s, 2 * s);

  // 身体（3 倍大小，带渐变）
  const bodyGrad = ctx.createLinearGradient(-5 * s, -8 * s + bobOffset, -5 * s, 2 * s + bobOffset);
  bodyGrad.addColorStop(0, team.main);
  bodyGrad.addColorStop(0.5, team.dark);
  bodyGrad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(-5 * s, -8 * s + bobOffset, 10 * s, 10 * s);
  
  // 胸甲中央装饰线
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1 * s, -8 * s + bobOffset, 2 * s, 10 * s);
  
  // 肩甲（血红色）
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(-9 * s, -9 * s + bobOffset, 4 * s, 4 * s);
  ctx.fillRect(5 * s, -9 * s + bobOffset, 4 * s, 4 * s);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-8 * s, -9 * s + bobOffset, 2 * s, 2 * s);
  ctx.fillRect(6 * s, -9 * s + bobOffset, 2 * s, 2 * s);
  
  // 腰带
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-6 * s, -1 * s + bobOffset, 12 * s, 3 * s);
  ctx.fillStyle = '#d4a840';
  ctx.fillRect(-6 * s, -1 * s + bobOffset, 12 * s, 1 * s);
  
  // 腰带扣
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, 0.5 * s + bobOffset, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4a840';
  ctx.beginPath();
  ctx.arc(0, 0.5 * s + bobOffset, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // 左臂（持盾）
  const shieldSway = isMoving ? Math.sin(walkPhase + Math.PI) * 0.15 : 0;
  ctx.save();
  ctx.translate(-7 * s, -3 * s + bobOffset);
  ctx.rotate(shieldSway);
  ctx.fillStyle = team.main;
  ctx.fillRect(-2 * s, 0, 3 * s, 5 * s);
  ctx.restore();

  // 头部 - 带渐变头盔（下移以消除头身空隙）
    const helmGrad = ctx.createLinearGradient(0, -14 * s + bobOffset, 0, -6 * s + bobOffset);
    helmGrad.addColorStop(0, team.main);
    helmGrad.addColorStop(0.6, team.dark);
    helmGrad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = helmGrad;
    ctx.fillRect(-4.5 * s, -14 * s + bobOffset, 9 * s, 8 * s);
    ctx.fillRect(-3.5 * s, -17 * s + bobOffset, 7 * s, 5 * s);
    ctx.fillRect(-2.5 * s, -20 * s + bobOffset, 5 * s, 4 * s);
    ctx.fillRect(-1.5 * s, -23 * s + bobOffset, 3 * s, 3 * s);
    
    // 头盔羽饰
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(1.5 * s, -25 * s + bobOffset, 2 * s, 6 * s);
    ctx.fillRect(2 * s, -28 * s + bobOffset, 1.5 * s, 4 * s);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(2 * s, -28 * s + bobOffset, 1.5 * s, 2 * s);
    
    // 脸部
    ctx.fillStyle = '#e5c9a0';
    ctx.fillRect(-2.5 * s, -10 * s + bobOffset, 5 * s, 3 * s);
    ctx.fillStyle = '#c8a878';
    ctx.fillRect(-1.5 * s, -8 * s + bobOffset, 3 * s, 1 * s);
    
    // 眼睛
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2.5 * s, -10 * s + bobOffset, 1.8 * s, 1.2 * s);
    ctx.fillRect(1.2 * s, -10 * s + bobOffset, 1.8 * s, 1.2 * s);
    ctx.fillStyle = '#000000';
    ctx.fillRect(-1.8 * s, -9.7 * s + bobOffset, 1 * s, 0.8 * s);
    ctx.fillRect(1.5 * s, -9.7 * s + bobOffset, 1 * s, 0.8 * s);
    
    // 头盔护鼻
    ctx.fillStyle = team.dark;
    ctx.fillRect(-0.4 * s, -11 * s + bobOffset, 0.8 * s, 7 * s);

  // 盾牌 - 鸢形盾（3 倍大小）
  const shieldSwing = isMoving ? Math.sin(walkPhase + Math.PI) * 2 * s : 0;
  const shieldX = -7 * s + shieldSwing;
  const shieldY = -2 * s + bobOffset;
  
  ctx.save();
  ctx.translate(shieldX, shieldY);
  
  const shieldGrad = ctx.createLinearGradient(-5 * s, 0, 5 * s, 0);
  shieldGrad.addColorStop(0, '#b91c1c');
  shieldGrad.addColorStop(0.5, '#dc2626');
  shieldGrad.addColorStop(1, '#b91c1c');
  ctx.fillStyle = shieldGrad;
  ctx.beginPath();
  ctx.moveTo(-5 * s, -4 * s);
  ctx.lineTo(5 * s, -4 * s);
  ctx.lineTo(4 * s, 10 * s);
  ctx.lineTo(0, 14 * s);
  ctx.lineTo(-4 * s, 10 * s);
  ctx.closePath();
  ctx.fill();
  
  // 盾牌边框
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 0.6 * s;
  ctx.stroke();
  
  // 盾牌中央纹饰
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-0.8 * s, -2 * s, 1.6 * s, 8 * s);
  ctx.fillRect(-3.5 * s, 2 * s, 7 * s, 1.5 * s);
  ctx.restore();

  // 右臂
  ctx.fillStyle = team.main;
  ctx.fillRect(5 * s, -3 * s + bobOffset, 3 * s, 5 * s);

  // 武器（巨剑）- 四段式攻击动画（增强版）
  const swordSwing = isMoving ? Math.sin(walkPhase) * 0.1 : 0;
  let attackRotation = 0;
  if (isAttacking) {
    const t = attackProgress;
    if (t < 0.25) {
      // 第一阶段：举剑蓄力 (0->0.25): 向上举起
      attackRotation = -(t / 0.25) * 0.8;
    } else if (t < 0.5) {
      // 第二阶段：向下劈砍 (0.25->0.5): 快速下劈
      attackRotation = -0.8 + ((t - 0.25) / 0.25) * 2.8;
    } else if (t < 0.75) {
      // 第三阶段：保持下劈姿态 (0.5->0.7): 停顿显示力度
      attackRotation = 2.0;
    } else {
      // 第四阶段：收回 (0.75->1.0): 缓慢收回
      attackRotation = 2.0 * (1 - (t - 0.75) / 0.25);
    }
  }

  ctx.save();
  ctx.translate(8 * s, -5 * s + bobOffset);
  ctx.rotate(-Math.PI / 6 + attackRotation + swordSwing);
  
  // 剑柄
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-1.5 * s, 3 * s, 3 * s, 6 * s);
  ctx.fillStyle = '#d4a840';
  ctx.fillRect(-1 * s, 4 * s, 2 * s, 4 * s);
  
  // 护手
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-3 * s, 1 * s, 6 * s, 2.5 * s);
  ctx.fillStyle = '#d4a840';
  ctx.fillRect(-2.5 * s, 1.5 * s, 5 * s, 1.5 * s);
  
  // 剑身 - 带渐变
  const bladeGrad = ctx.createLinearGradient(-2 * s, -12 * s, 2 * s, -12 * s);
  bladeGrad.addColorStop(0, '#f0f0f5');
  bladeGrad.addColorStop(0.5, '#e0e0e8');
  bladeGrad.addColorStop(1, '#c8ccd4');
  ctx.fillStyle = bladeGrad;
  ctx.fillRect(-1.8 * s, -12 * s, 3.6 * s, 13 * s);
  
  // 剑身中央血槽
  ctx.fillStyle = '#f0f0f5';
  ctx.fillRect(-0.3 * s, -10 * s, 0.6 * s, 10 * s);
  
  // 剑尖
  ctx.fillStyle = '#e0e0e8';
  ctx.beginPath();
  ctx.moveTo(-1.8 * s, -12 * s);
  ctx.lineTo(1.8 * s, -12 * s);
  ctx.lineTo(0, -18 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f0f0f5';
  ctx.beginPath();
  ctx.moveTo(-0.8 * s, -12 * s);
  ctx.lineTo(0.8 * s, -12 * s);
  ctx.lineTo(0, -16 * s);
  ctx.closePath();
  ctx.fill();
  
  // 剑柄末端配重
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, 9.5 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4a840';
  ctx.beginPath();
  ctx.arc(0, 9.5 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
};

// 骑兵 - 黄色主题，带马匹，横着朝前戳的长矛
const drawMiniCavalry = (
  ctx: CanvasRenderingContext2D,
  team: TeamColors,
  isAttacking: boolean,
  walkPhase: number = 0,
  isMoving: boolean = false,
  attackProgress: number = 0
) => {
  const bobOffset = isMoving ? Math.abs(Math.cos(walkPhase)) * 2 : 0;
  const legSwing = isMoving ? Math.sin(walkPhase) * 4 : 0;

  // 马匹身体（在后面）
  ctx.fillStyle = '#8b5a3c';
  ctx.fillRect(-10, 4 + bobOffset, 20, 12);
  ctx.fillRect(-12, 6 + bobOffset, 6, 8);
  ctx.fillRect(6, 6 + bobOffset, 6, 8);

  // 马腿
  ctx.fillStyle = '#5a3020';
  ctx.fillRect(-8 + legSwing * 0.3, 14 + bobOffset, 4, 8);
  ctx.fillRect(-2 - legSwing * 0.3, 14 + bobOffset, 4, 8);
  ctx.fillRect(4 + legSwing * 0.3, 14 + bobOffset, 4, 8);
  ctx.fillRect(8 - legSwing * 0.3, 14 + bobOffset, 4, 8);

  // 马鬃
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(-6, -2 + bobOffset, 5, 8);

  // 骑手身体（黄色主题）
  const bodyGrad = ctx.createLinearGradient(-5, -8 + bobOffset, -5, 4 + bobOffset);
  bodyGrad.addColorStop(0, '#fbbf24');
  bodyGrad.addColorStop(0.5, '#d4a017');
  bodyGrad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(-5, -8 + bobOffset, 10, 12);

  // 白色条纹
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, -8 + bobOffset, 2, 12);

  // 骑手头部
  ctx.fillStyle = '#e8c9a0';
  ctx.fillRect(-3, -14 + bobOffset, 6, 5);

  // 头盔
  const helmetGrad = ctx.createLinearGradient(0, -18 + bobOffset, 0, -10 + bobOffset);
  helmetGrad.addColorStop(0, '#fbbf24');
  helmetGrad.addColorStop(1, '#d4a017');
  ctx.fillStyle = helmetGrad;
  ctx.fillRect(-4, -18 + bobOffset, 8, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, -18 + bobOffset, 2, 6);

  // 眼睛
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2.5, -13 + bobOffset, 1.8, 1.2);
  ctx.fillRect(1.2, -13 + bobOffset, 1.8, 1.2);
  ctx.fillStyle = '#000000';
  ctx.fillRect(-2, -12.7 + bobOffset, 1, 0.8);
  ctx.fillRect(1.5, -12.7 + bobOffset, 1, 0.8);

  // 长矛 - 和剑盾兵一样的挥砍动画
  const swayOffset = (isMoving && !isAttacking)
    ? Math.sin(walkPhase + Math.PI * 0.7) * 1
    : 0;
  ctx.save();
  ctx.translate(5, -5 + bobOffset + swayOffset);

  let attackRotation = 0;
  if (isAttacking) {
    const p = attackProgress;
    if (p < 0.25) {
      attackRotation = (p / 0.25) * 1.2;
    } else if (p < 0.6) {
      attackRotation = 1.2;
    } else {
      attackRotation = 1.2 * (1 - (p - 0.6) / 0.4);
    }
    attackRotation = attackRotation * (Math.PI / 3.5);
  }
  ctx.rotate(attackRotation);

  // 矛杆
  ctx.fillStyle = '#8b7355';
  ctx.fillRect(-1, -22, 2.5, 28);

  // 矛尖
  ctx.fillStyle = '#c0c0c0';
  ctx.beginPath();
  ctx.moveTo(0.25, -30);
  ctx.lineTo(-2, -22);
  ctx.lineTo(2.5, -22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e0e0e8';
  ctx.beginPath();
  ctx.moveTo(0.25, -30);
  ctx.lineTo(-1, -22);
  ctx.lineTo(1.5, -22);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};
