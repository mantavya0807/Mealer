import React, { useState } from 'react';
import { 
  Gamepad2, 
  Utensils, 
  Brain, 
  Calculator, 
  ArrowLeft,
  Loader
} from 'lucide-react';

import FoodCatcher from './games/FoodCatcher';
import MemoryGame from './games/MemoryGame';
import MathGame from './games/MathGame';
import TypeGame from './games/TypeGame';

const GAMES = [
  {
    id: 'food-catcher',
    name: 'Food Catcher',
    description: 'Catch falling food items with your plate',
    icon: Utensils,
    component: FoodCatcher,
    theme: 'indigo'
  },
  {
    id: 'memory',
    name: 'Food Memory',
    description: 'Match pairs of PSU dining items',
    icon: Brain,
    component: MemoryGame,
    theme: 'purple'
  },
  {
    id: 'math',
    name: 'Budget Calculator',
    description: 'Quick math with dining dollars',
    icon: Calculator,
    component: MathGame,
    theme: 'emerald'
  },
  {
    id: 'type',
    name: 'Menu Typer',
    description: 'Type menu items as fast as you can',
    icon: Gamepad2,
    component: TypeGame,
    theme: 'rose'
  }
];

export default function LoadingGames({ onQuit }) {
  const [selectedGame, setSelectedGame] = useState(null);
  
  if (selectedGame) {
    const Game = selectedGame.component;
    return (
      <div className="bg-gray-800 p-8 rounded-lg space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setSelectedGame(null)}
            className="text-gray-400 hover:text-white flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Games</span>
          </button>
          <h2 className="text-xl font-bold text-white">{selectedGame.name}</h2>
        </div>
        <Game 
          onQuit={onQuit}
          onBack={() => setSelectedGame(null)} 
        />
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-8 rounded-lg max-w-2xl">
      <div className="text-center mb-8">
        <Gamepad2 className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white">Pick a Game!</h2>
        <p className="text-gray-300 mt-2">
          While your data is being processed, enjoy one of these games
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GAMES.map((game) => {
          const Icon = game.icon;
          return (
            <button
              key={game.id}
              onClick={() => setSelectedGame(game)}
              className={`p-6 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors
                duration-200 text-left flex items-start space-x-4
                border-2 border-transparent hover:border-${game.theme}-500`}
            >
              <div className={`p-3 rounded-lg bg-${game.theme}-500/10 text-${game.theme}-400`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{game.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{game.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={onQuit}
          className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-gray-600 hover:border-gray-500"
        >
          Skip Games
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center text-gray-400 text-sm">
        <Loader className="animate-spin w-4 h-4 mr-2" />
        <span>Processing your data...</span>
      </div>
    </div>
  );
}