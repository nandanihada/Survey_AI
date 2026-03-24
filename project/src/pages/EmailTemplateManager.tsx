import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus, Send } from 'lucide-react';

interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  templates?: T[];
  error?: string;
  message?: string;
}

const EmailTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testingTemplate, setTestingTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testVariables, setTestVariables] = useState('{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "survey_name": "Test Survey",\n  "answer": "Yes"\n}');
  
  // API URL configuration
  const apiBaseUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://api.pepperwahl.com';
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // Get authentication token (JWT preferred)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to user ID if no JWT token
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.id) {
              headers['Authorization'] = `Bearer ${user.id}`;
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Add X-User-ID header
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      const response = await fetch(`${apiBaseUrl}/api/email-templates`, {
        headers
      });
      
      const result: ApiResponse<EmailTemplate> = await response.json();
      
      if (result.success && result.templates) {
        setTemplates(result.templates);
      } else {
        console.error('Failed to fetch templates:', result.error);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    
    if (!formData.body.trim()) {
      newErrors.body = 'Body is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Get authentication token (JWT preferred)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to user ID if no JWT token
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.id) {
              headers['Authorization'] = `Bearer ${user.id}`;
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Add X-User-ID header
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      const url = editingTemplate 
        ? `${apiBaseUrl}/api/email-templates/${editingTemplate._id}`
        : `${apiBaseUrl}/api/email-templates`;
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData)
      });

      const result: ApiResponse<EmailTemplate> = await response.json();
      
      if (result.success) {
        await fetchTemplates();
        resetForm();
        setShowModal(false);
        alert(editingTemplate ? 'Template updated successfully!' : 'Template created successfully!');
      } else {
        alert(result.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      // Get authentication token (JWT preferred)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to user ID if no JWT token
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.id) {
              headers['Authorization'] = `Bearer ${user.id}`;
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Add X-User-ID header
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      const response = await fetch(`${apiBaseUrl}/api/email-templates/${templateId}`, {
        method: 'DELETE',
        headers
      });

      const result: ApiResponse<EmailTemplate> = await response.json();
      
      if (result.success) {
        await fetchTemplates();
        alert('Template deleted successfully!');
      } else {
        alert(result.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body
    });
    setShowModal(true);
  };

  const handleTest = async () => {
    if (!testingTemplate || !testEmail.trim()) {
      alert('Please provide a test email address');
      return;
    }

    try {
      // Get authentication token (JWT preferred)
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback to user ID if no JWT token
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.id) {
              headers['Authorization'] = `Bearer ${user.id}`;
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Add X-User-ID header
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || '';
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      const variables = JSON.parse(testVariables);
      
      const response = await fetch(`${apiBaseUrl}/api/email-triggers/test`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          template_id: testingTemplate._id,
          test_email: testEmail,
          variables
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Test email sent successfully to ${testEmail}!\n\nSubject: ${result.subject}\n\nBody preview: ${result.body_preview}`);
        setShowTestModal(false);
        setTestEmail('');
      } else {
        alert(result.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Failed to send test email. Please check your variables format.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      body: ''
    });
    setEditingTemplate(null);
    setErrors({});
  };

  const openTestModal = (template: EmailTemplate) => {
    setTestingTemplate(template);
    setShowTestModal(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading templates...</div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border">
          <div className="text-gray-500 mb-4">No email templates found</div>
          <button
            onClick={() => setShowModal(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first template
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div key={template._id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Subject:</strong> {template.subject}
                  </div>
                  <div className="text-sm text-gray-500 line-clamp-2">
                    {template.body.replace(/<[^>]*>/g, '').substring(0, 150)}...
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => openTestModal(template)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Test Email"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                Created: {new Date(template.created_at).toLocaleDateString()}
                {template.updated_at !== template.created_at && (
                  <> • Updated: {new Date(template.updated_at).toLocaleDateString()}</>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Product Information Email"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.subject ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Thanks for your interest in {{product_name}}"
                />
                {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Body (HTML supported) *
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-64 ${
                    errors.body ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={`<p>Hi {{name}},</p>
<p>Thank you for completing our survey.</p>
<p>Based on your response: {{answer}}</p>
<p>Here's more information about our product.</p>
<p>{{product_link}}</p>`}
                />
                {errors.body && <p className="text-red-500 text-sm mt-1">{errors.body}</p>}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Available Variables:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><code className="bg-gray-200 px-1 rounded">{'{' + '{name}' + '}'}</code> - User's name</div>
                  <div><code className="bg-gray-200 px-1 rounded">{'{' + '{email}' + '}'}</code> - User's email</div>
                  <div><code className="bg-gray-200 px-1 rounded">{'{' + '{survey_name}' + '}'}</code> - Survey name</div>
                  <div><code className="bg-gray-200 px-1 rounded">{'{' + '{answer}' + '}'}</code> - Trigger answer</div>
                  <div><code className="bg-gray-200 px-1 rounded">{'{' + '{question}' + '}'}</code> - Question text</div>
                  <div><code className="bg-gray-200 px-1 rounded">{'{' + '{response_date}' + '}'}</code> - Response date</div>
                  <div><code className="bg-gray-200 px-1 rounded">{'{' + '{product_link}' + '}'}</code> - Product link</div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {showTestModal && testingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Test Email Template</h2>
            
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2">Template: {testingTemplate.name}</h3>
              <p className="text-sm text-gray-600">Subject: {testingTemplate.subject}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Email Address *
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="test@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Variables (JSON format)
                </label>
                <textarea
                  value={testVariables}
                  onChange={(e) => setTestVariables(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleTest}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Send Test Email
              </button>
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestEmail('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateManager;
