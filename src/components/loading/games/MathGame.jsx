import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';

export default function MathGame({ onQuit, onBack }) {
  const [score, setScore] = useState(0);
  // Initialize problem with null
  const [problem, setProblem] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameStarted, setGameStarted] = useState(false); // Add this state

  const generateProblem = () => {
    const operations = ['+', '-', '*'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    let num1, num2;

    switch (op) {
      case '+':
        num1 = Math.floor(Math.random() * 50) + 1;
        num2 = Math.floor(Math.random() * 50) + 1;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 50) + 25;
        num2 = Math.floor(Math.random() * num1);
        break;
      case '*':
        num1 = Math.floor(Math.random() * 12) + 1;
        num2 = Math.floor(Math.random() * 12) + 1;
        break;
      default:
        num1 = num2 = 0;
    }

    return {
      num1,
      num2,
      operation: op,
      answer: eval(`${num1}${op}${num2}`)
    };
  };

  // Start game function
  const startGame = () => {
    setShowInstructions(false);
    setGameStarted(true);
    setProblem(generateProblem());
    setTimeLeft(30);
    setScore(0);
  };

  useEffect(() => {
    if (gameStarted) {
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
  }, [gameStarted]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const answer = parseFloat(userAnswer);
    
    if (answer === problem.answer) {
      setScore(s => s + 1);
      setFeedback('Correct! 🎉');
      setProblem(generateProblem());
    } else {
      setFeedback('Try again!');
    }
    setUserAnswer('');
  };

  if (showInstructions) {
    return (
      <div className="text-center space-y-6">
        <h3 className="text-xl font-bold text-white">Budget Calculator</h3>
        <p className="text-gray-300">Quick math challenges with dining dollars!</p>
        <div className="bg-gray-700 p-4 rounded-lg text-gray-300 text-sm">
          <p>Solve math problems quickly</p>
          <p>30 seconds to get as many right as possible</p>
          <p>Each correct answer = 1 point</p>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={startGame}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-medium"
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
        <p className="text-gray-300">Final Score: {score}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={startGame}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-medium"
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

      {problem && (
        <div className="bg-gray-700 p-6 rounded-lg text-center">
          <p className="text-2xl text-white mb-4">
            {problem.num1} {problem.operation} {problem.num2} = ?
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="number"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="w-32 text-center bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white"
              autoFocus
            />
            <button
              type="submit"
              className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
            >
              Submit
            </button>
          </form>
        </div>
      )}

      {feedback && (
        <p className="text-center text-white">{feedback}</p>
      )}

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