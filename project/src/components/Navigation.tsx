import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Settings, BarChart3, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavigationProps {
  isDarkMode?: boolean;
}

export default function Navigation({ isDarkMode = false }: NavigationProps) {
  const location = useLocation();
  const { user, logout, hasFeature } = useAuth();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      requiresFeature: null
    },
    {
      name: 'My Surveys',
      href: '/surveys',
      icon: BarChart3,
      requiresFeature: 'survey'
    },
    {
      name: 'Users',
      href: '/users',
      icon: Users,
      requiresFeature: 'admin',
      adminOnly: true
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      requiresFeature: null
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      requiresFeature: null
    }
  ];

  const filteredItems = navigationItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (item.requiresFeature && !hasFeature(item.requiresFeature)) return false;
    return true;
  });

  return (
    <nav className={`w-64 min-h-screen ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-r`}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-red-500/20' : 'bg-red-50'}`}>
            <img
              src="https://i.postimg.cc/9Mhc6NJ6/chilllllllli.png"
              alt="Logo"
              className="w-6 h-6"
              style={{ filter: 'drop-shadow(0 0 4px red)' }}
            />
          </div>
          <div>
            <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              PepperAds
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Survey Platform
            </p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
            <User size={20} className={isDarkMode ? 'text-slate-400' : 'text-gray-600'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {user?.name || 'User'}
            </p>
            <p className={`text-xs truncate ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="p-4 space-y-2">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? isDarkMode
                    ? 'bg-red-500 text-white'
                    : 'bg-red-50 text-red-600 border border-red-200'
                  : isDarkMode
                  ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <div className="absolute bottom-4 left-4 right-4">
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isDarkMode
              ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
