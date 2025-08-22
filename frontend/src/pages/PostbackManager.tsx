import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import postbackService, { PostbackShare, PostbackParameter } from '../services/postbackService';
import './PostbackManager.css';

const FIXED_PARAMETERS = [
  {
    key: 'click_id',
    name: 'Click ID',
    description: 'Unique identifier for the click/conversion event',
    required: true
  },
  {
    key: 'payout',
    name: 'Payout',
    description: 'Commission/payout amount earned for the conversion',
    required: true
  },
  {
    key: 'currency',
    name: 'Currency',
    description: 'Currency code (USD, EUR, etc.)',
    required: true
  },
  {
    key: 'offer_id',
    name: 'Offer ID',
    description: 'Unique identifier for the offer/campaign',
    required: true
  },
  {
    key: 'conversion_status',
    name: 'Conversion Status',
    description: 'Status of the conversion (confirmed, pending, reversed)',
    required: true
  },
  {
    key: 'transaction_id',
    name: 'Transaction ID',
    description: 'Unique transaction identifier',
    required: true
  },
  {
    key: 'sub1',
    name: 'Sub1',
    description: 'SubID1 - First level tracking parameter',
    required: false
  },
  {
    key: 'sub2',
    name: 'Sub2',
    description: 'SubID2 - Second level tracking parameter',
    required: false
  },
  {
    key: 'event_name',
    name: 'Event Name',
    description: 'Name of the conversion event (conversion, lead, sale, etc.)',
    required: true
  },
  {
    key: 'timestamp',
    name: 'Timestamp',
    description: 'Timestamp of when the conversion occurred',
    required: true
  }
];

