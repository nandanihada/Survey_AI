export interface Question {
  id: string;
  question: string;
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

export interface Survey {
  id: string;
  _id?: string;
  title?: string;
  subtitle?: string;
  prompt?: string;
  template_type: string;
  questions: Question[];
  pages?: SurveyPage[];
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
