import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SpendingTrends() {
  const spendingData = [
    { name: 'East Commons', amount: 450 },
    { name: 'Pollock', amount: 300 },
    { name: 'West', amount: 200 },
    { name: 'North', amount: 150 },
    { name: 'South', amount: 100 }
  ];

  const timeData = [
    { date: '2024-01', amount: 320 },
    { date: '2024-02', amount: 280 },
    { date: '2024-03', amount: 350 },
    { date: '2024-04', amount: 290 }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Spending Trends</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Spending Locations */}
        <div className="bg-gray-800 p-6 rounded-lg h-[400px]">
          <h2 className="text-lg font-semibold text-white mb-4">Top Spending Locations</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spending Over Time */}
        <div className="bg-gray-800 p-6 rounded-lg h-[400px]">
          <h2 className="text-lg font-semibold text-white mb-4">Spending Over Time</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#82ca9d" 
                  dot={{ fill: '#82ca9d' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Most Frequent Location</p>
              <p className="text-xl font-semibold text-white">East Commons</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Average Transaction</p>
              <p className="text-xl font-semibold text-white">$12.50</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Peak Spending Time</p>
              <p className="text-xl font-semibold text-white">12:00 PM</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Monthly Average</p>
              <p className="text-xl font-semibold text-white">$310</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}