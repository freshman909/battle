
import React, { useState, useEffect, useCallback } from 'react';
import { UnitType, Tile } from '../types';
import { GRID_SIZE, UNIT_COLORS } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { audio } from '../utils/audio';

interface MatchThreeProps {
  moves: number;
  onEnd: (summoned: UnitType[]) => void;
  onScoreUpdate: (score: number) => void;
}

interface AnimatedTile extends Tile {
  isRemoving?: boolean;
}

const MatchThree: React.FC<MatchThreeProps> = ({ moves, onEnd, onScoreUpdate }) => {
  const [tiles, setTiles] = useState<AnimatedTile[]>([]);
  const [movesLeft, setMovesLeft] = useState(moves);
  const [summoned, setSummoned] = useState<UnitType[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const TILE_SIZE = 80; 
  const GAP = 12; 

  const generateTile = useCallback((x: number, y: number): AnimatedTile => {
    const types = [UnitType.ARCHER, UnitType.SWORDSMAN, UnitType.SPEARMAN, UnitType.CAVALRY, UnitType.BLANK];
    return {
      id: uuidv4(),
      type: types[Math.floor(Math.random() * types.length)],
      x,
      y
    };
  }, []);

  useEffect(() => {
    const initialTiles: AnimatedTile[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        initialTiles.push(generateTile(x, y));
      }
    }
    setTiles(initialTiles);
  }, [generateTile]);

  const getTileAt = (x: number, y: number, currentTiles: AnimatedTile[]) => 
    currentTiles.find(t => t.x === x && t.y === y && !t.isRemoving);

  const checkMatches = (currentTiles: AnimatedTile[]) => {
    const matchedIds = new Set<string>();
    const summonedThisRound: UnitType[] = [];
    const allGroups: AnimatedTile[][] = [];

    const addGroup = (matchGroup: AnimatedTile[]) => {
      if (matchGroup.length >= 3) {
        allGroups.push([...matchGroup]);
        matchGroup.forEach(t => matchedIds.add(t.id));
      }
    };

    for (let y = 0; y < GRID_SIZE; y++) {
      let count = 1;
      for (let x = 1; x <= GRID_SIZE; x++) {
        const t1 = getTileAt(x, y, currentTiles);
        const t2 = getTileAt(x - 1, y, currentTiles);
        if (x < GRID_SIZE && t1 && t2 && t1.type === t2.type) count++;
        else {
          if (count >= 3) {
            const group = [];
            for (let i = x - count; i < x; i++) {
              const t = getTileAt(i, y, currentTiles);
              if (t) group.push(t);
            }
            addGroup(group);
          }
          count = 1;
        }
      }
    }

    for (let x = 0; x < GRID_SIZE; x++) {
      let count = 1;
      for (let y = 1; y <= GRID_SIZE; y++) {
        const t1 = getTileAt(x, y, currentTiles);
        const t2 = getTileAt(x, y - 1, currentTiles);
        if (y < GRID_SIZE && t1 && t2 && t1.type === t2.type) count++;
        else {
          if (count >= 3) {
            const group = [];
            for (let i = y - count; i < y; i++) {
              const t = getTileAt(x, i, currentTiles);
              if (t) group.push(t);
            }
            addGroup(group);
          }
          count = 1;
        }
      }
    }

    const checkDiagonals = (startX: number, startY: number, dx: number, dy: number) => {
      let curX = startX;
      let curY = startY;
      let count = 1;
      let lastType: UnitType | null = null;
      let group: AnimatedTile[] = [];

      while (curX >= 0 && curX < GRID_SIZE && curY >= 0 && curY < GRID_SIZE) {
        const t = getTileAt(curX, curY, currentTiles);
        if (t && t.type === lastType) {
          count++;
          group.push(t);
        } else {
          if (count >= 3) addGroup(group);
          count = 1;
          lastType = t ? t.type : null;
          group = t ? [t] : [];
        }
        curX += dx;
        curY += dy;
      }
      if (count >= 3) addGroup(group);
    };

    for (let i = 0; i < GRID_SIZE; i++) {
      checkDiagonals(i, 0, 1, 1);
      if (i > 0) checkDiagonals(0, i, 1, 1);
      checkDiagonals(i, 0, -1, 1);
      if (i > 0) checkDiagonals(GRID_SIZE - 1, i, -1, 1);
    }

    const tileOccurrenceCount = new Map<string, number>();
    const bonusGivenForTile = new Set<string>();

    allGroups.forEach(group => {
      if (group[0].type !== UnitType.BLANK) {
        summonedThisRound.push(group[0].type);
        group.forEach(t => {
          const count = (tileOccurrenceCount.get(t.id) || 0) + 1;
          tileOccurrenceCount.set(t.id, count);
          if (count > 1 && !bonusGivenForTile.has(t.id)) {
            summonedThisRound.push(t.type);
            bonusGivenForTile.add(t.id);
          }
        });
      }
    });

    return { matchedIds, summonedThisRound };
  };

  const processBoard = async (currentTiles: AnimatedTile[]) => {
    setIsProcessing(true);
    const { matchedIds, summonedThisRound } = checkMatches(currentTiles);

    if (matchedIds.size === 0) {
      setIsProcessing(false);
      return;
    }

    audio.playMatch();
    let updated = currentTiles.map(t => matchedIds.has(t.id) ? { ...t, isRemoving: true } : t);
    setTiles(updated);
    
    if (summonedThisRound.length > 0) {
      setSummoned(prev => [...prev, ...summonedThisRound]);
      onScoreUpdate(summonedThisRound.length * 10);
    }
    
    await new Promise(r => setTimeout(r, 300));

    updated = updated.filter(t => !matchedIds.has(t.id));
    const finalTiles: AnimatedTile[] = [];
    
    for (let x = 0; x < GRID_SIZE; x++) {
      let emptyCount = 0;
      for (let y = GRID_SIZE - 1; y >= 0; y--) {
        const tileIndex = updated.findIndex(t => t.x === x && t.y === y);
        if (tileIndex === -1) emptyCount++;
        else {
          if (emptyCount > 0) updated[tileIndex].y += emptyCount;
          finalTiles.push(updated[tileIndex]);
        }
      }
      for (let i = 1; i <= emptyCount; i++) {
        finalTiles.push(generateTile(x, -i));
      }
    }

    setTiles([...finalTiles]);
    await new Promise(r => setTimeout(r, 50));

    const resolvedGrid: AnimatedTile[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const column = finalTiles.filter(t => t.x === x).sort((a, b) => b.y - a.y);
      column.forEach((t, i) => {
        t.y = GRID_SIZE - 1 - i;
        resolvedGrid.push(t);
      });
    }

    setTiles([...resolvedGrid]);
    await new Promise(r => setTimeout(r, 400));
    processBoard(resolvedGrid);
  };

  const handleTileClick = async (tile: AnimatedTile) => {
    if (isProcessing || movesLeft <= 0 || tile.isRemoving) return;
    audio.playClick();

    if (!selectedTileId) {
      setSelectedTileId(tile.id);
      return;
    }

    const selected = tiles.find(t => t.id === selectedTileId);
    if (!selected || selected.id === tile.id) {
      setSelectedTileId(null);
      return;
    }

    const dx = Math.abs(selected.x - tile.x);
    const dy = Math.abs(selected.y - tile.y);

    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      setIsProcessing(true);
      const swappedTiles = tiles.map(t => {
        if (t.id === selected.id) return { ...t, x: tile.x, y: tile.y };
        if (t.id === tile.id) return { ...t, x: selected.x, y: selected.y };
        return t;
      });
      
      setTiles(swappedTiles);
      setMovesLeft(prev => prev - 1);
      setSelectedTileId(null);

      await new Promise(r => setTimeout(r, 300));

      const { matchedIds } = checkMatches(swappedTiles);
      if (matchedIds.size > 0) processBoard(swappedTiles);
      else setIsProcessing(false);
    } else {
      setSelectedTileId(tile.id);
    }
  };

  const getLabel = (type: UnitType) => {
    switch(type) {
        case UnitType.ARCHER: return '弓';
        case UnitType.SWORDSMAN: return '盾';
        case UnitType.SPEARMAN: return '矛';
        case UnitType.CAVALRY: return '骑';
        default: return '';
    }
  }

  return (
    <div className="flex flex-col items-center gap-10 z-10 w-full max-w-2xl px-4">
      <div className="flex justify-between w-full px-6 py-4 bg-black/60 hand-drawn-border items-center">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-400">剩余步数</span>
          <span className="text-2xl text-yellow-400 font-bold tracking-widest">{movesLeft}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-zinc-400">已募兵力</span>
          <span className="text-2xl text-green-400 font-bold tracking-widest">{summoned.length}</span>
        </div>
      </div>

      <div 
        className="relative bg-zinc-800/50 p-4 hand-drawn-border overflow-hidden"
        style={{ 
          width: GRID_SIZE * TILE_SIZE + (GRID_SIZE - 1) * GAP + 32, 
          height: GRID_SIZE * TILE_SIZE + (GRID_SIZE - 1) * GAP + 32 
        }}
      >
        {tiles.map((tile) => (
          <div
            key={tile.id}
            onClick={() => handleTileClick(tile)}
            className={`
              absolute flex items-center justify-center cursor-pointer
              transition-all duration-300 ease-out overflow-hidden
              ${tile.isRemoving ? 'scale-0 opacity-0 rotate-90' : 'scale-100 opacity-100'}
              ${selectedTileId === tile.id ? 'z-20 scale-105 brightness-125' : 'z-10'}
            `}
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              left: 16 + tile.x * (TILE_SIZE + GAP),
              top: 16 + tile.y * (TILE_SIZE + GAP),
              backgroundColor: UNIT_COLORS[tile.type],
              imageRendering: 'pixelated',
              boxShadow: tile.type === UnitType.BLANK 
                ? 'inset 4px 4px 0px rgba(0,0,0,0.05), inset -4px -4px 0px rgba(255,255,255,0.5)' 
                : 'inset 6px 6px 0px rgba(255,255,255,0.4), inset -6px -6px 0px rgba(0,0,0,0.4)',
              border: selectedTileId === tile.id ? '4px solid #fff' : '2px solid rgba(0,0,0,0.3)',
              borderRadius: '8px'
            }}
          >
            {tile.type !== UnitType.BLANK && (
               <>
                 <div className="absolute top-1 left-1 w-3 h-3 bg-white/30 rounded-full"></div>
                 <div className="text-white pixel-text-shadow font-bold text-2xl select-none z-10">
                   {getLabel(tile.type)}
                 </div>
               </>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-8 w-full">
        {movesLeft === 0 && !isProcessing ? (
          <button 
            onClick={() => { audio.playClick(); onEnd(summoned); }}
            className="w-20 h-20 bg-red-600 hover:bg-red-700 text-white pixel-border pixel-shadow square-btn text-lg font-bold"
          >
            出击
          </button>
        ) : (
          <div className="h-12 flex items-center justify-center">
            {isProcessing ? (
              <div className="text-xs text-yellow-400 animate-pulse tracking-widest font-bold">
                战前整顿中...
              </div>
            ) : (
              <div className="text-[10px] text-zinc-500 text-center leading-relaxed">
                消除一组兵块召唤 1 名士兵<br/>
                <span className="text-white">交叉特殊形状</span> 可额外召唤士兵
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2 max-w-sm min-h-[40px] p-4 bg-black/40 hand-drawn-border border-zinc-800">
          {summoned.slice(-24).map((u, i) => (
            <div 
              key={i} 
              className="w-4 h-4 border border-white/20 rounded-sm"
              style={{ backgroundColor: UNIT_COLORS[u] }}
            />
          ))}
          {summoned.length > 24 && <span className="text-[10px] text-zinc-500 self-center">...</span>}
        </div>
      </div>
    </div>
  );
};

export default MatchThree;
