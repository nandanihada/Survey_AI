import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  EditIcon, 
  Trash2Icon, 
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  TestTubeIcon,
  WandIcon
} from 'lucide-react';

interface Criterion {
  id: string;
  question_id: string;
  condition: string;
  expected_value: any;
  required: boolean;
  weight: number;
  description: string;
}

interface CriteriaSet {
  _id: string;
  name: string;
  description: string;
  criteria: Criterion[];
  logic_type: string;
  passing_threshold: number;
  is_active: boolean;
  is_dynamic?: boolean;
  created_at: string;
  updated_at: string;
}

const CONDITIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'greater_than_or_equal', label: 'Greater Than or Equal' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'less_than_or_equal', label: 'Less Than or Equal' },
  { value: 'in_list', label: 'In List' },
  { value: 'not_in_list', label: 'Not In List' }
];

const LOGIC_TYPES = [
  { value: 'all_required', label: 'All Required Must Pass' },
  { value: 'threshold_based', label: 'Threshold Based' },
  { value: 'weighted_score', label: 'Weighted Score' },
  { value: 'any_required', label: 'Any Required Must Pass' }
];

const CriteriaManager: React.FC = () => {
  const navigate = useNavigate();
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSet, setEditingSet] = useState<CriteriaSet | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logic_type: 'threshold_based',
    passing_threshold: 60,
    criteria: [] as Criterion[]
  });

  useEffect(() => {
    fetchCriteriaSets();
  }, []);

  const fetchCriteriaSets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/criteria');
      const data = await response.json();
      
      if (response.ok) {
        setCriteriaSets(data.criteria_sets || []);
      } else {
        toast.error('Failed to load criteria sets');
      }
    } catch (error) {
      console.error('Failed to fetch criteria sets:', error);
      toast.error('Failed to load criteria sets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCriteriaSet = async () => {
    try {
      const response = await fetch('/api/admin/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Criteria set created successfully');
        setShowCreateForm(false);
        resetForm();
        fetchCriteriaSets();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create criteria set');
      }
    } catch (error) {
      console.error('Failed to create criteria set:', error);
      toast.error('Failed to create criteria set');
    }
  };

  const handleUpdateCriteriaSet = async () => {
    if (!editingSet) return;

    try {
      const response = await fetch(`/api/admin/criteria/${editingSet._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Criteria set updated successfully');
        setEditingSet(null);
        resetForm();
        fetchCriteriaSets();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update criteria set');
      }
    } catch (error) {
      console.error('Failed to update criteria set:', error);
      toast.error('Failed to update criteria set');
    }
  };

  const handleDeleteCriteriaSet = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this criteria set?')) return;

    try {
      const response = await fetch(`/api/admin/criteria/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Criteria set deleted successfully');
        fetchCriteriaSets();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete criteria set');
      }
    } catch (error) {
      console.error('Failed to delete criteria set:', error);
      toast.error('Failed to delete criteria set');
    }
  };

  const handleTestCriteria = async (criteriaSet: CriteriaSet) => {
    // Sample test responses - in a real app, this might be user input
    const sampleResponses = {
      q1: 'Yes',
      q2: '25',
      q3: 'Bachelor\'s degree',
      q4: '8'
    };

    try {
      const response = await fetch('/api/admin/criteria/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria_set: criteriaSet,
          responses: sampleResponses
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResults({ criteriaSet, result, sampleResponses });
        toast.success(`Test completed: ${result.status.toUpperCase()} (${result.score}%)`);
      } else {
        toast.error(result.error || 'Failed to test criteria');
      }
    } catch (error) {
      console.error('Failed to test criteria:', error);
      toast.error('Failed to test criteria');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      logic_type: 'threshold_based',
      passing_threshold: 60,
      criteria: []
    });
  };

  const startEdit = (criteriaSet: CriteriaSet) => {
    setEditingSet(criteriaSet);
    setFormData({
      name: criteriaSet.name,
      description: criteriaSet.description,
      logic_type: criteriaSet.logic_type,
      passing_threshold: criteriaSet.passing_threshold,
      criteria: criteriaSet.criteria
    });
    setShowCreateForm(true);
  };

  const addCriterion = () => {
    setFormData(prev => ({
      ...prev,
      criteria: [...prev.criteria, {
        id: `criterion_${Date.now()}`,
        question_id: '',
        condition: 'equals',
        expected_value: '',
        required: true,
        weight: 1.0,
        description: ''
      }]
    }));
  };

  const updateCriterion = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, i) => 
        i === index ? { ...criterion, [field]: value } : criterion
      )
    }));
  };

  const removeCriterion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading criteria sets...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="page-header">
        <div className="header-nav">
          <Link to="/admin" className="btn btn-outline">
            <ArrowLeftIcon />
            Back to Admin Dashboard
          </Link>
          <h1>Criteria Manager</h1>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            <PlusIcon />
            Create New Criteria Set
          </button>
        </div>
      </header>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingSet ? 'Edit Criteria Set' : 'Create New Criteria Set'}</h2>
              <button 
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingSet(null);
                  resetForm();
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter criteria set name"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Logic Type</label>
                  <select
                    value={formData.logic_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, logic_type: e.target.value }))}
                  >
                    {LOGIC_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Passing Threshold (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.passing_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, passing_threshold: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>

            {/* Criteria List */}
            <div className="criteria-section">
              <div className="section-header">
                <h3>Criteria Rules</h3>
                <button onClick={addCriterion} className="btn btn-secondary">
                  <PlusIcon />
                  Add Criterion
                </button>
              </div>

              {formData.criteria.map((criterion, index) => (
                <div key={index} className="criterion-card">
                  <div className="criterion-header">
                    <span>Criterion {index + 1}</span>
                    <button 
                      onClick={() => removeCriterion(index)}
                      className="btn btn-sm btn-danger"
                    >
                      <Trash2Icon />
                    </button>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Question ID</label>
                      <input
                        type="text"
                        value={criterion.question_id}
                        onChange={(e) => updateCriterion(index, 'question_id', e.target.value)}
                        placeholder="e.g., q1, q2, question_id"
                      />
                    </div>

                    <div className="form-group">
                      <label>Condition</label>
                      <select
                        value={criterion.condition}
                        onChange={(e) => updateCriterion(index, 'condition', e.target.value)}
                      >
                        {CONDITIONS.map(condition => (
                          <option key={condition.value} value={condition.value}>
                            {condition.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Expected Value</label>
                      <input
                        type="text"
                        value={criterion.expected_value}
                        onChange={(e) => updateCriterion(index, 'expected_value', e.target.value)}
                        placeholder="Expected answer/value"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Weight</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={criterion.weight}
                        onChange={(e) => updateCriterion(index, 'weight', Number(e.target.value))}
                      />
                    </div>

                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={criterion.required}
                          onChange={(e) => updateCriterion(index, 'required', e.target.checked)}
                        />
                        Required
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={criterion.description}
                      onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                      placeholder="Describe this criterion"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button 
                onClick={editingSet ? handleUpdateCriteriaSet : handleCreateCriteriaSet}
                className="btn btn-primary"
              >
                {editingSet ? 'Update Criteria Set' : 'Create Criteria Set'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Results Modal */}
      {testResults && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Criteria Test Results</h2>
              <button 
                onClick={() => setTestResults(null)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>

            <div className="test-results">
              <div className={`test-status ${testResults.result.status}`}>
                <div className="status-icon">
                  {testResults.result.status === 'pass' ? (
                    <CheckCircleIcon className="text-green-600" />
                  ) : (
                    <XCircleIcon className="text-red-600" />
                  )}
                </div>
                <div>
                  <h3>{testResults.result.status.toUpperCase()}</h3>
                  <p>Score: {testResults.result.score}%</p>
                  <p>{testResults.result.message}</p>
                </div>
              </div>

              <div className="test-details">
                <h4>Sample Responses Used:</h4>
                <pre>{JSON.stringify(testResults.sampleResponses, null, 2)}</pre>

                <h4>Criteria Results:</h4>
                <div className="criteria-results">
                  {testResults.result.criteria_met?.map((criterionId: string) => (
                    <div key={criterionId} className="criterion-result pass">
                      <CheckCircleIcon /> {criterionId}: PASSED
                    </div>
                  ))}
                  {testResults.result.criteria_failed?.map((criterionId: string) => (
                    <div key={criterionId} className="criterion-result fail">
                      <XCircleIcon /> {criterionId}: FAILED
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Criteria Sets Table */}
      <div className="criteria-table-container">
        <table className="criteria-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Logic Type</th>
              <th>Threshold</th>
              <th>Criteria Count</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {criteriaSets.map((criteriaSet) => (
              <tr key={criteriaSet._id}>
                <td>
                  <div className="criteria-name">
                    {criteriaSet.name}
                    {criteriaSet.is_dynamic && (
                      <span className="dynamic-badge">
                        <WandIcon size={12} />
                        Dynamic
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="criteria-description">
                    {criteriaSet.description}
                  </div>
                </td>
                <td>
                  <span className="logic-type">
                    {LOGIC_TYPES.find(t => t.value === criteriaSet.logic_type)?.label}
                  </span>
                </td>
                <td>{criteriaSet.passing_threshold}%</td>
                <td>{criteriaSet.criteria.length}</td>
                <td>
                  <span className={`status-badge ${criteriaSet.is_active ? 'active' : 'inactive'}`}>
                    {criteriaSet.is_active ? (
                      <>
                        <CheckCircleIcon className="text-green-600" size={16} />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="text-gray-500" size={16} />
                        Inactive
                      </>
                    )}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => handleTestCriteria(criteriaSet)}
                      className="btn btn-sm btn-outline"
                      title="Test criteria with sample data"
                    >
                      <TestTubeIcon />
                      Test
                    </button>
                    <button 
                      onClick={() => startEdit(criteriaSet)}
                      className="btn btn-sm btn-secondary"
                    >
                      <EditIcon />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteCriteriaSet(criteriaSet._id)}
                      className="btn btn-sm btn-danger"
                    >
                      <Trash2Icon />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CriteriaManager;
