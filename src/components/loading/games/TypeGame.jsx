// src/components/loading/games/TypeGame.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Loader } from 'lucide-react';

const MENU_ITEMS = [
  "Grilled Cheese Sandwich",
  "Caesar Salad",
  "Penn State Burger",
  "Chicken Tenders",
  "Buffalo Wings",
  "French Fries",
  "Pizza Slice",
  "Ice Cream Cone",
  "Garden Fresh Salad",
  "Nittany Lion Sub",
  "Mac and Cheese",
  "Fruit Smoothie",
  "Veggie Wrap",
  "Coffee",
  "Chocolate Chip Cookie"
];

export default function TypeGame({ onQuit, onBack }) {
  const [currentWord, setCurrentWord] = useState('');
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const inputRef = useRef(null);

  const getRandomWord = () => {
    const word = MENU_ITEMS[Math.floor(Math.random() * MENU_ITEMS.length)];
    setCurrentWord(word);
    return word;
  };

  useEffect(() => {
    if (gameStarted && !showInstructions) {
      getRandomWord();
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameStarted, showInstructions]);

  const handleInputChange = (e) => {
    const input = e.target.value;
    setUserInput(input);

    if (input.toLowerCase() === currentWord.toLowerCase()) {
      setScore(s => s + 1);
      setUserInput('');
      getRandomWord();
    }
  };

  const startGame = () => {
    setShowInstructions(false);
    setGameStarted(true);
    setTimeLeft(30);
    setScore(0);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  if (showInstructions) {
    return (
      <div className="text-center space-y-6">
        <h3 className="text-xl font-bold text-white">Menu Typer</h3>
        <p className="text-gray-300">How fast can you type menu items?</p>
        <div className="bg-gray-700 p-4 rounded-lg text-gray-300 text-sm">
          <p>Type the menu items exactly as shown</p>
          <p>30 seconds to type as many as possible</p>
          <p>Case insensitive - capitalization doesn't matter</p>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={startGame}
            className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-lg font-medium"
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

  if (timeLeft === 0) {
    return (
      <div className="text-center space-y-6">
        <h3 className="text-2xl font-bold text-white">Time's Up!</h3>
        <p className="text-gray-300">Words Typed: {score}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={startGame}
            className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-lg font-medium"
          >
            Play Again
          </button>
          <button
            onClick={onBack}
            className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-medium"
          >
            Try Another Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between text-white">
        <div>Score: {score}</div>
        <div>Time: {timeLeft}s</div>
      </div>

      <div className="bg-gray-700 p-6 rounded-lg text-center">
        <p className="text-2xl text-white mb-4 min-h-[2.5rem]">
          {currentWord}
        </p>
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={handleInputChange}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white"
          placeholder="Type the menu item..."
          autoFocus
        />
      </div>

      <div className="flex justify-between">
        <button
          onClick={onQuit}
          className="text-red-400 hover:text-red-300 text-sm"
        >
          Quit Game
        </button>
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-300 text-sm"
        >
          Try Another Game
        </button>
      </div>
    </div>
  );
}