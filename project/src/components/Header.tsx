/**
 * Header component with user authentication
 */
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { user, authenticated, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
            >
              Survey Dashboard
            </button>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              My Surveys
            </button>
            <button
              onClick={() => navigate('/dashboard/create')}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Create Survey
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Admin
              </button>
            )}
          </nav>

          {/* User Menu */}
          {authenticated && user && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {user.photo_url ? (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user.photo_url}
                    alt={user.name}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="hidden md:block text-gray-700 font-medium">
                  {user.name}
                </span>
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-gray-500">{user.email}</div>
                    <div className={`text-xs mt-1 capitalize ${
                      user.role === 'admin' ? 'text-purple-600' :
                      user.role === 'enterprise' ? 'text-blue-600' :
                      user.role === 'premium' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {user.role || 'basic'} user
                    </div>
                  </div>
                  <a
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </a>
                  <a
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </a>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
          >
            My Surveys
          </button>
          <button
            onClick={() => navigate('/dashboard/create')}
            className="text-gray-500 hover:text-gray-700 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
          >
            Create Survey
          </button>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="text-blue-600 hover:text-blue-700 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
            >
              Admin
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
