/**
 * EndNode - Represents survey completion point
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CheckCircle2 } from 'lucide-react';
import './NodeStyles.css';

const EndNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={`flow-node end-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="handle-target" />
      
      <div className="node-header end">
        <CheckCircle2 size={14} />
        <span>End</span>
      </div>
      
      <div className="node-content">
        <p className="node-label">{data.label || 'Survey Complete'}</p>
        {data.redirectUrl && (
          <p className="node-url">→ {data.redirectUrl}</p>
        )}
      </div>
    </div>
  );
};

export default memo(EndNode);
