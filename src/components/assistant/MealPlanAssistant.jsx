import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { auth } from '../../firebase/config';

export default function MealPlanAssistant({ className = '' }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi there! I'm your Penn State Meal Plan Assistant. I can help you make the most of your dining experience. Ask me about meal plans, dining locations, discounts, or how to stretch your dining dollars!"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "Which meal plan gives the best value?",
    "Where can I use my meal plan discount?",
    "How can I make my meal plan last longer?",
    "What are the dining commons hours?"
  ]);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;

    const userMessage = {
      role: 'user',
      content: inputValue
    };

    // Update UI immediately with user message
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send query to backend
      const response = await fetch('http://127.0.0.1:5000/api/ml/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: auth.currentUser?.email || 'guest',
          query: userMessage.content
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from assistant');
      }

      const data = await response.json();
      
      // Add assistant response to chat
      setMessages(prev => [
        ...prev, 
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources
        }
      ]);

      // Update suggested follow-up questions
      if (data.followup_questions && data.followup_questions.length > 0) {
        setSuggestedQuestions(data.followup_questions);
      }
    } catch (error) {
      console.error('Error querying assistant:', error);
      
      // Add error message if request fails
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm sorry, I encountered an error processing your request. Please try again later."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question) => {
    setInputValue(question);
  };

  return (
    <div className={`${className} bg-gray-800 rounded-lg overflow-hidden flex flex-col h-[600px]`}>
      {/* Header */}
      <div className="bg-indigo-900/30 p-4 border-b border-gray-700">
        <div className="flex items-center">
          <div className="bg-indigo-600 p-2 rounded-lg mr-3">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Meal Plan Assistant</h2>
            <p className="text-gray-400 text-sm">Powered by AI</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-3/4 rounded-lg p-3 ${
                message.role === 'user' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-700 text-gray-200'
              }`}
            >
              <div className="flex items-start">
                <div className={`rounded-full p-1 mr-2 ${
                  message.role === 'user' 
                    ? 'bg-indigo-700 text-white' 
                    : 'bg-indigo-600 text-white'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                </div>
                <div className="text-sm">
                  {message.content}
                  
                  {/* Sources */}
                  {message.role === 'assistant' && message.sources && (
                    <div className="mt-2 text-xs text-gray-400 border-t border-gray-600 pt-1">
                      <p className="font-medium mb-1">Sources:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {message.sources.map((source, idx) => (
                          <li key={idx} className="text-xs opacity-75">
                            {source.length > 120 ? `${source.substring(0, 120)}...` : source}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg p-3 text-gray-200">
              <div className="flex items-center">
                <RefreshCw className="h-4 w-4 animate-spin mr-2 text-indigo-400" />
                <p className="text-sm text-gray-400">Thinking...</p>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <div className="p-3 bg-gray-900/50 border-t border-gray-700">
          <p className="text-gray-400 text-xs mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestedQuestion(question)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1 px-2 rounded-lg flex items-center"
              >
                {question.length > 40 ? `${question.substring(0, 40)}...` : question}
                <ArrowRight className="h-3 w-3 ml-1" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-gray-700">
        <div className="flex items-center border border-gray-600 rounded-lg bg-gray-800 overflow-hidden">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about meal plans, dining locations, or tips..."
            className="flex-1 bg-transparent px-4 py-2 text-gray-200 outline-none text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`p-2 ${
              inputValue.trim() === '' || isLoading
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-indigo-400 hover:text-indigo-300'
            }`}
            disabled={inputValue.trim() === '' || isLoading}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}