import { useState } from 'react';
import { Table, Eye } from 'lucide-react';

export default function PastSearches() {
  // Mock data - replace with Firebase data later
  const [searches] = useState([
    {
      id: 1,
      psuid: 'xyz123',
      datetime: '2024-02-01 14:30',
      reportUrl: '/reports/1'
    },
    {
      id: 2,
      psuid: 'xyz123',
      datetime: '2024-02-03 09:15',
      reportUrl: '/reports/2'
    }
  ]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Past Searches</h1>
      
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Search No.
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                PSU ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Report
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {searches.map((search) => (
              <tr key={search.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {search.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {search.psuid}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {search.datetime}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  <a 
                    href={search.reportUrl}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Report
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}