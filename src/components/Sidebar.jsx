
// src/components/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
  const location = useLocation();
  
  const navigation = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Statistics', path: '/statistics' },
    { name: 'Settings', path: '/settings' }
  ];

  return (
    <div className="bg-gray-800 w-64 min-h-screen fixed left-0 top-0">
      <div className="p-4">
        <h2 className="text-white text-xl font-bold">Menu</h2>
        <nav className="mt-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`block py-2 px-4 rounded ${
                location.pathname === item.path
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default Sidebar;