import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, ExternalLink, Check, X, AlertCircle } from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  url: string;
  status: string;
}

interface PartnerMapping {
  id: string;
  survey_id: string;
  partner_id: string;
  partner_name: string;
  postback_url: string;
  parameter_mappings: Record<string, string>;
  status: string;
  send_on_completion: boolean;
  send_on_failure: boolean;
  created_at: string;
  updated_at: string;
}

interface AvailableDataFields {
  [key: string]: string;
}

interface PartnerMappingProps {
  surveyId: string;
}

const PartnerMapping: React.FC<PartnerMappingProps> = ({ surveyId }) => {
  const [mappings, setMappings] = useState<PartnerMapping[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [availableFields, setAvailableFields] = useState<AvailableDataFields>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddPartnerForm, setShowAddPartnerForm] = useState(false);
  const [editingMapping, setEditingMapping] = useState<PartnerMapping | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    partner_id: '',
    postback_url: '',
    parameter_mappings: {} as Record<string, string>,
    send_on_completion: true,
    send_on_failure: false
  });

  // Partner creation form state
  const [partnerFormData, setPartnerFormData] = useState({
    name: '',
    url: '',
    status: 'active'
  });

  useEffect(() => {
    loadData();
  }, [surveyId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(''); // Clear previous errors
      console.log('🔄 Loading partner mapping data...');
      
      // Load existing mappings
      try {
        const mappingsResponse = await fetch(`/api/survey-partner-mappings/${surveyId}`, {
          credentials: 'include'
        });
        
        if (mappingsResponse.ok) {
          const mappingsData = await mappingsResponse.json();
          setMappings(mappingsData.mappings || []);
        } else {
          console.warn('Failed to load mappings:', mappingsResponse.status);
          setMappings([]); // Set empty array if no mappings exist yet
        }
      } catch (mappingErr) {
        console.warn('Error loading mappings:', mappingErr);
        setMappings([]);
      }

      // Load available partners
      try {
        const partnersResponse = await fetch('/api/partners', {
          credentials: 'include'
        });
        
        if (partnersResponse.ok) {
          const partnersData = await partnersResponse.json();
          console.log('✅ Loaded partners:', partnersData.length, 'partners');
          setPartners(partnersData || []);
        } else {
          console.warn('Failed to load partners:', partnersResponse.status);
          setPartners([]);
        }
      } catch (partnerErr) {
        console.warn('Error loading partners:', partnerErr);
        setPartners([]);
      }

      // Load available data fields
      try {
        const fieldsResponse = await fetch('/api/available-data-fields', {
          credentials: 'include'
        });
        
        if (fieldsResponse.ok) {
          const fieldsData = await fieldsResponse.json();
          setAvailableFields(fieldsData.available_fields || {});
        } else {
          console.warn('Failed to load data fields:', fieldsResponse.status);
          setAvailableFields({});
        }
      } catch (fieldsErr) {
        console.warn('Error loading data fields:', fieldsErr);
        setAvailableFields({});
      }

    } catch (err) {
      setError('Failed to connect to backend. Make sure the backend server is running on http://localhost:5000');
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMapping = () => {
    setFormData({
      partner_id: '',
      postback_url: '',
      parameter_mappings: {},
      send_on_completion: true,
      send_on_failure: false
    });
    setEditingMapping(null);
    setShowAddForm(true);
  };

  const handleEditMapping = (mapping: PartnerMapping) => {
    setFormData({
      partner_id: mapping.partner_id,
      postback_url: mapping.postback_url,
      parameter_mappings: mapping.parameter_mappings,
      send_on_completion: mapping.send_on_completion,
      send_on_failure: mapping.send_on_failure
    });
    setEditingMapping(mapping);
    setShowAddForm(true);
  };

  const handleSaveMapping = async () => {
    try {
      setError('');
      
      const payload = {
        survey_id: surveyId,
        partner_id: formData.partner_id,
        postback_url: formData.postback_url,
        parameter_mappings: formData.parameter_mappings,
        send_on_completion: formData.send_on_completion,
        send_on_failure: formData.send_on_failure
      };

      let response;
      if (editingMapping) {
        // Update existing mapping
        response = await fetch(`/api/survey-partner-mappings/${editingMapping.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
      } else {
        // Create new mapping
        response = await fetch('/api/survey-partner-mappings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        setSuccess(editingMapping ? 'Mapping updated successfully!' : 'Mapping created successfully!');
        setShowAddForm(false);
        loadData(); // Reload data
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save mapping');
      }
    } catch (err) {
      setError('Failed to save mapping');
      console.error('Error saving mapping:', err);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this partner mapping?')) {
      return;
    }

    try {
      const response = await fetch(`/api/survey-partner-mappings/${mappingId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setSuccess('Mapping deleted successfully!');
        loadData(); // Reload data
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete mapping');
      }
    } catch (err) {
      setError('Failed to delete mapping');
      console.error('Error deleting mapping:', err);
    }
  };

  const handleParameterMappingChange = (ourField: string, partnerParam: string) => {
    setFormData(prev => ({
      ...prev,
      parameter_mappings: {
        ...prev.parameter_mappings,
        [ourField]: partnerParam
      }
    }));
  };

  const handleRemoveParameterMapping = (ourField: string) => {
    setFormData(prev => {
      const newMappings = { ...prev.parameter_mappings };
      delete newMappings[ourField];
      return {
        ...prev,
        parameter_mappings: newMappings
      };
    });
  };

  const handleCreatePartner = async () => {
    try {
      setError('');
      console.log('🚀 Creating partner:', partnerFormData);
      
      const url = '/api/partners';
      console.log('🌐 Request URL:', url);
      console.log('📦 Request body:', JSON.stringify(partnerFormData));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(partnerFormData)
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        // Handle both JSON and non-JSON responses
        let newPartner;
        try {
          // Try to read as text first, then parse as JSON
          const responseText = await response.text();
          console.log('Success response text:', responseText);
          
          if (responseText) {
            try {
              newPartner = JSON.parse(responseText);
            } catch (parseError) {
              console.log('Response is not JSON, using fallback');
              newPartner = { name: partnerFormData.name }; // Fallback
            }
          } else {
            newPartner = { name: partnerFormData.name }; // Fallback
          }
        } catch (readError) {
          console.log('Error reading success response:', readError);
          newPartner = { name: partnerFormData.name }; // Fallback
        }
        
        setSuccess(`Partner "${newPartner.name || partnerFormData.name}" created successfully!`);
        setShowAddPartnerForm(false);
        setPartnerFormData({ name: '', url: '', status: 'active' });
        loadData(); // Reload partners list
        setTimeout(() => setSuccess(''), 3000);
      } else {
        // Handle error responses more carefully
        let errorMessage = 'Failed to create partner';
        try {
          // Try to read as text first, then parse as JSON if possible
          const responseText = await response.text();
          console.log('Error response text:', responseText);
          
          if (responseText) {
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.error || errorMessage;
            } catch (parseError) {
              // If not JSON, use the text as error message
              errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
            }
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (readError) {
          console.log('Error reading response:', readError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create partner: ${errorMessage}`);
      console.error('Error creating partner:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading partner mappings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Outbound Partner Mappings</h2>
          <p className="text-sm text-gray-600">
            Configure which outbound partners receive postbacks when this survey is completed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddPartnerForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Partner
          </button>
          <button
            onClick={handleAddMapping}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              partners.length === 0 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            disabled={partners.length === 0}
            title={partners.length === 0 ? 'Add a partner first' : 'Map this survey to a partner'}
          >
            <ExternalLink size={16} />
            Map Partner {partners.length === 0 && '(Add Partner First)'}
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <Check size={16} />
          {success}
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Existing Mappings */}
      <div className="space-y-4">
        {mappings.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <ExternalLink className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Partner Mappings</h3>
            <p className="text-gray-600 mb-4">
              {partners.length === 0 
                ? "First add an outbound partner, then map this survey to automatically send postbacks when completed."
                : "Map this survey to partners to automatically send postbacks when completed."
              }
            </p>
            <div className="flex items-center justify-center gap-3">
              {partners.length === 0 && (
                <button
                  onClick={() => setShowAddPartnerForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Add Partner First
                </button>
              )}
              {partners.length > 0 && (
                <button
                  onClick={handleAddMapping}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <ExternalLink size={16} />
                  Add First Mapping
                </button>
              )}
            </div>
          </div>
        ) : (
          mappings.map((mapping) => (
            <div key={mapping.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium text-gray-900">{mapping.partner_name}</h3>
                  <p className="text-sm text-gray-600 break-all">{mapping.postback_url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    mapping.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {mapping.status}
                  </span>
                  <button
                    onClick={() => handleEditMapping(mapping)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteMapping(mapping.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Parameter Mappings Display */}
              {Object.keys(mapping.parameter_mappings).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Parameter Mappings:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(mapping.parameter_mappings).map(([ourField, partnerParam]) => (
                      <span
                        key={ourField}
                        className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-800 text-xs rounded-full"
                      >
                        {ourField} → {partnerParam}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings Display */}
              <div className="mt-4 flex gap-4 text-sm text-gray-600">
                <span className={mapping.send_on_completion ? 'text-green-600' : 'text-gray-400'}>
                  ✓ Send on completion
                </span>
                <span className={mapping.send_on_failure ? 'text-orange-600' : 'text-gray-400'}>
                  ✓ Send on failure
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {editingMapping ? 'Edit Partner Mapping' : 'Add Partner Mapping'}
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Partner Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Partner
                </label>
                <select
                  value={formData.partner_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, partner_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  disabled={!!editingMapping}
                >
                  <option value="">Choose a partner...</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Postback URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postback URL
                </label>
                <input
                  type="url"
                  value={formData.postback_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, postback_url: e.target.value }))}
                  placeholder="https://partner.com/postback?transaction_id={transaction_id}&user={username}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Use {'{parameter_name}'} placeholders that will be replaced with actual values
                </p>
              </div>

              {/* Parameter Mappings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parameter Mappings
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Map our data fields to the partner's parameter names in their URL
                </p>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {Object.entries(availableFields).map(([fieldName, description]) => (
                    <div key={fieldName} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">{fieldName}</div>
                        <div className="text-xs text-gray-600">{description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">→</span>
                        <input
                          type="text"
                          value={formData.parameter_mappings[fieldName] || ''}
                          onChange={(e) => handleParameterMappingChange(fieldName, e.target.value)}
                          placeholder="partner_param"
                          className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        {formData.parameter_mappings[fieldName] && (
                          <button
                            onClick={() => handleRemoveParameterMapping(fieldName)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Postback Settings
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.send_on_completion}
                      onChange={(e) => setFormData(prev => ({ ...prev, send_on_completion: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
                    />
                    <span className="text-sm text-gray-700">Send postback on survey completion</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.send_on_failure}
                      onChange={(e) => setFormData(prev => ({ ...prev, send_on_failure: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
                    />
                    <span className="text-sm text-gray-700">Send postback on survey failure</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMapping}
                  disabled={!formData.partner_id || !formData.postback_url}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {editingMapping ? 'Update Mapping' : 'Create Mapping'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Partner Form Modal */}
      {showAddPartnerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Add Outbound Partner</h3>
              <button
                onClick={() => setShowAddPartnerForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Partner Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partner Name *
                </label>
                <input
                  type="text"
                  value={partnerFormData.name}
                  onChange={(e) => setPartnerFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., AdBreak Media, SurveyTitans"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
              </div>

              {/* Partner URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Postback URL *
                </label>
                <input
                  type="url"
                  value={partnerFormData.url}
                  onChange={(e) => setPartnerFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://partner.com/postback?click_id={click_id}&status={status}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
                <p className="text-xs text-gray-600 mt-1">
                  This is the default URL. You can customize it when creating mappings.
                </p>
              </div>

              {/* Partner Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={partnerFormData.status}
                  onChange={(e) => setPartnerFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowAddPartnerForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePartner}
                  disabled={!partnerFormData.name || !partnerFormData.url}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Create Partner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerMapping;
