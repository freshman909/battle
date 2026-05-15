import React, { useRef, useEffect, useState, useCallback } from 'react';
import { UPGRADE_COSTS, SKILL_CONFIGS } from '../constants';
import { SkillCard, SkillType } from '../types';
import {
  drawWizard,
  drawHealPotion,
  drawBerserkPotion,
  drawMeteorPotion,
  drawAttackUpgrade,
  drawHpUpgrade,
  drawMovesUpgrade,
  drawDialogBox,
  drawShelf,
  drawItemCard,
} from '../utils/shopDrawer';

interface UpgradeMenuProps {
  diamonds: number;
  upgrades: {
    attackBonus: number;
    hpBonus: number;
    initialMoves: number;
  };
  skills: SkillCard[];
  onApplyUpgrade: (type: 'attack' | 'hp' | 'moves', cost: number) => void;
  onBuySkill: (skillType: SkillType, cost: number) => void;
  onBack: () => void;
}

// 商品类型定义
interface ShopItem {
  id: string;
  name: string;
  type: 'upgrade' | 'skill';
  upgradeType?: 'attack' | 'hp' | 'moves';
  skillType?: SkillType;
  cost: number;
  description: string;
  drawIcon: (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => void;
}

const UpgradeMenu: React.FC<UpgradeMenuProps> = ({ diamonds, upgrades, skills, onApplyUpgrade, onBuySkill, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [wizardTalking, setWizardTalking] = useState(false);

  const getSkillQuantity = (type: SkillType) => {
    const skill = skills.find(s => s.type === type);
    return skill ? skill.quantity : 0;
  };

  // 构建商品列表
  const shopItems: ShopItem[] = [
    {
      id: 'attack',
      name: '攻击强化',
      type: 'upgrade',
      upgradeType: 'attack',
      cost: UPGRADE_COSTS.attack,
      description: `提升所有士兵的攻击力。当前已强化 +${upgrades.attackBonus} 级。每次购买增加1级。`,
      drawIcon: drawAttackUpgrade,
    },
    {
      id: 'hp',
      name: '生命强化',
      type: 'upgrade',
      upgradeType: 'hp',
      cost: UPGRADE_COSTS.hp,
      description: `提升所有士兵的生命值上限。当前已强化 +${upgrades.hpBonus} 级。每次购买增加1级。`,
      drawIcon: drawHpUpgrade,
    },
    {
      id: 'moves',
      name: '策略强化',
      type: 'upgrade',
      upgradeType: 'moves',
      cost: UPGRADE_COSTS.moves,
      description: `增加消消乐阶段的初始步数。当前已强化 +${upgrades.initialMoves} 级。每次购买增加1步。`,
      drawIcon: drawMovesUpgrade,
    },
    {
      id: 'heal',
      name: SKILL_CONFIGS[SkillType.HEAL].name,
      type: 'skill',
      skillType: SkillType.HEAL,
      cost: SKILL_CONFIGS[SkillType.HEAL].cost,
      description: SKILL_CONFIGS[SkillType.HEAL].description,
      drawIcon: drawHealPotion,
    },
    {
      id: 'berserk',
      name: SKILL_CONFIGS[SkillType.BERSERK].name,
      type: 'skill',
      skillType: SkillType.BERSERK,
      cost: SKILL_CONFIGS[SkillType.BERSERK].cost,
      description: SKILL_CONFIGS[SkillType.BERSERK].description,
      drawIcon: drawBerserkPotion,
    },
    {
      id: 'meteor',
      name: SKILL_CONFIGS[SkillType.METEOR].name,
      type: 'skill',
      skillType: SkillType.METEOR,
      cost: SKILL_CONFIGS[SkillType.METEOR].cost,
      description: SKILL_CONFIGS[SkillType.METEOR].description,
      drawIcon: drawMeteorPotion,
    },
  ];

  // 获取选中商品的描述
  const getSelectedDescription = useCallback(() => {
    if (!selectedItem) return '欢迎来到军械库！我是这里的魔法师售货员。请选择一个商品，我会为你介绍它的功能。';
    const item = shopItems.find(i => i.id === selectedItem);
    if (!item) return '';

    let desc = item.description;
    if (item.type === 'skill') {
      const quantity = getSkillQuantity(item.skillType!);
      desc += `\n\n当前持有: ${quantity} 个`;
    }
    desc += `\n\n价格: ${item.cost} 钻石`;
    if (diamonds < item.cost) {
      desc += '\n\n⚠️ 钻石不足！';
    }
    return desc;
  }, [selectedItem, shopItems, diamonds, skills]);

  // 处理购买
  const handleBuy = useCallback((item: ShopItem) => {
    if (diamonds < item.cost) return;
    if (item.type === 'upgrade') {
      onApplyUpgrade(item.upgradeType!, item.cost);
    } else if (item.type === 'skill') {
      onBuySkill(item.skillType!, item.cost);
    }
    // 触发魔法师说话动画
    setWizardTalking(true);
    setTimeout(() => setWizardTalking(false), 1000);
  }, [diamonds, onApplyUpgrade, onBuySkill]);

  // Canvas 绘制
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      const t = time / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 背景 - 战斗场景风格（深色渐变）
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, '#0f172a');
      bgGradient.addColorStop(1, '#1e293b');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 背景纹理（点状网格）
      ctx.fillStyle = 'rgba(148, 163, 184, 0.03)';
      for (let i = 0; i < canvas.width; i += 30) {
        for (let j = 0; j < canvas.height; j += 30) {
          ctx.beginPath();
          ctx.arc(i, j, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 标题
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⚔️ 军械库商店 ⚔️', canvas.width / 2, 40);

      // 钻石显示
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`💎 ${diamonds}`, canvas.width - 20, 40);

      // === 左侧：魔法师和对话框 ===
      const wizardX = 140;
      const wizardY = 420;

      // 绘制魔法师
      drawWizard(ctx, wizardX, wizardY, 1.2, t, wizardTalking);

      // 绘制对话框 - 在魔法师头顶上方
      const dialogText = getSelectedDescription();
      const dialogWidth = 260;
      const dialogHeight = 110;
      // 计算对话框位置：居中于魔法师头顶上方
      const dialogX = Math.max(10, Math.min(canvas.width - dialogWidth - 10, wizardX - dialogWidth / 2));
      const dialogY = wizardY - 220; // 头顶上方220像素
      drawDialogBox(ctx, dialogX, dialogY, dialogWidth, dialogHeight, dialogText);

      // === 右侧：货架和商品 ===
      const shelfX = 320;
      const shelfY = 80;
      const shelfWidth = 460;
      const shelfHeight = 420;

      // 绘制货架背景
      drawShelf(ctx, shelfX, shelfY, shelfWidth, shelfHeight);

      // 绘制商品网格
      const itemsPerRow = 2;
      const itemWidth = 200;
      const itemHeight = 120;
      const gapX = 20;
      const gapY = 16;
      const startX = shelfX + 20;
      const startY = shelfY + 20;

      shopItems.forEach((item, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const itemX = startX + col * (itemWidth + gapX);
        const itemY = startY + row * (itemHeight + gapY);

        const isSelected = selectedItem === item.id;
        const isHovered = hoveredItem === item.id;
        const canAfford = diamonds >= item.cost;

        // 绘制商品卡片
        drawItemCard(ctx, itemX, itemY, itemWidth, itemHeight, isSelected, isHovered);

        // 绘制商品图标
        item.drawIcon(ctx, itemX + 50, itemY + itemHeight / 2, 1.1);

        // 绘制商品名称
        ctx.fillStyle = isSelected ? '#fbbf24' : '#e2e8f0';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(item.name, itemX + 95, itemY + 35);

        // 绘制价格
        ctx.fillStyle = canAfford ? '#38bdf8' : '#64748b';
        ctx.font = '12px Arial';
        ctx.fillText(`💎${item.cost}`, itemX + 95, itemY + 55);

        // 如果已选中，绘制选中标记
        if (isSelected) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          ctx.strokeRect(itemX - 2, itemY - 2, itemWidth + 4, itemHeight + 4);
          ctx.setLineDash([]);
        }
      });

      // === 底部：购买按钮和返回按钮 ===
      const buttonY = canvas.height - 60;

      // 购买按钮 - 圆角风格
      if (selectedItem) {
        const selectedShopItem = shopItems.find(i => i.id === selectedItem);
        if (selectedShopItem && diamonds >= selectedShopItem.cost) {
          // 绿色圆角按钮
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.roundRect(canvas.width / 2 - 80, buttonY, 160, 40, 8);
          ctx.fill();
          ctx.strokeStyle = '#16a34a';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('购买', canvas.width / 2, buttonY + 26);
        } else if (selectedShopItem) {
          // 灰色圆角按钮（不可用）
          ctx.fillStyle = '#374151';
          ctx.beginPath();
          ctx.roundRect(canvas.width / 2 - 80, buttonY, 160, 40, 8);
          ctx.fill();
          ctx.strokeStyle = '#4b5563';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#6b7280';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('钻石不足', canvas.width / 2, buttonY + 26);
        }
      }

      // 返回按钮 - 圆角风格
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(20, buttonY, 80, 40, 8);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('返回', 60, buttonY + 26);

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [diamonds, selectedItem, hoveredItem, wizardTalking, shopItems, getSelectedDescription]);

  // 处理鼠标事件
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 检查是否悬停在商品上
    const shelfX = 320;
    const shelfY = 80;
    const itemWidth = 200;
    const itemHeight = 120;
    const gapX = 20;
    const gapY = 16;
    const itemsPerRow = 2;
    const startX = shelfX + 20;
    const startY = shelfY + 20;

    let foundHover = null;
    shopItems.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      const itemX = startX + col * (itemWidth + gapX);
      const itemY = startY + row * (itemHeight + gapY);

      if (x >= itemX && x <= itemX + itemWidth && y >= itemY && y <= itemY + itemHeight) {
        foundHover = item.id;
      }
    });
    setHoveredItem(foundHover);
  }, [shopItems]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 检查是否点击商品
    const shelfX = 320;
    const shelfY = 80;
    const itemWidth = 200;
    const itemHeight = 120;
    const gapX = 20;
    const gapY = 16;
    const itemsPerRow = 2;
    const startX = shelfX + 20;
    const startY = shelfY + 20;

    let clickedItem = null;
    shopItems.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      const itemX = startX + col * (itemWidth + gapX);
      const itemY = startY + row * (itemHeight + gapY);

      if (x >= itemX && x <= itemX + itemWidth && y >= itemY && y <= itemY + itemHeight) {
        clickedItem = item.id;
      }
    });

    if (clickedItem) {
      setSelectedItem(clickedItem);
      setWizardTalking(true);
      setTimeout(() => setWizardTalking(false), 500);
      return;
    }

    // 检查是否点击购买按钮
    const buttonY = canvas.height - 60;
    if (selectedItem && x >= canvas.width / 2 - 80 && x <= canvas.width / 2 + 80 && y >= buttonY && y <= buttonY + 40) {
      const item = shopItems.find(i => i.id === selectedItem);
      if (item && diamonds >= item.cost) {
        handleBuy(item);
      }
      return;
    }

    // 检查是否点击返回按钮
    if (x >= 20 && x <= 100 && y >= buttonY && y <= buttonY + 40) {
      onBack();
      return;
    }
  }, [shopItems, selectedItem, diamonds, handleBuy, onBack]);

  return (
    <div className="flex items-center justify-center w-full h-screen bg-black/90">
      <div 
        className="relative"
        style={{
          border: '3px solid #fff',
          borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
          boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)',
          padding: '6px',
          backgroundColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="max-w-full max-h-full cursor-pointer block"
          style={{ 
            imageRendering: 'pixelated',
            borderRadius: '240px 8px 210px 8px/8px 210px 8px 240px',
          }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />
      </div>
    </div>
  );
};

export default UpgradeMenu;
