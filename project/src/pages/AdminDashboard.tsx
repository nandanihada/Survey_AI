/**
 * Admin dashboard with user management
 */
import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import Header from '../components/Header';

interface User {
  _id?: string;
  uid: string;
  email: string;
  name: string;
  photo_url?: string;
  role: 'basic' | 'premium' | 'enterprise' | 'admin';
  status?: 'approved' | 'disapproved' | 'locked';
  created_at: string;
  last_login: string;
}

interface Survey {
  _id: string;
  short_id: string;
  title: string;
  status: string;
  created_at: string;
  owner?: {
    name: string;
    email: string;
  };
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'surveys'>('users');

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Fetching users with token:', token ? 'Token present' : 'No token');
      
      const response = await fetch(`${baseUrl}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Fetch users response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users data:', data);
        setUsers(data.users || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch users:', response.status, errorData);
        alert(`Failed to fetch users: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fetchAllSurveys = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/api/surveys/admin/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSurveys(data.surveys || []);
      }
    } catch (error) {
      console.error('Failed to fetch surveys:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Check current user's token and role
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          // Decode JWT token to check role (basic decode, not verification)
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('Current user token payload:', payload);
            console.log('User role:', payload.role);
            console.log('User features:', payload.features);
            
            if (payload.role !== 'admin') {
              alert(`Warning: You are logged in as '${payload.role}', but admin access is required. Please contact an administrator to upgrade your role.`);
            }
          }
        } catch (e) {
          console.error('Failed to decode token:', e);
        }
      }
      
      if (activeTab === 'users') {
        await fetchUsers();
      } else {
        await fetchAllSurveys();
      }
      setLoading(false);
    };
    loadData();
  }, [activeTab]);

  const updateUserRole = async (userId: string, newRole: 'basic' | 'premium' | 'enterprise' | 'admin') => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Updating role for user:', userId, 'to:', newRole);
      
      const response = await fetch(`${baseUrl}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ role: newRole }),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);

      if (response.ok) {
        console.log('Role updated successfully:', result.message);
        setUsers(users.map(user => 
          (user._id || user.uid) === userId ? { ...user, role: newRole } : user
        ));
        
        // Trigger permission refresh for affected user
        const updatedUser = users.find(u => (u._id || u.uid) === userId);
        if (updatedUser) {
          // If global refresh function is available, call it
          if ((window as any).refreshUserPermissions) {
            setTimeout(() => {
              (window as any).refreshUserPermissions();
            }, 1000);
          }
          
          alert(`Success: ${result.message}\n\nPermissions will be refreshed automatically. User should see new features within 30 seconds.`);
        }
      } else {
        console.error('Failed to update role:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: 'approved' | 'disapproved' | 'locked') => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Updating status for user:', userId, 'to:', newStatus);
      
      const response = await fetch(`${baseUrl}/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ status: newStatus }),
      });

      console.log('Status response status:', response.status);
      const result = await response.json();
      console.log('Status response data:', result);

      if (response.ok) {
        console.log('Status updated successfully:', result.message);
        setUsers(users.map(user => 
          (user._id || user.uid) === userId ? { ...user, status: newStatus } : user
        ));
        alert(`Success: ${result.message}`);
      } else {
        console.error('Failed to update status:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-2 text-gray-600">Manage users and surveys</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'users'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setActiveTab('surveys')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'surveys'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Surveys
                </button>
              </nav>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Users Tab */}
                {activeTab === 'users' && (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {users.map((user) => (
                        <li key={user._id || user.uid} className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {user.photo_url ? (
                                <img
                                  className="h-10 w-10 rounded-full"
                                  src={user.photo_url}
                                  alt={user.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name}
                                </div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                                <div className="text-xs text-gray-400">
                                  Joined {new Date(user.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="flex flex-col space-y-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-700">Role:</span>
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      user.role === 'admin'
                                        ? 'bg-purple-100 text-purple-800'
                                        : user.role === 'enterprise'
                                        ? 'bg-blue-100 text-blue-800'
                                        : user.role === 'premium'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {user.role}
                                  </span>
                                  <select
                                    value={user.role}
                                    onChange={(e) =>
                                      updateUserRole(user._id || user.uid, e.target.value as 'basic' | 'premium' | 'enterprise' | 'admin')
                                    }
                                    className="text-sm border-gray-300 rounded-md"
                                  >
                                    <option value="basic">Basic</option>
                                    <option value="premium">Premium</option>
                                    <option value="enterprise">Enterprise</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-700">Status:</span>
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      (user.status || 'approved') === 'approved'
                                        ? 'bg-green-100 text-green-800'
                                        : (user.status || 'approved') === 'disapproved'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {user.status || 'approved'}
                                  </span>
                                  <select
                                    value={user.status || 'approved'}
                                    onChange={(e) =>
                                      updateUserStatus(user._id || user.uid, e.target.value as 'approved' | 'disapproved' | 'locked')
                                    }
                                    className="text-sm border-gray-300 rounded-md"
                                  >
                                    <option value="approved">Approved</option>
                                    <option value="disapproved">Disapproved</option>
                                    <option value="locked">Locked</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Surveys Tab */}
                {activeTab === 'surveys' && (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {surveys.map((survey) => (
                        <li key={survey._id} className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-gray-900">
                                  {survey.title}
                                </h3>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    survey.status === 'published'
                                      ? 'bg-green-100 text-green-800'
                                      : survey.status === 'draft'
                                      ? 'bg-gray-100 text-gray-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {survey.status}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500">
                                <span>ID: {survey.short_id}</span>
                                {survey.owner && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span>Owner: {survey.owner.name}</span>
                                  </>
                                )}
                                <span className="mx-2">•</span>
                                <span>Created {new Date(survey.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <a
                                href={`/survey/${survey.short_id}`}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                View
                              </a>
                              <a
                                href={`/edit/${survey.short_id}`}
                                className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                              >
                                Edit
                              </a>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
