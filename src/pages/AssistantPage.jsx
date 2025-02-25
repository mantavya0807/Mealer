// src/pages/AssistantPage.jsx
import React, { useState } from 'react';
import { MessageSquareText, BookOpen, Info, AlertTriangle } from 'lucide-react';
import MealPlanAssistant from '../components/assistant/MealPlanAssistant';

export default function AssistantPage() {
  // The assistant doesn't need to pre-load user data
  // It will make requests as needed during conversation
  const [error, setError] = useState(null);

  // Sample FAQs for the assistant
  const faqs = [
    {
      question: "Which meal plan offers the best value?",
      answer: "The Level 3 meal plan offers the best value in terms of discount percentage. It costs $3,500 but provides $4,200 in dining value, which is a 20% bonus. However, the best plan for you depends on how often you eat on campus."
    },
    {
      question: "Where can I use my meal plan discount?",
      answer: "The 65% meal plan discount is only available at the five dining commons: Findlay (East), Waring (West), Redifer (South), North Food District, and Pollock Commons. The discount does not apply at the HUB, markets, or convenience stores."
    },
    {
      question: "How can I make my meal plan last longer?",
      answer: "To extend your meal plan, prioritize eating at dining commons where you receive the 65% discount, use LionCash at locations without meal plan discounts, visit dining commons during off-peak hours to avoid impulse purchases, and plan your meals ahead of time."
    },
    {
      question: "What are the dining commons hours?",
      answer: "Most dining commons are open from 7:00 AM to 10:00 PM Monday through Friday, with breakfast from 7:00-10:30 AM, lunch from 11:00 AM-2:00 PM, and dinner from 5:00-8:00 PM. Weekend hours may vary by location. You can check current hours on the Penn State Food Services website."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <MessageSquareText className="h-6 w-6 mr-2 text-indigo-400" />
            Meal Plan Assistant
          </h1>
          <p className="text-gray-400 mt-1">
            Your AI-powered guide to optimizing your Penn State dining experience
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
          <p className="font-medium flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Information Sidebar */}
        <div className="space-y-6">
          {/* How it Works */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Info className="h-5 w-5 mr-2 text-indigo-400" />
              How It Works
            </h2>
            <div className="space-y-4 text-gray-300 text-sm">
              <p>
                This AI assistant can answer questions about Penn State dining, meal plans, and campus food options.
              </p>
              <p>
                It analyzes your spending patterns to provide personalized recommendations tailored to your habits and preferences.
              </p>
              <p>
                Ask about meal plan options, dining locations, discounts, or how to stretch your dining dollars.
              </p>
            </div>
          </div>

          {/* Popular Questions */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-indigo-400" />
              Popular Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">{faq.question}</h3>
                  <p className="text-gray-400 text-sm">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Assistant */}
        <div className="lg:col-span-2">
          <MealPlanAssistant 
            className="w-full" 
          />
        </div>
      </div>
    </div>
  );
}