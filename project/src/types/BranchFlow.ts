/**
 * Branch Flow Types
 * Type definitions for the branching flow visualization system
 */

import { Node, Edge, Viewport } from '@xyflow/react';

// ═══════════════════════════════════════════════════════
//  NODE TYPES
// ═══════════════════════════════════════════════════════

export interface QuestionNodeData {
  label: string;
  fullQuestion: string;
  questionType: 'text' | 'radio' | 'checkbox' | 'dropdown' | 'range' | 'multiple_choice' | 'yes_no' | 'short_answer' | 'rating';
  options: string[];
  questionIndex: number;
  required: boolean;
  show_if?: ShowIfCondition | null;
  hasBranching?: boolean;
  branchingReason?: string;
}

export interface RedirectNodeData {
  label: string;
  url: string;
  resumeEnabled: boolean;
  resumeQuestionIndex?: number;
  expiryHours: number;
  color: string;
}

export interface EndNodeData {
  label: string;
  redirectUrl?: string;
  message: string;
}

export interface RedirectEndNodeData {
  label: string;
  url: string;
  color: string;
  endpointId: string;
  statusCode: number;
}

export interface ConditionNodeData {
  label: string;
  conditions: BranchCondition[];
  logic: 'AND' | 'OR';
}

// ═══════════════════════════════════════════════════════
//  CONDITION TYPES
// ═══════════════════════════════════════════════════════

export interface ShowIfCondition {
  depends_on: string;
  condition: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number;
}

export interface BranchCondition {
  questionId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in_list';
  value: string | number | string[];
}

// ═══════════════════════════════════════════════════════
//  EDGE TYPES
// ═══════════════════════════════════════════════════════

export interface ConditionalEdgeData {
  condition?: string;
  value?: string | number;
  isConditional: boolean;
  label?: string;
}

// ═══════════════════════════════════════════════════════
//  FLOW CONFIG
// ═══════════════════════════════════════════════════════

export type FlowMode = 'standard' | 'mid_redirect' | 'custom';

export interface BranchFlowConfig {
  _id?: string;
  survey_id: string;
  mode: FlowMode;
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  is_auto_generated?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ═══════════════════════════════════════════════════════
//  PREDICTION TYPES
// ═══════════════════════════════════════════════════════

export interface BranchPrediction {
  question_id: string;
  question_index: number;
  has_branching: boolean;
  branch_type: 'satisfaction' | 'recommend' | 'rating' | 'yes_no' | null;
  reason: string | null;
  possible_paths: {
    condition: string;
    action: string;
  }[];
  has_conditional_display?: boolean;
  depends_on?: string;
}

// ═══════════════════════════════════════════════════════
//  SESSION & RESUME TYPES
// ═══════════════════════════════════════════════════════

export interface RedirectSession {
  session_id: string;
  survey_id: string;
  current_question_index: number;
  resume_question_index: number;
  answered_questions: Record<string, string | number>;
  redirect_node_id: string;
  redirect_url: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  return_count: number;
}

export interface PrepareRedirectResponse {
  session_id: string;
  resume_token: string;
  return_url: string;
  expires_at: string;
  resume_question_index: number;
}

export interface ResumeResponse {
  session_id: string;
  survey_id: string;
  resume_question_index: number;
  answered_questions: Record<string, string | number>;
  return_count: number;
}

// ═══════════════════════════════════════════════════════
//  COMPONENT PROPS
// ═══════════════════════════════════════════════════════

export interface BranchFlowEditorProps {
  surveyId: string;
  questions: {
    id: string;
    question: string;
    type: string;
    options?: string[];
    show_if?: ShowIfCondition | null;
  }[];
  onClose: () => void;
  isDarkMode?: boolean;
}
