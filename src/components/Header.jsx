// src/components/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Meal Plan Optimizer</h1>
          <nav>
            <Link to="/profile" className="text-gray-500 hover:text-gray-700 mx-4">Profile</Link>
            <button className="text-gray-500 hover:text-gray-700">Sign Out</button>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;