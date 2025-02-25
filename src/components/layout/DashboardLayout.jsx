import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart2, 
  Settings, 
  LogOut, 
  Menu as MenuIcon,
  TrendingUp,
  History,
  Utensils,
  Sparkles,
  MessageSquareText
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { Link } from 'react-router-dom';

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation(); // Important for highlighting active link
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Define the navigation items - ensure correct paths
  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Past Searches', icon: History, href: '/past-searches' },
    { name: 'Spending Trends', icon: TrendingUp, href: '/trends' },
    // ML features
    { name: 'Meal Recommendations', icon: Utensils, href: '/meal-recommendations' },
    { name: 'Spending Predictions', icon: Sparkles, href: '/spending-predictions' },
    { name: 'Meal Plan Assistant', icon: MessageSquareText, href: '/assistant' },
    { name: 'Preferences', icon: Settings, href: '/preferences' }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 transform transition-transform duration-200 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-bold text-white">Meal Plan Optimizer</h1>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <MenuIcon size={24} />
            </button>
          </div>
          
          {/* ML Features Highlight */}
          <div className="mx-4 my-2 px-3 py-2 bg-indigo-600/20 border border-indigo-500 rounded-lg">
            <div className="flex items-center mb-2">
              <Sparkles className="h-4 w-4 text-indigo-400 mr-2" />
              <span className="text-indigo-300 text-sm font-medium">AI-Powered Features</span>
            </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const isMLFeature = ['/meal-recommendations', '/spending-predictions', '/assistant'].includes(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  } ${isMLFeature ? 'relative' : ''}`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                  {isMLFeature && !isActive && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-500"></span>
                  )}
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors duration-200"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`lg:pl-64 min-h-screen bg-gray-900 transition-all duration-200 ${
        isSidebarOpen ? 'lg:ml-0' : 'lg:-ml-64'
      }`}>
        <div className="sticky top-0 z-40 lg:hidden flex items-center px-4 py-2 bg-gray-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <MenuIcon size={24} />
          </button>
        </div>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}