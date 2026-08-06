/**
 * BranchFlowEditor — Two-mode visual flow diagram
 *
 * Mode "simple" → draws the flow from your manually-set Simple Table rules
 * Mode "ai"     → draws AI-generated branching (independent of your rules)
 *
 * The "Activate" button sets which mode the survey actually uses at runtime.
 * Context menu on question nodes: Redirect | End Survey
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import QuestionNode from './nodes/QuestionNode';
import RedirectNode from './nodes/RedirectNode';
import EndNode from './nodes/EndNode';
import BranchNode from './nodes/BranchNode';
import StartNode from './nodes/StartNode';
import NodeConfigPanel from './panels/NodeConfigPanel';
import EdgeConfigPanel from './panels/EdgeConfigPanel';
import './BranchFlowEditor.css';

import { getApiBaseUrl } from '../../utils/deploymentFix';
import {
  Eye, Edit3, RefreshCw, Save, Check, AlertCircle,
  Undo2, Redo2, Zap, List, ExternalLink, Square, X
} from 'lucide-react';

const nodeTypes = {
  question: QuestionNode,
  redirect: RedirectNode,
  end: EndNode,
  branch: BranchNode,
  start: StartNode,
};

const defaultEdgeOptions = {
  style: { strokeWidth: 2, stroke: '#94a3b8' },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
};

interface Props {
  surveyId: string;
  questions: Array<{
    id: string;
    question: string;
    type: string;
    options?: string[];
    show_if?: any;
  }>;
  onClose?: () => void;
  onSwitchToSimple?: () => void;
  refreshKey?: number;
}

// Context menu state
interface ContextMenu {
  nodeId: string;
  nodeData: any;
  x: number;
  y: number;
}

const BranchFlowEditor: React.FC<Props> = ({ surveyId, questions, onClose, onSwitchToSimple, refreshKey }) => {
  const baseUrl = getApiBaseUrl();
  const { fitView } = useReactFlow();

  // Which flow type we're viewing
  const [viewMode, setViewMode] = useState<'simple' | 'ai'>('simple');
  // Which mode is actually ACTIVE at runtime
  const [activeMode, setActiveMode] = useState<'simple' | 'ai'>('simple');
  const [activating, setActivating] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // Redirect popup state (from context menu)
  const [redirectPopup, setRedirectPopup] = useState<{ nodeId: string; nodeData: any } | null>(null);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [redirectColor, setRedirectColor] = useState('#f59e0b');

  // Undo/Redo
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistoryLength = 50;

  const saveToHistory = useCallback(() => {
    const newState = { nodes: [...nodes], edges: [...edges] };
    setHistory(prev => {
      const h = prev.slice(0, historyIndex + 1);
      h.push(newState);
      if (h.length > maxHistoryLength) h.shift();
      return h;
    });
    setHistoryIndex(prev => Math.min(prev + 1, maxHistoryLength - 1));
  }, [nodes, edges, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setNodes(history[historyIndex - 1].nodes);
      setEdges(history[historyIndex - 1].edges);
      setHistoryIndex(p => p - 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setNodes(history[historyIndex + 1].nodes);
      setEdges(history[historyIndex + 1].edges);
      setHistoryIndex(p => p + 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  useEffect(() => {
    if (nodes.length > 0 && history.length === 0) {
      setHistory([{ nodes: [...nodes], edges: [...edges] }]);
      setHistoryIndex(0);
    }
  }, [nodes, edges, history.length]);

  // Fetch active mode from backend
  const fetchActiveMode = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/surveys/${surveyId}/branching-mode`);
      if (res.ok) {
        const d = await res.json();
        setActiveMode(d.active_branching_mode || 'simple');
      }
    } catch { /* silent */ }
  }, [baseUrl, surveyId]);

  // Fetch flow for current viewMode
  const fetchFlow = useCallback(async (type: 'simple' | 'ai') => {
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/api/surveys/${surveyId}/branch-flow?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setTimeout(() => fitView({ padding: 0.15, duration: 500 }), 100);
      } else {
        setMessage({ type: 'error', text: 'Failed to load flow' });
      }
    } catch {
      console.error('BranchFlowEditor: network error loading flow');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, surveyId, setNodes, setEdges, fitView]);

  useEffect(() => {
    fetchActiveMode();
  }, [fetchActiveMode]);

  useEffect(() => {
    fetchFlow(viewMode);
  }, [surveyId, viewMode, refreshKey]);

  // Switch view mode tabs
  const switchViewMode = (mode: 'simple' | 'ai') => {
    setViewMode(mode);
    setSelectedNode(null);
    setSelectedEdge(null);
    setHasChanges(false);
  };

  // Save flow — for AI mode saves layout; for My Rules also syncs end_here/redirect_config back to DB
  const saveFlow = useCallback(async () => {
    try {
      setSaving(true);

      // Always save the visual layout
      await fetch(`${baseUrl}/api/surveys/${surveyId}/branch-flow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges, flow_type: viewMode })
      });

      // For My Rules: persist end_here nodes back to survey questions in DB.
      // ONLY process end nodes that were explicitly added via context menu
      // (those have ids like "end_qID_timestamp", NOT the auto-generated "end" node)
      if (viewMode === 'simple') {
        for (const edge of edges) {
          const targetNode = nodes.find(n => n.id === edge.target && n.type === 'end');
          // Skip the global "end" node — it's auto-generated, not user-added
          if (!targetNode || edge.target === 'end') continue;
          const sourceQuestionId = edge.source;
          const edgeLabel = String(edge.label || '');
          // Parse condition from edge label
          const condition = edgeLabel.startsWith('If "')
            ? edgeLabel.slice(4, -1)
            : 'always';
          await fetch(`${baseUrl}/api/surveys/${surveyId}/question/${sourceQuestionId}/end-here`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ condition })
          });
        }
        setMessage({ type: 'success', text: 'Saved! Reflected in Simple Table too.' });
      } else {
        setMessage({ type: 'success', text: 'Layout saved!' });
      }
      setHasChanges(false);
    } catch {
      setMessage({ type: 'error', text: 'Failed. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [baseUrl, surveyId, nodes, edges, viewMode]);

  // Regenerate AI flow (AI always, simple just re-renders from saved rules)
  const regenerateFlow = useCallback(async () => {
    const label = viewMode === 'ai' ? 'AI-generated' : 'Simple Rules';
    if (!confirm(`Regenerate the ${label} flow? This will redraw it from scratch.`)) return;
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/api/surveys/${surveyId}/branch-flow/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow_type: viewMode })
      });
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setMessage({ type: 'success', text: `${label} flow regenerated!` });
        setHasChanges(false);
        setTimeout(() => fitView({ padding: 0.15, duration: 800 }), 100);
      }
    } catch { setMessage({ type: 'error', text: 'Failed to regenerate' }); }
    finally { setLoading(false); }
  }, [baseUrl, surveyId, viewMode, setNodes, setEdges, fitView]);

  // Activate a mode — sets it as the live runtime branching
  const activateMode = useCallback(async (mode: 'simple' | 'ai') => {
    if (activeMode === mode) return;
    const label = mode === 'ai' ? 'AI Generated' : 'Simple Rules';
    if (!confirm(`Activate "${label}" as the live branching rules for this survey?\n\nUsers who take the survey will now see questions in the ${label} order.`)) return;
    try {
      setActivating(true);
      const res = await fetch(`${baseUrl}/api/surveys/${surveyId}/branching-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      if (res.ok) {
        setActiveMode(mode);
        setMessage({ type: 'success', text: `✅ "${label}" is now the active branching mode!` });
      } else {
        setMessage({ type: 'error', text: 'Failed to activate mode' });
      }
    } catch { setMessage({ type: 'error', text: 'Failed. Please try again.' }); }
    finally { setActivating(false); }
  }, [baseUrl, surveyId, activeMode]);

  const onConnect = useCallback((params: Connection) => {
    if (!editMode) return;
    saveToHistory();
    setEdges(eds => addEdge({ ...params, type: 'smoothstep', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' } }, eds));
    setHasChanges(true);
  }, [editMode, setEdges, saveToHistory]);

  // Node click — show context menu for question nodes in both modes
  const onNodeClick = useCallback((e: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setContextMenu(null);

    if (node.type === 'question') {
      const rect = (e.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
      if (rect) {
        setContextMenu({
          nodeId: node.id,
          nodeData: node.data,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  }, [viewMode]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setContextMenu(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Context menu: Add redirect after this question
  const handleAddRedirect = (nodeId: string, nodeData: any) => {
    setContextMenu(null);
    setRedirectUrl((nodeData.redirectConfig as any)?.url || '');
    setRedirectColor((nodeData.redirectConfig as any)?.color || '#f59e0b');
    setRedirectPopup({ nodeId, nodeData });
  };

  // Context menu: End survey at this question — saves to backend AND adds visual node
  const handleEndSurvey = async (nodeId: string) => {
    setContextMenu(null);

    // Determine if we need a condition (i.e. which answer triggers the end)
    const qNode = nodes.find(n => n.id === nodeId);
    if (!qNode) return;

    const options: string[] = (qNode.data.options as string[]) || [];

    // Ask user which answer should trigger the end (or always)
    let condition = 'always';
    if (options.length > 0) {
      const choice = window.prompt(
        `End survey after "${String(qNode.data.label).slice(0, 40)}"\n\nType an answer value to end only for that answer, or leave blank to always end here:\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n`,
        ''
      );
      if (choice === null) return; // user cancelled
      condition = choice.trim() || 'always';
    }

    // Save to backend
    try {
      const res = await fetch(`${baseUrl}/api/surveys/${surveyId}/question/${nodeId}/end-here`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition })
      });
      if (!res.ok) {
        setMessage({ type: 'error', text: 'Failed to save end-survey rule' });
        return;
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed. Please try again.' });
      return;
    }

    // Add visual end node in the diagram
    saveToHistory();
    const endNodeId = `end_${nodeId}_${Date.now()}`;
    const endNode: Node = {
      id: endNodeId,
      type: 'end',
      position: { x: qNode.position.x, y: qNode.position.y + 200 },
      data: { label: condition === 'always' ? 'Survey Ends Here' : `Survey Ends (if "${condition}")` }
    };
    const edgeLabel = condition === 'always' ? 'End Survey' : `If "${condition}"`;
    const endEdge: Edge = {
      id: `e_${nodeId}_${endNodeId}`,
      source: nodeId,
      target: endNodeId,
      type: 'smoothstep',
      animated: false,
      label: edgeLabel,
      style: { stroke: '#ef4444', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' }
    };
    setNodes(nds => [...nds, endNode]);
    setEdges(eds => [...eds, endEdge]);
    setHasChanges(true);
    setMessage({ type: 'success', text: `Survey will end after this question${condition !== 'always' ? ` when answer is "${condition}"` : ''}` });
  };

  // Confirm redirect addition
  const confirmRedirect = () => {
    if (!redirectPopup || !redirectUrl.trim()) return;
    const { nodeId } = redirectPopup;
    const qNode = nodes.find(n => n.id === nodeId);
    if (!qNode) return;

    saveToHistory();
    const redNodeId = `redirect_${nodeId}_${Date.now()}`;
    const redNode: Node = {
      id: redNodeId,
      type: 'redirect',
      position: { x: qNode.position.x + 280, y: qNode.position.y },
      data: { label: redirectUrl.length > 30 ? redirectUrl.slice(0, 30) + '…' : redirectUrl, url: redirectUrl, color: redirectColor, resumeEnabled: true }
    };
    const redEdge: Edge = {
      id: `e_${nodeId}_${redNodeId}`,
      source: nodeId,
      target: redNodeId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: redirectColor, strokeWidth: 2.5, strokeDasharray: '6,3' },
      markerEnd: { type: MarkerType.ArrowClosed, color: redirectColor }
    };
    setNodes(nds => [...nds, redNode]);
    setEdges(eds => [...eds, redEdge]);
    setHasChanges(true);
    setRedirectPopup(null);
    setMessage({ type: 'success', text: 'Redirect node added' });
  };

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode || selectedNode.type === 'question' || selectedNode.type === 'start') {
      setMessage({ type: 'error', text: 'Cannot delete question/start nodes' });
      return;
    }
    saveToHistory();
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    setHasChanges(true);
  }, [selectedNode, setNodes, setEdges, saveToHistory]);

  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdge) return;
    saveToHistory();
    setEdges(eds => eds.filter(e => e.id !== selectedEdge.id));
    setSelectedEdge(null);
    setHasChanges(true);
  }, [selectedEdge, setEdges, saveToHistory]);

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    saveToHistory();
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
    setHasChanges(true);
  }, [setNodes, saveToHistory]);

  const updateEdgeData = useCallback((edgeId: string, newData: any) => {
    saveToHistory();
    setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, ...newData } : e));
    setHasChanges(true);
  }, [setEdges, saveToHistory]);

  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(null), 3500); return () => clearTimeout(t); }
  }, [message]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setContextMenu(null); setRedirectPopup(null); }
      if (e.key === 'Delete' && selectedNode && editMode) deleteSelectedNode();
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (hasChanges) saveFlow(); }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === 'z' && e.ctrlKey && e.shiftKey) || (e.key === 'y' && e.ctrlKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedNode, editMode, deleteSelectedNode, hasChanges, saveFlow, undo, redo]);

  if (loading) {
    return (
      <div className="branch-flow-loading">
        <div className="loading-spinner" />
        <p>{viewMode === 'ai' ? 'Generating AI flow…' : 'Loading flow…'}</p>
      </div>
    );
  }

  return (
    <div className="branch-flow-editor" onClick={() => setContextMenu(null)}>

      {/* ─── Header ─── */}
      <div className="branch-flow-header">
        <div className="header-left">
          {onSwitchToSimple && (
            <button className="back-to-simple-btn" onClick={onSwitchToSimple}>
              ← Simple Table
            </button>
          )}
          {hasChanges && <span className="unsaved-badge">Unsaved</span>}
        </div>

        {/* View mode tabs */}
        <div className="flow-view-tabs">
          <button
            className={`flow-tab ${viewMode === 'simple' ? 'active' : ''}`}
            onClick={() => switchViewMode('simple')}
          >
            <List size={14} /> My Rules
            {activeMode === 'simple' && <span className="active-dot" title="Currently active" />}
          </button>
          <button
            className={`flow-tab ${viewMode === 'ai' ? 'active' : ''}`}
            onClick={() => switchViewMode('ai')}
          >
            <Zap size={14} /> AI Generated
            {activeMode === 'ai' && <span className="active-dot" title="Currently active" />}
          </button>
        </div>

        <div className="header-right">
          {/* ACTIVATE button */}
          {activeMode !== viewMode ? (
            <button
              className="activate-btn"
              onClick={() => activateMode(viewMode)}
              disabled={activating}
              title={`Use ${viewMode === 'ai' ? 'AI Generated' : 'My Rules'} branching for this survey`}
            >
              {activating ? <><RefreshCw size={14} className="spinning" /> Activating…</> : <>✅ Use This Flow</>}
            </button>
          ) : (
            <span className="activated-badge">✅ Currently Active</span>
          )}

          {/* Edit mode toggle — both flows are editable */}
          <button className={`mode-toggle ${editMode ? 'active' : ''}`} onClick={() => setEditMode(v => !v)}>
            {editMode ? <Edit3 size={15} /> : <Eye size={15} />}
            {editMode ? 'Editing' : 'View'}
          </button>
        </div>
      </div>

      {/* ─── Toast ─── */}
      {message && (
        <div className={`flow-message ${message.type}`}>
          {message.type === 'success' && <Check size={15} />}
          {message.type === 'error' && <AlertCircle size={15} />}
          {message.text}
        </div>
      )}

      {/* ─── Canvas ─── */}
      <div className="branch-flow-canvas" style={{ position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={editMode ? onNodesChange : undefined}
          onEdgesChange={editMode ? onEdgesChange : undefined}
          onConnect={editMode ? onConnect : undefined}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          snapToGrid={editMode}
          snapGrid={[20, 20]}
          nodesDraggable={editMode}
          nodesConnectable={editMode}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Lines} gap={40} size={1} color="#cce8f0" />
          <Controls showInteractive={false} />
          <MiniMap nodeColor={n => n.type === 'question' ? '#6366f1' : n.type === 'redirect' ? '#f59e0b' : n.type === 'end' ? '#ef4444' : '#94a3b8'} maskColor="rgba(255,255,255,0.8)" />

          <Panel position="top-left" className="flow-toolbar">
            <div className="toolbar-group">
              <button onClick={undo} disabled={historyIndex <= 0} className="toolbar-btn" title="Undo">
                <Undo2 size={15} />
              </button>
              <button onClick={redo} disabled={historyIndex >= history.length - 1} className="toolbar-btn" title="Redo">
                <Redo2 size={15} />
              </button>
            </div>
            <div className="toolbar-divider" />
            <div className="toolbar-group">
              <button onClick={saveFlow} disabled={saving || !hasChanges} className="toolbar-btn primary" title="Save layout (Ctrl+S)">
                <Save size={15} /> {saving ? 'Saving…' : 'Save'}
              </button>
              {viewMode === 'ai' && (
                <button onClick={regenerateFlow} className="toolbar-btn" title="Re-run AI to suggest new branching">
                  <RefreshCw size={15} /> Re-run AI
                </button>
              )}
            </div>
          </Panel>
        </ReactFlow>

        {/* ─── Node Context Menu ─── */}
        {contextMenu && (
          <div
            className="node-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={e => e.stopPropagation()}
          >
            <div className="ctx-title">
              {String(contextMenu.nodeData.label || '').slice(0, 40)}
            </div>
            <button className="ctx-btn redirect" onClick={() => handleAddRedirect(contextMenu.nodeId, contextMenu.nodeData)}>
              <ExternalLink size={13} /> Add Redirect after this
            </button>
            <button className="ctx-btn end" onClick={() => handleEndSurvey(contextMenu.nodeId)}>
              <Square size={13} /> End Survey here
            </button>
            <button className="ctx-btn cancel" onClick={() => setContextMenu(null)}>
              <X size={13} /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* ─── Redirect popup ─── */}
      {redirectPopup && (
        <div className="redirect-popup-overlay" onClick={() => setRedirectPopup(null)}>
          <div className="redirect-popup" onClick={e => e.stopPropagation()}>
            <h4>Add Redirect after Q{(redirectPopup.nodeData.questionIndex as number ?? 0) + 1}</h4>
            <label>Redirect URL</label>
            <input
              type="text"
              value={redirectUrl}
              onChange={e => setRedirectUrl(e.target.value)}
              placeholder="https://moustache.com/offer?click_id={click_id}&return_url={return_url}"
              className="url-input"
            />
            <label>Node Color</label>
            <div className="color-picker-row">
              {['#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#3b82f6'].map(c => (
                <button key={c} className={`color-swatch ${redirectColor === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => setRedirectColor(c)} />
              ))}
            </div>
            <div className="redirect-popup-actions">
              <button className="sbr-btn primary" onClick={confirmRedirect} disabled={!redirectUrl.trim()}>
                Add Redirect Node
              </button>
              <button className="sbr-btn" onClick={() => setRedirectPopup(null)} style={{ background: '#f1f5f9', color: '#475569' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side panels — available in both modes */}
      {selectedNode && (
        <NodeConfigPanel node={selectedNode} onUpdate={d => updateNodeData(selectedNode.id, d)}
          onDelete={deleteSelectedNode} onClose={() => setSelectedNode(null)} editMode={editMode} questions={questions} />
      )}
      {selectedEdge && (
        <EdgeConfigPanel edge={selectedEdge} onUpdate={d => updateEdgeData(selectedEdge.id, d)}
          onDelete={deleteSelectedEdge} onClose={() => setSelectedEdge(null)} editMode={editMode} questions={questions} />
      )}

      {/* ─── Legend ─── */}
      <div className="flow-legend">
        <div className="legend-item"><span className="legend-color question" />Question</div>
        <div className="legend-item"><span className="legend-color redirect" />Redirect</div>
        <div className="legend-item"><span className="legend-color end" />End</div>
      </div>
    </div>
  );
};

const BranchFlowEditorWithProvider: React.FC<Props> = props => (
  <ReactFlowProvider>
    <BranchFlowEditor {...props} />
  </ReactFlowProvider>
);

export default BranchFlowEditorWithProvider;
