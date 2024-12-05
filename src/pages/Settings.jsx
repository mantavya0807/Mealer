// src/pages/Dashboard.jsx
import React from 'react';

function Dashboard() {
  return (
    <div className="ml-64 p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Current Balance</h3>
          <p className="text-3xl font-bold text-gray-700 mt-2">$1,234.56</p>
        </div>
        
        {/* Daily Budget Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Daily Budget</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">$25.00</p>
        </div>
        
        {/* Days Remaining Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Days Remaining</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">45</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;