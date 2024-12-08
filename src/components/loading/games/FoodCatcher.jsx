import React, { useState, useEffect, useCallback } from 'react';
import { Gamepad2, Loader } from 'lucide-react';

export default function FoodCatcher({ onQuit, onBack }) {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const [plate, setPlate] = useState({
    x: 160,
    width: 80,
    height: 20
  });

  const [food, setFood] = useState({
    x: Math.random() * 320,
    y: 0,
    speed: 3,
    type: '🍔'
  });

  const foods = ['🍔', '🍕', '🌮', '🍜', '🍱', '🍣', '🥗', '🥪'];
  const getRandomFood = () => foods[Math.floor(Math.random() * foods.length)];

  const handleKeyPress = useCallback((e) => {
    if (gameStarted) {
      const moveAmount = 20;
      if (e.key === 'ArrowLeft') {
        setPlate(prev => ({
          ...prev,
          x: Math.max(0, prev.x - moveAmount)
        }));
      } else if (e.key === 'ArrowRight') {
        setPlate(prev => ({
          ...prev,
          x: Math.min(320 - prev.width, prev.x + moveAmount)
        }));
      }
    }
  }, [gameStarted]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    if (!gameStarted) return;

    const gameLoop = setInterval(() => {
      setFood(prev => {
        const newY = prev.y + prev.speed;

        if (newY >= 380 && newY <= 400) {
          if (prev.x >= plate.x - 20 && prev.x <= plate.x + plate.width) {
            setScore(s => s + 1);
            return {
              x: Math.random() * 320,
              y: 0,
              speed: 3 + Math.floor(score / 5),
              type: getRandomFood()
            };
          }
        }

        if (newY > 400) {
          setHighScore(s => Math.max(s, score));
          setScore(0);
          return {
            x: Math.random() * 320,
            y: 0,
            speed: 3,
            type: getRandomFood()
          };
        }

        return { ...prev, y: newY };
      });
    }, 16);

    return () => clearInterval(gameLoop);
  }, [gameStarted, plate.x, plate.width, score]);

  const handleStartGame = () => {
    setGameStarted(true);
    setShowInstructions(false);
    setScore(0);
  };

  if (showInstructions) {
    return (
      <div className="bg-gray-800 p-8 rounded-lg max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <Gamepad2 className="w-16 h-16 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Catch the Food!</h2>
        <p className="text-gray-300">
          While we fetch your data, try to catch as much food as you can!
        </p>
        <div className="bg-gray-700 p-4 rounded-lg text-gray-300 text-sm">
          <p>Use ← → arrow keys to move the plate</p>
          <p>Catch the falling food items</p>
          <p>Don't let any food hit the ground!</p>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleStartGame}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium"
          >
            Start Game
          </button>
          <button
            onClick={onBack}
            className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-medium"
          >
            Choose Another Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-8 rounded-lg space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div className="text-white">
            Score: {score}
          </div>
          <button
            onClick={onQuit}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
          >
            Quit Game
          </button>
        </div>
        <div className="text-gray-400">
          High Score: {highScore}
        </div>
      </div>
      
      <div className="relative bg-gray-900 w-[320px] h-[400px] rounded-lg overflow-hidden">
        {/* Food */}
        <div 
          className="absolute text-4xl"
          style={{ 
            left: `${food.x}px`, 
            top: `${food.y}px`,
            transition: 'left 0.1s ease-out'
          }}
        >
          {food.type}
        </div>

        {/* Plate */}
        <div 
          className="absolute bottom-0 h-5 bg-gray-300 rounded-full"
          style={{ 
            left: `${plate.x}px`, 
            width: `${plate.width}px`,
            transition: 'left 0.1s ease-out'
          }}
        />
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-gray-400 text-sm">
          Use ← → arrow keys to move
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-300 text-sm"
          >
            Try Another Game
          </button>
          <button
            onClick={onQuit}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Quit Game
          </button>
        </div>
      </div>
    </div>
  );
}