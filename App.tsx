
import React, { useState } from 'react';
import { GamePhase, UnitType, GameState, BattleStats, SkillType } from './types';
import { INITIAL_MOVES } from './constants';
import { audio } from './utils/audio';
import MatchThree from './components/MatchThree';
import Battlefield from './components/Battlefield';
import PostBattle from './components/PostBattle';
import UpgradeMenu from './components/UpgradeMenu';
import StartScreen from './components/StartScreen';
import UnitShowcase from './components/UnitShowcase';
import TestMode from './components/TestMode';

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.START);
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    diamonds: 0,
    score: 0,
    movesRemaining: INITIAL_MOVES,
    playerQueue: [],
    upgrades: {
      attackBonus: 0,
      hpBonus: 0,
      initialMoves: 0,
    },
    survivingUnits: [],
    lastVictory: false,
    skills: [],
  });

  const handleStartGame = () => {
    audio.playClick();
    setGameState(prev => ({
      ...prev,
      movesRemaining: INITIAL_MOVES + prev.upgrades.initialMoves,
      playerQueue: [],
      score: 0,
      survivingUnits: prev.lastVictory ? prev.survivingUnits : [],
    }));
    setPhase(GamePhase.MATCH_THREE);
  };

  const handleMatchThreeEnd = (summonedUnits: UnitType[]) => {
    audio.playSummon();
    setGameState(prev => ({ ...prev, playerQueue: summonedUnits }));
    setPhase(GamePhase.BATTLE);
  };

  const handleBattleEnd = (victory: boolean, finalScore: number, stats: BattleStats, survivors: UnitType[]) => {
    if (victory) {
      audio.playVictory();
      setGameState(prev => ({
        ...prev,
        score: finalScore,
        diamonds: prev.diamonds + Math.floor(finalScore / 10),
        lastBattleStats: stats,
        survivingUnits: survivors,
        lastVictory: true,
      }));
    } else {
      audio.playDefeat();
      setGameState(prev => ({
        ...prev,
        level: 1,
        diamonds: 0,
        score: 0,
        lastBattleStats: stats,
        survivingUnits: [],
        lastVictory: false,
      }));
    }
    setPhase(GamePhase.POST_BATTLE);
  };

  const handleContinue = () => {
    audio.playClick();
    setGameState(prev => ({
      ...prev,
      level: prev.level + 1,
      score: 0,
      movesRemaining: INITIAL_MOVES + prev.upgrades.initialMoves,
      playerQueue: [],
      survivingUnits: prev.survivingUnits,
    }));
    setPhase(GamePhase.MATCH_THREE);
  };

  const handleRetry = () => {
    audio.playClick();
    setGameState(prev => ({
      ...prev,
      level: 1,
      diamonds: 0,
      score: 0,
      movesRemaining: INITIAL_MOVES + prev.upgrades.initialMoves,
      playerQueue: [],
      survivingUnits: [],
      lastBattleStats: undefined,
      lastVictory: false,
      skills: [],
    }));
    setPhase(GamePhase.MATCH_THREE);
  };

  const handleGoToUpgrade = () => {
    audio.playClick();
    setPhase(GamePhase.UPGRADE);
  };
  
  const handleBackToPostBattle = () => {
    audio.playClick();
    setPhase(GamePhase.POST_BATTLE);
  };

  const handleBackToStart = () => {
    audio.playClick();
    setPhase(GamePhase.START);
  };

  const handleGoToShowcase = () => {
    setPhase(GamePhase.SHOWCASE);
  };

  const handleTestMode = () => {
    audio.playClick();
    setPhase(GamePhase.TEST_MODE);
  };

  const applyUpgrade = (type: 'attack' | 'hp' | 'moves', cost: number) => {
    if (gameState.diamonds >= cost) {
      audio.playMatch();
      setGameState(prev => ({
        ...prev,
        diamonds: prev.diamonds - cost,
        upgrades: {
          ...prev.upgrades,
          attackBonus: type === 'attack' ? prev.upgrades.attackBonus + 2 : prev.upgrades.attackBonus,
          hpBonus: type === 'hp' ? prev.upgrades.hpBonus + 10 : prev.upgrades.hpBonus,
          initialMoves: type === 'moves' ? prev.upgrades.initialMoves + 2 : prev.upgrades.initialMoves,
        }
      }));
    } else {
      audio.playError();
    }
  };

  const handleBuySkill = (skillType: SkillType, cost: number) => {
    audio.playClick();
    setGameState(prev => {
      if (prev.diamonds < cost) return prev;
      const existingSkill = prev.skills.find(s => s.type === skillType);
      let newSkills;
      if (existingSkill) {
        newSkills = prev.skills.map(s => 
          s.type === skillType ? { ...s, quantity: s.quantity + 1 } : s
        );
      } else {
        newSkills = [...prev.skills, { type: skillType, quantity: 1 }];
      }
      return {
        ...prev,
        diamonds: prev.diamonds - cost,
        skills: newSkills,
      };
    });
  };

  const handleUseSkill = (skillType: SkillType) => {
    setGameState(prev => {
      const existingSkill = prev.skills.find(s => s.type === skillType);
      if (!existingSkill || existingSkill.quantity <= 0) return prev;
      
      const newSkills = prev.skills.map(s => 
        s.type === skillType ? { ...s, quantity: s.quantity - 1 } : s
      ).filter(s => s.quantity > 0);
      
      return {
        ...prev,
        skills: newSkills,
      };
    });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-zinc-900 flex flex-col items-center justify-center p-4">
      {/* Background Layer */}
      <div className="absolute inset-0 opacity-20 pointer-events-none select-none">
        <div className="w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"></div>
      </div>

      {phase === GamePhase.START && (
        <StartScreen onStart={handleStartGame} onShowcase={handleGoToShowcase} onTestMode={handleTestMode} />
      )}

      {phase === GamePhase.SHOWCASE && (
        <UnitShowcase onBack={handleBackToStart} />
      )}

      {phase === GamePhase.TEST_MODE && (
        <TestMode onBack={handleBackToStart} />
      )}

      {phase === GamePhase.MATCH_THREE && (
        <MatchThree 
          moves={gameState.movesRemaining} 
          onEnd={handleMatchThreeEnd} 
          onScoreUpdate={(s) => setGameState(prev => ({ ...prev, score: prev.score + s }))}
        />
      )}

      {phase === GamePhase.BATTLE && (
        <Battlefield 
          playerUnits={gameState.playerQueue}
          level={gameState.level}
          upgrades={gameState.upgrades}
          survivingUnits={gameState.survivingUnits}
          skills={gameState.skills}
          onBattleEnd={handleBattleEnd}
          onUseSkill={handleUseSkill}
        />
      )}

      {phase === GamePhase.POST_BATTLE && (
        <PostBattle 
          score={gameState.score} 
          level={gameState.level}
          diamonds={gameState.diamonds}
          isVictory={gameState.lastVictory}
          survivingUnits={gameState.survivingUnits}
          stats={gameState.lastBattleStats}
          onContinue={handleContinue}
          onRetry={handleRetry}
          onUpgrade={handleGoToUpgrade}
        />
      )}

      {phase === GamePhase.UPGRADE && (
        <UpgradeMenu 
          diamonds={gameState.diamonds}
          upgrades={gameState.upgrades}
          skills={gameState.skills}
          onApplyUpgrade={applyUpgrade}
          onBuySkill={handleBuySkill}
          onBack={handleBackToPostBattle}
        />
      )}
    </div>
  );
};

export default App;
