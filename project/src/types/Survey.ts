export interface Question {
  id: string;
  question: string;
  questionDescription?: string;
  answerDescription?: string;
  type: 'text' | 'radio' | 'checkbox' | 'dropdown' | 'range' | 'multiple_choice' | 'yes_no' | 'short_answer' | 'rating';
  options?: string[];
  required?: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
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
