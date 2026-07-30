/**
 * EdgeConfigPanel - Edit edge/connection properties
 */

import React, { useState, useEffect } from 'react';
import { Edge } from '@xyflow/react';
import { X, Trash2, Save, ArrowRight } from 'lucide-react';
import './PanelStyles.css';

interface Props {
  edge: Edge;
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

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'in_list', label: 'In List (comma separated)' },
];

const EdgeConfigPanel: React.FC<Props> = ({
  edge,
  onUpdate,
  onDelete,
  onClose,
  editMode,
  questions
}) => {
  const [label, setLabel] = useState(edge.label?.toString() || '');
  const [conditionType, setConditionType] = useState(edge.data?.condition?.type || 'always');
  const [conditionOperator, setConditionOperator] = useState(edge.data?.condition?.operator || 'equals');
  const [conditionValue, setConditionValue] = useState(edge.data?.condition?.value || '');
  const [animated, setAnimated] = useState(edge.animated ?? false);


  // Get source question for options
  const sourceQuestion = questions.find(q => q.id === edge.source);
  const sourceOptions = sourceQuestion?.options || [];

  const handleSave = () => {
    onUpdate({
      label,
      animated,
      data: {
        ...edge.data,
        condition: conditionType === 'always' ? null : {
          type: conditionType,
          operator: conditionOperator,
          value: conditionValue
        }
      }
    });
  };

  return (
    <div className="node-config-panel edge-panel">
      <div className="panel-header">
        <h3>
          <ArrowRight size={14} /> Connection
        </h3>
        <button className="close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="panel-content">
        <div className="config-section">
          <div className="edge-path-info">
            <span className="path-node">{edge.source}</span>
            <ArrowRight size={14} />
            <span className="path-node">{edge.target}</span>
          </div>

          <label>Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={!editMode}
            placeholder="e.g., 'Yes', 'No', 'Score > 5'"
          />

          <label>Condition Type</label>
          <select
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value)}
            disabled={!editMode}
            className="config-select"
          >
            <option value="always">Always (default path)</option>
            <option value="answer">Based on Answer</option>
            <option value="score">Based on Score</option>
          </select>


          {conditionType !== 'always' && (
            <>
              <label>Operator</label>
              <select
                value={conditionOperator}
                onChange={(e) => setConditionOperator(e.target.value)}
                disabled={!editMode}
                className="config-select"
              >
                {CONDITION_OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              <label>Value</label>
              {sourceOptions.length > 0 ? (
                <select
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  disabled={!editMode}
                  className="config-select"
                >
                  <option value="">Select an option</option>
                  {sourceOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  disabled={!editMode}
                  placeholder="Enter value..."
                />
              )}
            </>
          )}

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={animated}
              onChange={(e) => setAnimated(e.target.checked)}
              disabled={!editMode}
            />
            Animated connection
          </label>
        </div>
      </div>

      <div className="panel-actions">
        {editMode && (
          <>
            <button className="save-btn" onClick={handleSave}>
              <Save size={14} />
              Save
            </button>
            <button className="delete-btn" onClick={onDelete}>
              <Trash2 size={14} />
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EdgeConfigPanel;
