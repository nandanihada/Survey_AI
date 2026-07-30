/**
 * NodeConfigPanel - Edit selected node properties
 */

import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { X, Trash2, ExternalLink, GitBranch, Save, Link, ArrowRight } from 'lucide-react';
import './PanelStyles.css';

interface Props {
  node: Node;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  onClose: () => void;
  editMode: boolean;
  questions: Array<{
    id: string;
    question: string;
    type: string;
    options?: string[];
  }>;
}

const NodeConfigPanel: React.FC<Props> = ({
  node,
  onUpdate,
  onDelete,
  onClose,
  editMode,
  questions
}) => {
  const [formData, setFormData] = useState<any>(node.data || {});

  useEffect(() => {
    setFormData(node.data || {});
  }, [node]);

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onUpdate(formData);
  };

  const canDelete = node.type === 'redirect' || node.type === 'branch';
  const canEdit = editMode;


  return (
    <div className="node-config-panel">
      <div className="panel-header">
        <h3>
          {node.type === 'question' && '📝 Question'}
          {node.type === 'redirect' && '🔗 Redirect'}
          {node.type === 'branch' && '🔀 Branch'}
          {node.type === 'end' && '✅ End'}
          {node.type === 'start' && '▶️ Start'}
        </h3>
        <button className="close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="panel-content">
        {/* Question Node - Now with Redirect Option */}
        {node.type === 'question' && (
          <div className="config-section">
            <label>Question Text</label>
            <p className="readonly-value">{node.data.fullText || node.data.label}</p>
            
            <label>Type</label>
            <p className="readonly-value type-badge">{node.data.questionType}</p>
            
            {node.data.options?.length > 0 && (
              <>
                <label>Options</label>
                <div className="options-list">
                  {node.data.options.map((opt: string, i: number) => (
                    <span key={i} className="option-tag">{opt}</span>
                  ))}
                </div>
              </>
            )}
            
            {node.data.show_if && (
              <div className="condition-info">
                <label>Show Condition</label>
                <p className="condition-text">
                  When <strong>{node.data.show_if.depends_on}</strong> equals "{node.data.show_if.value}"
                </p>
              </div>
            )}

            {/* NEW: Redirect After This Question */}
            <div className="redirect-section">
              <div className="section-header">
                <Link size={16} />
                <span>Redirect After This Question</span>
              </div>
              
              <label className="checkbox-label highlight">
                <input
                  type="checkbox"
                  checked={formData.redirectEnabled || false}
                  onChange={(e) => handleChange('redirectEnabled', e.target.checked)}
                  disabled={!canEdit}
                />
                Enable redirect after this question
              </label>
              
              {formData.redirectEnabled && (
                <div className="redirect-config">
                  <label>Redirect URL</label>
                  <input
                    type="url"
                    value={formData.redirectUrl || ''}
                    onChange={(e) => handleChange('redirectUrl', e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://example.com/offer"
                    className="url-input"
                  />
                  
                  <div className="info-box small">
                    <strong>Placeholders:</strong>
                    <code>{'{session_id}'}</code> <code>{'{click_id}'}</code> <code>{'{answer}'}</code>
                  </div>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.allowResume !== false}
                      onChange={(e) => handleChange('allowResume', e.target.checked)}
                      disabled={!canEdit}
                    />
                    Allow user to return and continue survey
                  </label>
                  
                  {formData.allowResume !== false && (
                    <div className="resume-note">
                      ✅ User gets a return link (valid 24 hours)
                    </div>
                  )}
                  
                  <label>Redirect Condition (Optional)</label>
                  <select
                    value={formData.redirectCondition || 'always'}
                    onChange={(e) => handleChange('redirectCondition', e.target.value)}
                    disabled={!canEdit}
                    className="config-select"
                  >
                    <option value="always">Always redirect after this question</option>
                    {node.data.options?.map((opt: string) => (
                      <option key={opt} value={opt}>Only if answer is "{opt}"</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Redirect Node - Editable */}
        {node.type === 'redirect' && (
          <div className="config-section">
            <label>Name</label>
            <input
              type="text"
              value={formData.label || ''}
              onChange={(e) => handleChange('label', e.target.value)}
              disabled={!canEdit}
              placeholder="Redirect name"
            />
            
            <label>Redirect URL</label>
            <input
              type="url"
              value={formData.url || ''}
              onChange={(e) => handleChange('url', e.target.value)}
              disabled={!canEdit}
              placeholder="https://..."
            />
            
            <div className="info-box">
              <strong>💡 Tip:</strong> Use placeholders in URL:
              <code>{'{session_id}'}</code>, <code>{'{survey_id}'}</code>, <code>{'{click_id}'}</code>
            </div>
            
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.resumeEnabled !== false}
                onChange={(e) => handleChange('resumeEnabled', e.target.checked)}
                disabled={!canEdit}
              />
              Enable resume (user can return to continue)
            </label>
            
            {formData.resumeEnabled !== false && (
              <div className="resume-info">
                <p>✅ Resume enabled - Return link valid for 24 hours</p>
                <p className="hint">User will continue from the next question after this redirect.</p>
              </div>
            )}
            
            <label>Resume to Question</label>
            <select
              value={formData.resumeToQuestion || 'next'}
              onChange={(e) => handleChange('resumeToQuestion', e.target.value)}
              disabled={!canEdit}
              className="config-select"
            >
              <option value="next">Next question after current</option>
              {questions.map((q, i) => (
                <option key={q.id} value={q.id}>Q{i + 1}: {q.question.slice(0, 40)}...</option>
              ))}
            </select>
            
            <label>Color</label>
            <input
              type="color"
              value={formData.color || '#f59e0b'}
              onChange={(e) => handleChange('color', e.target.value)}
              disabled={!canEdit}
              className="color-input"
            />
          </div>
        )}


        {/* Branch Node - Editable */}
        {node.type === 'branch' && (
          <div className="config-section">
            <label>Branch Name</label>
            <input
              type="text"
              value={formData.label || ''}
              onChange={(e) => handleChange('label', e.target.value)}
              disabled={!canEdit}
              placeholder="Branch name"
            />
            
            {formData.triggerQuestion && (
              <>
                <label>Triggered By</label>
                <p className="readonly-value">Question: {formData.triggerQuestion}</p>
              </>
            )}
            
            {formData.triggerType && (
              <div className="ai-badge">
                <GitBranch size={12} />
                AI-generated: {formData.triggerType}
              </div>
            )}
            
            <label>Conditions</label>
            <div className="conditions-list">
              {(formData.conditions || []).map((cond: any, i: number) => (
                <div key={i} className="condition-row">
                  <span className="cond-answers">
                    {Array.isArray(cond.answer) ? cond.answer.join(', ') : cond.answer}
                  </span>
                  <span className="cond-arrow">→</span>
                  <span className="cond-action">{cond.action || cond.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* End Node - Read Only */}
        {node.type === 'end' && (
          <div className="config-section">
            <label>Label</label>
            <p className="readonly-value">{node.data.label || 'Survey Complete'}</p>
          </div>
        )}
      </div>


      {/* Actions */}
      <div className="panel-actions">
        {canEdit && (
          <button className="save-btn" onClick={handleSave}>
            <Save size={14} />
            Save Changes
          </button>
        )}
        
        {canDelete && editMode && (
          <button className="delete-btn" onClick={onDelete}>
            <Trash2 size={14} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default NodeConfigPanel;
