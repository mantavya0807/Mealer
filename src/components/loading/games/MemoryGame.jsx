import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';

const FOOD_EMOJIS = ['🍔', '🍕', '🌮', '🍜', '🍱', '🍣', '🥗', '🥪'];

export default function MemoryGame({ onQuit, onBack }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    // Initialize game
    const gameCards = [...FOOD_EMOJIS, ...FOOD_EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        content: emoji
      }));
    setCards(gameCards);
  }, []);

  const handleCardClick = (id) => {
    if (flipped.length === 2) return;
    if (flipped.includes(id)) return;
    if (matched.includes(id)) return;

    setFlipped([...flipped, id]);
    setMoves(m => m + 1);

    if (flipped.length === 1) {
      const firstCard = cards[flipped[0]];
      const secondCard = cards[id];

      if (firstCard.content === secondCard.content) {
        setMatched([...matched, flipped[0], id]);
        setScore(s => s + 10);
        setFlipped([]);
      } else {
        setTimeout(() => {
          setFlipped([]);
        }, 1000);
      }
    }
  };

  if (showInstructions) {
    return (
      <div className="text-center space-y-6">
        <h3 className="text-xl font-bold text-white">Memory Match</h3>
        <p className="text-gray-300">Match pairs of PSU dining items!</p>
        <div className="bg-gray-700 p-4 rounded-lg text-gray-300 text-sm">
          <p>Click cards to flip them</p>
          <p>Find matching pairs</p>
          <p>Complete the game with fewer moves</p>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setShowInstructions(false)}
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
    <div className="space-y-4">
      <div className="flex justify-between text-white mb-4">
        <div>Moves: {moves}</div>
        <div>Score: {score}</div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl
              transition-all duration-300 transform ${
                flipped.includes(card.id) || matched.includes(card.id)
                  ? 'bg-indigo-600 rotate-0'
                  : 'bg-gray-700 rotate-180'
              }`}
            disabled={flipped.length === 2 || matched.includes(card.id)}
          >
            {(flipped.includes(card.id) || matched.includes(card.id)) && card.content}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mt-4">
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