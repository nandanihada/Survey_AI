export interface Question {
  id: string;
  question: string;
  type: 'text' | 'radio' | 'range';
  options?: string[];
}

export interface Survey {
  id: string;
  title?: string;
  subtitle?: string;
  template_type: string;
  questions: Question[];
  [key: string]: unknown;
}
