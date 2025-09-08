import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  UserIcon, 
  ShieldIcon, 
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  SettingsIcon
} from 'lucide-react';

interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
  simpleUserId?: number;
}

interface RoleHierarchy {
  [key: string]: string[];
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roleHierarchy, setRoleHierarchy] = useState<RoleHierarchy>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchRoleHierarchy();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleHierarchy = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRoleHierarchy(data.roles || {});
      }
    } catch (error) {
      console.error('Error fetching role hierarchy:', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        toast.success('User role updated successfully');
        fetchUsers(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Error updating user role');
    } finally {
      setUpdating(null);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: string) => {
    setUpdating(userId);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success('User status updated successfully');
        fetchUsers(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Error updating user status');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-purple-600 bg-purple-100';
      case 'enterprise': return 'text-blue-600 bg-blue-100';
      case 'premium': return 'text-green-600 bg-green-100';
      case 'basic': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'disapproved': return 'text-red-600 bg-red-100';
      case 'locked': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircleIcon;
      case 'disapproved': return XCircleIcon;
      case 'locked': return AlertCircleIcon;
      default: return AlertCircleIcon;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="section-header">
        <h2>
          <UserIcon className="inline mr-2" size={24} />
          User Management
        </h2>
        <p className="text-gray-600">Manage user roles and account status</p>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Features</th>
              <th>Joined</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const StatusIcon = getStatusIcon(user.status);
              const userFeatures = roleHierarchy[user.role] || [];
              
              return (
                <tr key={user._id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                        {user.simpleUserId && (
                          <div className="user-id">ID: {user.simpleUserId}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user._id, e.target.value)}
                      disabled={updating === user._id || user._id === currentUser?._id}
                      className={`role-select ${getRoleColor(user.role)}`}
                    >
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={user.status}
                      onChange={(e) => updateUserStatus(user._id, e.target.value)}
                      disabled={updating === user._id || user._id === currentUser?._id}
                      className={`status-select ${getStatusColor(user.status)}`}
                    >
                      <option value="approved">Approved</option>
                      <option value="disapproved">Disapproved</option>
                      <option value="locked">Locked</option>
                    </select>
                  </td>
                  <td>
                    <div className="features-list">
                      {userFeatures.slice(0, 3).map((feature) => (
                        <span key={feature} className="feature-tag">
                          {feature}
                        </span>
                      ))}
                      {userFeatures.length > 3 && (
                        <span className="feature-tag">+{userFeatures.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {new Date(user.createdAt).toLocaleDateString('en-IN', { 
                      timeZone: 'Asia/Kolkata',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td>
                    {user.lastLogin ? (
                      new Date(user.lastLogin).toLocaleDateString('en-IN', { 
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short'
                      })
                    ) : (
                      <span className="text-gray-500">Never</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {updating === user._id ? (
                        <div className="spinner-sm"></div>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline"
                          disabled={user._id === currentUser?._id}
                          title="More actions"
                        >
                          <SettingsIcon size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="role-legend">
        <h3>Role Hierarchy & Features</h3>
        <div className="role-cards">
          {Object.entries(roleHierarchy).map(([role, features]) => (
            <div key={role} className="role-card">
              <div className={`role-badge ${getRoleColor(role)}`}>
                <ShieldIcon size={16} />
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </div>
              <div className="role-features">
                {features.map((feature) => (
                  <span key={feature} className="feature-item">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
