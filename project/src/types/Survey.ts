export interface ShowIfCondition {
  depends_on: string;
  condition: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: string | number | string[];
}

export interface Question {
  id: string;
  question: string;
  questionDescription?: string;
  answerDescription?: string;
  type: 'text' | 'radio' | 'checkbox' | 'dropdown' | 'dropdown_multi' | 'range' | 'multiple_choice' | 'yes_no' | 'short_answer' | 'rating' | 'matrix' | 'list';
  options?: string[];
  required?: boolean;
  answerStyle?: string;
  /** Allow selecting multiple options (checkbox mode) for multiple_choice questions */
  allowMultiple?: boolean;
  /** How many options to generate with AI for multiple_choice (2-10, default 4) */
  optionCount?: number;
  /** Column headers for matrix questions */
  matrixColumns?: string[];
  /** Delay in milliseconds before this question appears after the previous one */
  questionDelay?: number;
  show_if?: ShowIfCondition | null;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  /** URL of an image shown with the question text */
  questionImage?: string;
  /** Whether the question image appears above or below the question text. Defaults to 'above'. */
  questionImagePosition?: 'above' | 'below';
  /** Map of option text → image URL for per-option images */
  optionImages?: Record<string, string>;
  /** How option images are displayed: alongside the label or replacing it entirely */
  optionImageMode?: 'with-text' | 'replace-text';
}

export interface SurveyPage {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  order: number;
}

export interface AnimationConfig {
  questionAnimation: 'fadeSlideUp' | 'typewriter' | 'flipIn' | 'zoomBounce' | 'slideFromLeft' | 'blurReveal';
  answerAnimation: 'fadeIn' | 'popScale' | 'slideUp' | 'staggerFade' | 'elastic' | 'glowReveal';
  delayMs: number;       // delay before animation starts (0-2000ms)
  speedMs: number;       // animation duration (200-1500ms)
  autoAdvance: boolean;  // auto-advance to next question after answering
  autoAdvanceDelay: number; // delay before auto-advance (500-5000ms)
}

export type AnswerStyle = 'classic' | 'underline' | 'card' | 'pill' | 'flat';

export interface Survey {
  id: string;
  _id?: string;
  title?: string;
  subtitle?: string;
  prompt?: string;
  template_type: string;
  questions: Question[];
  pages?: SurveyPage[];
  animation?: AnimationConfig;
  answerStyle?: AnswerStyle;
  /**
   * Whether to ask respondents for their GPS location when they open the survey.
   * Defaults to true (location popup shown). Set to false to disable the popup.
   */
  collect_location?: boolean;
  theme?: {
    font: string;
    intent: string;
    colors: {
      primary: string;
      background: string;
      text: string;
    };
  };
  created_at?: string;
  shareable_link?: string;
  public_link?: string;
  [key: string]: unknown;
}
