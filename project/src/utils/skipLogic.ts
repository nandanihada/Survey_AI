/**
 * Skip Logic Engine — Determines which questions should be visible
 * based on respondent's current answers.
 */

import type { ShowIfCondition } from '../types/Survey';

interface QuestionWithShowIf {
  id: string;
  show_if?: ShowIfCondition | null;
  [key: string]: unknown;
}

/**
 * Check if a single question should be visible given current answers.
 */
export function shouldShowQuestion(
  question: QuestionWithShowIf,
  answers: Record<string, string | number>
): boolean {
  // No condition = always show
  if (!question.show_if) return true;

  const { depends_on, condition, value } = question.show_if;
  const parentAnswer = answers[depends_on];

  // If parent hasn't been answered yet, hide this conditional question
  if (parentAnswer === undefined || parentAnswer === '' || parentAnswer === null) {
    return false;
  }

  switch (condition) {
    case 'equals':
      return String(parentAnswer).toLowerCase() === String(value).toLowerCase();

    case 'not_equals':
      return String(parentAnswer).toLowerCase() !== String(value).toLowerCase();

    case 'greater_than':
      return Number(parentAnswer) > Number(value);

    case 'less_than':
      return Number(parentAnswer) < Number(value);

    case 'contains':
      return String(parentAnswer).toLowerCase().includes(String(value).toLowerCase());

    default:
      return true;
  }
}

/**
 * Filter a list of questions to only those that should be visible.
 * Preserves order.
 */
export function getVisibleQuestions<T extends QuestionWithShowIf>(
  questions: T[],
  answers: Record<string, string | number>
): T[] {
  return questions.filter(q => shouldShowQuestion(q, answers));
}

/**
 * Get the count of visible questions (for progress bar).
 */
export function getVisibleQuestionCount(
  questions: QuestionWithShowIf[],
  answers: Record<string, string | number>
): number {
  return getVisibleQuestions(questions, answers).length;
}

/**
 * Given the current visible question index, get the actual index
 * in the full questions array.
 */
export function getActualIndex(
  questions: QuestionWithShowIf[],
  answers: Record<string, string | number>,
  visibleIndex: number
): number {
  const visible = getVisibleQuestions(questions, answers);
  if (visibleIndex < 0 || visibleIndex >= visible.length) return -1;
  const targetId = visible[visibleIndex].id;
  return questions.findIndex(q => q.id === targetId);
}
