import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Settings, BarChart3, User, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavigationProps {
  isDarkMode?: boolean;
}

export default function Navigation({ isDarkMode = false }: NavigationProps) {
  const location = useLocation();
  const { user, logout, hasFeature } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
    },
    {
      name: 'My Surveys',
      href: '/dashboard/create?tab=surveys',
      icon: BarChart3,
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    }
  ];

  return (
    <nav className={`${collapsed ? 'w-16' : 'w-64'} min-h-screen sticky top-0 h-screen flex flex-col transition-all duration-200 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-r`}>
      {/* Logo + Collapse toggle */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-red-500/20' : 'bg-red-50'}`}>
            <img src="/logo.png" alt="Logo" className="w-6 h-6" />
          </div>
          {!collapsed && (
            <div>
              <h1 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Pepperwahl</h1>
              <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Survey Platform</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="text-gray-400 hover:text-gray-600 p-1">
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="p-2 flex justify-center">
          <button onClick={() => setCollapsed(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
              <User size={18} className={isDarkMode ? 'text-slate-400' : 'text-gray-600'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {user?.name || 'User'}
              </p>
              <p className={`text-[11px] truncate ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <div className={`flex-1 ${collapsed ? 'p-2' : 'p-4'} space-y-1`}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href.split('?')[0]);
          
          return (
            <Link
              key={item.name}
              to={item.href}
              title={collapsed ? item.name : undefined}
              className={`flex items-center ${collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'} rounded-lg transition-colors ${
                isActive
                  ? isDarkMode
                    ? 'bg-red-500 text-white'
                    : 'bg-red-50 text-red-600'
                  : isDarkMode
                  ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={collapsed ? 20 : 18} />
              {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <div className={`${collapsed ? 'p-2' : 'p-4'} border-t border-gray-100`}>
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'} rounded-lg transition-colors ${
            isDarkMode
              ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <LogOut size={collapsed ? 20 : 18} />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </nav>
  );
}