const PostbackManager: React.FC = () => {
  const [postbackShares, setPostbackShares] = useState<PostbackShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingShare, setEditingShare] = useState<PostbackShare | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');

  const [formData, setFormData] = useState({
    third_party_name: '',
    third_party_contact: '',
    postback_type: 'global',
    notes: '',
    status: 'active',
    parameters: {} as Record<string, PostbackParameter>
  });

  useEffect(() => {
    fetchPostbackShares();
  }, []);

  const fetchPostbackShares = async () => {
    try {
      const data = await postbackService.getPostbackShares();
      setPostbackShares(data);
    } catch (error) {
      toast.error('Error fetching postback shares');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeParameters = () => {
    const params: Record<string, PostbackParameter> = {};
    FIXED_PARAMETERS.forEach(param => {
      params[param.key] = {
        // Default to disabled; user chooses which to enable
        enabled: false,
        description: param.description,
        customName: param.key
      };
    });
    return params;
  };

  const handleCreateNew = () => {
    setFormData({
      third_party_name: '',
      third_party_contact: '',
      postback_type: 'global',
      notes: '',
      status: 'active',
      parameters: initializeParameters()
    });
    setEditingShare(null);
    setShowCreateForm(true);
  };

  const handleEdit = (share: PostbackShare) => {
    // Merge existing share parameters with defaults to avoid auto-selecting all
    const mergedParams: Record<string, PostbackParameter> = initializeParameters();
    FIXED_PARAMETERS.forEach(p => {
      if (share.parameters && share.parameters[p.key]) {
        mergedParams[p.key] = {
          enabled: !!share.parameters[p.key].enabled,
          description: share.parameters[p.key].description || p.description,
          customName: share.parameters[p.key].customName || p.key,
        } as PostbackParameter;
      }
    });

    setFormData({
      third_party_name: share.third_party_name,
      third_party_contact: share.third_party_contact,
      postback_type: share.postback_type,
      notes: share.notes,
      status: share.status,
      parameters: mergedParams
    });
    setEditingShare(share);
    setShowCreateForm(true);
  };

  const handleParameterToggle = (paramKey: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [paramKey]: {
          ...prev.parameters[paramKey],
          enabled
        }
      }
    }));
  };

  const handleCustomNameChange = (paramKey: string, customName: string) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [paramKey]: {
          ...prev.parameters[paramKey],
          customName
        }
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingShare) {
        await postbackService.updatePostbackShare(editingShare.id, formData);
        toast.success('Postback share updated!');
      } else {
        await postbackService.createPostbackShare(formData);
        toast.success('Postback share created!');
      }
      setShowCreateForm(false);
      fetchPostbackShares();
    } catch (error) {
      toast.error('Error saving postback share');
      console.error('Save error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this postback share?')) {
      return;
    }

    try {
      await postbackService.deletePostbackShare(id);
      toast.success('Postback share deleted!');
      fetchPostbackShares();
    } catch (error) {
      toast.error('Error deleting postback share');
      console.error('Delete error:', error);
    }
  };

  const generateUrl = async (shareId: string) => {
    try {
      const data = await postbackService.generatePostbackUrl(shareId);
      setGeneratedUrl(data.postback_url);
      toast.success('URL generated successfully!');
    } catch (error) {
      toast.error('Error generating URL');
      console.error('URL generation error:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="postback-manager">
        <div className="loading">Loading postback shares...</div>
      </div>
    );
  }

  return (
    <div className="postback-manager">
      <div className="header">
        <h1>Postback Manager</h1>
        <p>Configure 10-parameter postback system for third-party integrations</p>
        <button className="btn-primary" onClick={handleCreateNew}>
          Create New Postback Share
        </button>
      </div>

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingShare ? 'Edit' : 'Create'} Postback Share</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowCreateForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="postback-form">
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-group">
                  <label>Third Party Name *</label>
                  <input
                    type="text"
                    value={formData.third_party_name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      third_party_name: e.target.value
                    }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={formData.third_party_contact}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      third_party_contact: e.target.value
                    }))}
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      notes: e.target.value
                    }))}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      status: e.target.value
                    }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h3>Parameter Configuration</h3>
                <p className="section-description">
                  Configure which of the 10 fixed parameters to include and map them to third-party parameter names.
                </p>

                <div className="parameters-grid">
                  {FIXED_PARAMETERS.map(param => (
                    <div key={param.key} className="parameter-config">
                      <div className="parameter-header">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.parameters[param.key]?.enabled || false}
                            onChange={(e) => handleParameterToggle(param.key, e.target.checked)}
                          />
                          <span className="parameter-name">
                            {param.name}
                            {param.required && <span className="required">*</span>}
                          </span>
                        </label>
                      </div>
                      
                      <div className="parameter-description">
                        {param.description}
                      </div>

                      {formData.parameters[param.key]?.enabled && (
                        <div className="custom-name-input">
                          <label>Third-party parameter name:</label>
                          <input
                            type="text"
                            value={formData.parameters[param.key]?.customName || param.key}
                            onChange={(e) => handleCustomNameChange(param.key, e.target.value)}
                            placeholder={param.key}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingShare ? 'Update' : 'Create'} Postback Share
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="postback-shares-list">
        <h2>Existing Postback Shares</h2>
        
        {postbackShares.length === 0 ? (
          <div className="empty-state">
            <p>No postback shares configured yet.</p>
            <button className="btn-primary" onClick={handleCreateNew}>
              Create Your First Postback Share
            </button>
          </div>
        ) : (
          <div className="shares-grid">
            {postbackShares.map(share => (
              <div key={share.id} className="share-card">
                <div className="share-header">
                  <h3>{share.third_party_name}</h3>
                  <span className={`status ${share.status}`}>
                    {share.status}
                  </span>
                </div>

                <div className="share-details">
                  <p><strong>Contact:</strong> {share.third_party_contact || 'Not provided'}</p>
                  <p><strong>Type:</strong> {share.postback_type}</p>
                  <p><strong>Unique ID:</strong> <code>{(share as any).unique_postback_id || 'Auto-generated'}</code></p>
                  <p><strong>Created:</strong> {share.created_at_str}</p>
                  {share.last_used_str && (
                    <p><strong>Last Used:</strong> {share.last_used_str}</p>
                  )}
                  <p><strong>Usage Count:</strong> {share.usage_count || 0}</p>
                </div>

                <div className="enabled-parameters">
                  <h4>Enabled Parameters ({Object.values(share.parameters).filter(p => p.enabled).length}/10):</h4>
                  <div className="parameter-tags">
                    {Object.entries(share.parameters)
                      .filter(([_, config]) => config.enabled)
                      .map(([key, config]) => (
                        <span key={key} className="parameter-tag">
                          {config.customName || key}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="share-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => generateUrl(share.id)}
                  >
                    Generate URL
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => handleEdit(share)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={() => handleDelete(share.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {generatedUrl && (
        <div className="url-display">
          <h3>Generated Postback URL</h3>
          <div className="url-container">
            <code>{generatedUrl}</code>
            <button 
              className="copy-btn"
              onClick={() => copyToClipboard(generatedUrl)}
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostbackManager;
