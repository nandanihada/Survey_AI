/**
 * Admin dashboard with user management
 */
import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import Header from '../components/Header';
import FancyTable from '../components/FancyTable';
import SendNotificationModal from '../components/SendNotificationModal';
import { Bell, Filter, Save, Edit2, X, Check, ToggleLeft, ToggleRight, Eye, EyeOff, Play, RotateCcw, AlertCircle } from 'lucide-react';

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
  ownerUserId: string;
  creator_email?: string;
  creator_name?: string;
  total_sessions: number;
  total_responses: number;
  unique_ips: number;
  creator_info?: {
    _id: string;
    uid: string;
    email: string;
    name: string;
    role: 'basic' | 'premium' | 'enterprise' | 'admin';
    status: 'approved' | 'disapproved' | 'locked';
    createdAt: string;
    last_login?: string;
    simpleUserId?: string;
  };
  latest_session_info?: {
    session_id: string;
    ip_address: string;
    user_agent: string;
    click_id: string;
    session_started: string;
    survey_completed?: string;
    evaluation_status: string;
  };
}

interface Filter {
  _id: string;
  name: string;
  description: string;
  category: string;
  logic: any;
  rules: string;
  isEnabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface FilterFormData {
  name: string;
  description: string;
  category: string;
  logic: string;
  rules: string;
  isEnabled: boolean;
  priority: number;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'surveys' | 'filters'>('users');
  const [showNotifModal, setShowNotifModal] = useState(false);
  
  // Filter management states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Filter>>({});
  const [showJsonEditor, setShowJsonEditor] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [filterSuccess, setFilterSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // User functions
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

  // Survey functions
  const fetchAllSurveys = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Fetching surveys with token:', token ? 'Token present' : 'No token');
      
      const response = await fetch(`${baseUrl}/api/admin/surveys/comprehensive`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Surveys response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Surveys data received:', data);
        console.log('Number of surveys:', data.surveys?.length || 0);
        console.log('First survey sample:', data.surveys?.[0]);
        setSurveys(data.surveys || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch surveys:', response.status, errorData);
        alert(`Failed to fetch surveys: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to fetch surveys:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Filter functions
  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/admin/suggestion-filters`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFilters(data.filters || []);
        setFilterError(null);
      } else {
        const errorData = await response.json();
        setFilterError(`Failed to fetch filters: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setFilterError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const initializeFilters = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/admin/suggestion-filters/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFilterSuccess(data.message);
        await fetchFilters(); // Refresh the filters list
      } else {
        const errorData = await response.json();
        setFilterError(`Failed to initialize filters: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setFilterError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEdit = (filter: Filter) => {
    setEditingId(filter._id);
    setEditForm({
      name: filter.name,
      description: filter.description,
      category: filter.category,
      logic: typeof filter.logic === 'string' ? filter.logic : JSON.stringify(filter.logic, null, 2),
      rules: typeof filter.rules === 'string' ? filter.rules : JSON.stringify(filter.rules),
      isEnabled: filter.isEnabled,
      priority: filter.priority
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setShowJsonEditor(null);
  };

  const handleSave = async (filterId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      // Parse logic if it's a string
      let parsedLogic = editForm.logic;
      if (typeof editForm.logic === 'string') {
        try {
          parsedLogic = JSON.parse(editForm.logic);
        } catch (e) {
          setFilterError('Invalid JSON in logic configuration');
          setLoading(false);
          return;
        }
      }
      
      const response = await fetch(`${baseUrl}/admin/suggestion-filters/${filterId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          category: editForm.category,
          logic: parsedLogic,
          rules: editForm.rules,
          isEnabled: editForm.isEnabled,
          priority: editForm.priority
        })
      });

      if (response.ok) {
        setFilterSuccess('Filter updated successfully');
        setEditingId(null);
        setEditForm({});
        setShowJsonEditor(null);
        await fetchFilters();
      } else {
        const errorData = await response.json();
        setFilterError(`Failed to update filter: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setFilterError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (filterId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/admin/suggestion-filters/${filterId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFilterSuccess(data.message);
        await fetchFilters();
      } else {
        const errorData = await response.json();
        setFilterError(`Failed to toggle filter: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setFilterError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      } else if (activeTab === 'surveys') {
        await fetchAllSurveys();
      } else if (activeTab === 'filters') {
        await fetchFilters();
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

  const categories = ['all', 'Business', 'Demographic', 'Financial', 'Professional', 'Satisfaction', 'Location', 'Behavioral', 'Quality', 'Technical', 'Temporal'];
  const filteredFilters = selectedCategory === 'all' 
    ? filters 
    : filters.filter(f => f.category === selectedCategory);

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="mt-2 text-gray-600">Manage users, surveys, and system filters</p>
                </div>
                <button
                  onClick={() => setShowNotifModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <Bell size={16} />
                  Send Notification
                </button>
              </div>
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
                <button
                  onClick={() => setActiveTab('filters')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-1 ${
                    activeTab === 'filters'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Filter size={16} />
                  Suggestion Filters
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
                  <div>
                    {/* Debug info */}
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                      <h3 className="font-medium text-yellow-800">Debug Info:</h3>
                      <p className="text-sm text-yellow-700">
                        Surveys loaded: {surveys.length} | 
                        Loading: {loading ? 'Yes' : 'No'} | 
                        Data type: {Array.isArray(surveys) ? 'Array' : typeof surveys}
                      </p>
                      {surveys.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-yellow-700 cursor-pointer">Show first survey</summary>
                          <pre className="text-xs mt-2 p-2 bg-white rounded border overflow-auto max-h-32">
                            {JSON.stringify(surveys[0], null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    
                    {surveys.length === 0 ? (
                      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
                        <div className="text-center">
                          <p className="text-gray-500">Loading surveys...</p>
                          <p className="text-sm text-gray-400 mt-2">
                            If this persists, check the browser console for errors.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <FancyTable
                        data={surveys}
                        title="Survey Management Dashboard"
                        columns={[
                          {
                            key: 'title',
                            label: 'Survey Title',
                            sortable: true,
                            filterable: true,
                            width: '200px',
                            render: (value, row) => (
                              <div className="flex flex-col">
                                <div className="font-medium text-gray-900">{value}</div>
                                <div className="text-sm text-gray-500">ID: {row.short_id}</div>
                              </div>
                            )
                          },
                          {
                            key: 'status',
                            label: 'Status',
                            sortable: true,
                            filterable: true,
                            width: '120px',
                            render: (value) => (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  value === 'published'
                                    ? 'bg-green-100 text-green-800'
                                    : value === 'draft'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {value}
                              </span>
                            )
                          },
                          {
                            key: 'creator_info',
                            label: 'Creator',
                            sortable: true,
                            filterable: true,
                            width: '200px',
                            render: (value, row) => (
                              value ? (
                                <div className="flex flex-col">
                                  <div className="font-medium text-gray-900">{value.name}</div>
                                  <div className="text-sm text-gray-500">{value.email}</div>
                                  <div className="text-xs text-gray-400">UID: {value.simpleUserId || value.uid}</div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">
                                  <div>Unknown Creator</div>
                                  <div className="text-xs text-gray-400">Owner ID: {row.ownerUserId}</div>
                                </div>
                              )
                            )
                          },
                          {
                            key: 'total_sessions',
                            label: 'Sessions',
                            sortable: true,
                            filterable: true,
                            width: '100px',
                            render: (value) => (
                              <div className="text-center">
                                <div className="font-medium text-gray-900">{value || 0}</div>
                                <div className="text-xs text-gray-500">sessions</div>
                              </div>
                            )
                          },
                          {
                            key: 'total_responses',
                            label: 'Responses',
                            sortable: true,
                            filterable: true,
                            width: '100px',
                            render: (value) => (
                              <div className="text-center">
                                <div className="font-medium text-gray-900">{value || 0}</div>
                                <div className="text-xs text-gray-500">responses</div>
                              </div>
                            )
                          },
                          {
                            key: 'created_at',
                            label: 'Created',
                            sortable: true,
                            filterable: true,
                            width: '120px',
                            render: (value) => (
                              <div className="text-sm text-gray-900">
                                {new Date(value).toLocaleDateString()}
                              </div>
                            )
                          },
                          {
                            key: 'actions',
                            label: 'Actions',
                            sortable: false,
                            filterable: false,
                            width: '120px',
                            render: (value, row) => (
                              <div className="flex flex-col space-y-1">
                                <a
                                  href={`/survey/${row.short_id}`}
                                  className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                  View
                                </a>
                                <a
                                  href={`/edit/${row.short_id}`}
                                  className="text-gray-600 hover:text-gray-700 text-sm"
                                >
                                  Edit
                                </a>
                              </div>
                            )
                          }
                        ]}
                        searchable={true}
                        pagination={true}
                        pageSize={15}
                        loading={loading}
                        emptyMessage="No surveys found"
                      />
                    )}
                  </div>
                )}

                {/* Filters Tab */}
                {activeTab === 'filters' && (
                  <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                            <Filter className="h-5 w-5 text-blue-500" />
                            Suggestion Filters
                          </h3>
                          <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            Manage all system filters that process and validate survey responses
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={fetchFilters}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Refresh
                          </button>
                          <button
                            onClick={initializeFilters}
                            disabled={loading}
                            className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Initialize Filters
                          </button>
                        </div>
                      </div>

                      {/* Category Filter */}
                      <div className="mt-4 flex space-x-2">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1 text-sm font-medium rounded-full ${
                              selectedCategory === cat
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        ))}
                      </div>

                      {/* Status Messages */}
                      {filterError && (
                        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          <span>{filterError}</span>
                          <button onClick={() => setFilterError(null)} className="ml-auto">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {filterSuccess && (
                        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative flex items-center gap-2">
                          <Check className="h-5 w-5" />
                          <span>{filterSuccess}</span>
                        </div>
                      )}
                    </div>

                    {/* Filters List */}
                    <ul className="divide-y divide-gray-200">
                      {filteredFilters.map((filter) => (
                        <li key={filter._id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                          {editingId === filter._id ? (
                            // Edit Mode
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Name</label>
                                  <input
                                    type="text"
                                    value={editForm.name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Category</label>
                                  <select
                                    value={editForm.category || 'Business'}
                                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                  >
                                    <option value="Business">Business</option>
                                    <option value="Demographic">Demographic</option>
                                    <option value="Financial">Financial</option>
                                    <option value="Professional">Professional</option>
                                    <option value="Satisfaction">Satisfaction</option>
                                    <option value="Location">Location</option>
                                    <option value="Behavioral">Behavioral</option>
                                    <option value="Quality">Quality</option>
                                    <option value="Technical">Technical</option>
                                    <option value="Temporal">Temporal</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                  value={editForm.description || ''}
                                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                  rows={2}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">Rules / Logic Description</label>
                                <textarea
                                  value={editForm.rules || ''}
                                  onChange={(e) => setEditForm({ ...editForm, rules: e.target.value })}
                                  rows={2}
                                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between">
                                  <label className="block text-sm font-medium text-gray-700">Logic Configuration</label>
                                  <button
                                    onClick={() => setShowJsonEditor(showJsonEditor === filter._id ? null : filter._id)}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    {showJsonEditor === filter._id ? 'Hide JSON' : 'Edit as JSON'}
                                  </button>
                                </div>
                                {showJsonEditor === filter._id ? (
                                  <textarea
                                    value={typeof editForm.logic === 'string' ? editForm.logic : JSON.stringify(editForm.logic, null, 2)}
                                    onChange={(e) => setEditForm({ ...editForm, logic: e.target.value })}
                                    rows={6}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 font-mono text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  />
                                ) : (
                                  <pre className="mt-1 p-3 bg-gray-50 rounded-md text-xs overflow-auto max-h-40 border border-gray-200">
                                    {JSON.stringify(
                                      typeof editForm.logic === 'string' ? JSON.parse(editForm.logic || '{}') : editForm.logic,
                                      null, 2
                                    )}
                                  </pre>
                                )}
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={editForm.isEnabled || false}
                                      onChange={(e) => setEditForm({ ...editForm, isEnabled: e.target.checked })}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label className="ml-2 text-sm text-gray-700">Enabled</label>
                                  </div>
                                  <div className="flex items-center">
                                    <label className="text-sm text-gray-700 mr-2">Priority:</label>
                                    <input
                                      type="number"
                                      value={editForm.priority || 0}
                                      onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) })}
                                      className="w-20 border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleSave(filter._id)}
                                    disabled={loading}
                                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                  >
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h4 className="text-lg font-medium text-gray-900">{filter.name}</h4>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    filter.category === 'Business' ? 'bg-blue-100 text-blue-800' :
                                    filter.category === 'Demographic' ? 'bg-green-100 text-green-800' :
                                    filter.category === 'Financial' ? 'bg-yellow-100 text-yellow-800' :
                                    filter.category === 'Professional' ? 'bg-purple-100 text-purple-800' :
                                    filter.category === 'Satisfaction' ? 'bg-pink-100 text-pink-800' :
                                    filter.category === 'Location' ? 'bg-indigo-100 text-indigo-800' :
                                    filter.category === 'Behavioral' ? 'bg-red-100 text-red-800' :
                                    filter.category === 'Quality' ? 'bg-orange-100 text-orange-800' :
                                    filter.category === 'Technical' ? 'bg-gray-100 text-gray-800' :
                                    filter.category === 'Temporal' ? 'bg-teal-100 text-teal-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {filter.category}
                                  </span>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    filter.isEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {filter.isEnabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                </div>
                                
                                <p className="mt-1 text-sm text-gray-600">{filter.description}</p>
                                
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rules:</p>
                                  <p className="text-sm text-gray-900">{typeof filter.rules === 'string' ? filter.rules : JSON.stringify(filter.rules)}</p>
                                </div>

                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Logic:</p>
                                  <details className="mt-1">
                                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                      View configuration
                                    </summary>
                                    <pre className="mt-2 p-3 bg-gray-50 rounded-md text-xs overflow-auto max-h-60 border border-gray-200">
                                      {JSON.stringify(filter.logic, null, 2)}
                                    </pre>
                                  </details>
                                </div>

                                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                  <span>Priority: {filter.priority}</span>
                                  <span>Created: {new Date(filter.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>

                              <div className="ml-4 flex flex-col space-y-2">
                                <button
                                  onClick={() => handleEdit(filter)}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  <Edit2 className="h-4 w-4 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleToggle(filter._id)}
                                  className={`inline-flex items-center px-3 py-1 border text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    filter.isEnabled
                                      ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500'
                                      : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 focus:ring-green-500'
                                  }`}
                                >
                                  {filter.isEnabled ? (
                                    <>
                                      <EyeOff className="h-4 w-4 mr-1" />
                                      Disable
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4 mr-1" />
                                      Enable
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>

                    {filteredFilters.length === 0 && (
                      <div className="px-4 py-8 text-center text-gray-500">
                        No filters found in this category.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
      {showNotifModal && <SendNotificationModal onClose={() => setShowNotifModal(false)} />}
    </ProtectedRoute>
  );
};

export default AdminDashboard;