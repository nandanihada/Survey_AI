import { Question } from '../components/WidgetCustomizer';

export interface ParsedQuestion {
  text: string;
  type: 'emoji' | 'scale' | 'choice' | 'short_answer' | 'invalid';
  options: {
    id: string;
    label: string;
    emoji?: string;
  }[];
}

export class QuestionAnswerParser {
  private static readonly EMOJI_REGEX =
    /[😀-🙏]|[🌀-🗿]|[🚀-🛿]|[🇠-🇿]|[☀-⛿]|[✀-➿]/gu;

  private static readonly SCALE_KEYWORDS = [
    'rate',
    'rating',
    'scale',
    'score',
    'from 1 to',
    'out of',
    'stars',
    'likelihood',
    'likely',
    'probability'
  ];

  private static readonly CHOICE_KEYWORDS = [
    'select',
    'choose',
    'pick',
    'which',
    'what',
    'option',
    'prefer',
    'favorite'
  ];

  private static readonly EMOJI_KEYWORDS = [
    'feel',
    'feeling',
    'mood',
    'emotion',
    'reaction',
    'express'
  ];

  private static readonly SHORT_ANSWER_KEYWORDS = [
    'explain',
    'describe',
    'tell us',
    'comment',
    'thoughts',
    'feedback',
    'opinion',
    'suggestion',
    'why',
    'how',
    'what would you',
    'elaborate'
  ];

  static parseContent(content: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];

    content = content.replace(/(\d+\.)\s*/g, '\n$1 ');
    content = content.replace(/([a-d]\))(?=\S)/gi, '$1 ');

    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    let currentQuestionText: string | null = null;
    let currentOptions: string[] = [];

    const pushQuestion = () => {
      if (!currentQuestionText) return;

      const type = this.inferTypeFromContent(currentQuestionText, currentOptions);
      const options =
        type !== 'short_answer' && type !== 'invalid'
          ? currentOptions.map((opt, i) => {
              const { label, emoji } = this.processOption(opt, type, i);
              return { id: `opt${i + 1}`, label, emoji };
            })
          : [];

      questions.push({
        text: currentQuestionText,
        type,
        options
      });

      currentQuestionText = null;
      currentOptions = [];
    };

   for (const line of lines) {
 const inlineMatches = line.match(/(\d+\..+?)(?=(\d+\.|[a-d]\)|$))/gi);
if (inlineMatches && inlineMatches.length >= 1) {
  for (let i = 0; i < inlineMatches.length; i++) {
    const part = inlineMatches[i];
    pushQuestion();
    currentQuestionText = this.cleanQuestionText(part);

    const isLast = i === inlineMatches.length - 1;
    if (isLast) {
      const remaining = line.split(part)[1] || '';
      const optMatches = remaining.match(/([a-d]\)\s*[^a-d]\S*(?:\s[^a-d]\S*)*)/gi);

      if (optMatches) {
        currentOptions.push(...optMatches.map(o => this.cleanOptionText(o)));
      }
    }
  }
  continue;
}




      if (this.isQuestionLine(line)) {
        pushQuestion();
        currentQuestionText = this.cleanQuestionText(line);
      } else if (this.isOptionLine(line)) {
        currentOptions.push(this.cleanOptionText(line));
      } else if (this.hasCommaSeparatedOptions(line)) {
        currentOptions.push(...this.parseCommaSeparatedOptions(line));
      } else if (this.looksLikeOptions(line)) {
        currentOptions.push(...this.extractOptionsFromText(line));
  } else if (currentQuestionText && !line.includes('__')) {
    currentQuestionText += ' ' + line;
  }
}

    pushQuestion();
    return questions;
  }

  private static isQuestionLine(line: string): boolean {
    return (
      line.endsWith('?') ||
      !!line.match(/^(what|how|why|when|where|which|who|do|does|did|is|are|was|were|have|has|had|can|could|would|should|will|may|might)\b/i) ||
      !!line.match(/^\d+\./i) ||
      line.toLowerCase().startsWith('question') ||
      line.toLowerCase().includes('multiple choice')
    );
  }

  private static isOptionLine(line: string): boolean {
    return (
      !!line.match(/^([a-dA-D]\)|[-•→>]{1,2})\s+/) ||
      !!line.match(/^\s*→\s*[a-dA-D]\)/)
    );
  }

  private static hasCommaSeparatedOptions(line: string): boolean {
    return (line.match(/,/g) || []).length >= 2;
  }

  private static looksLikeOptions(line: string): boolean {
    return (
      this.hasCommaSeparatedOptions(line) ||
      /\s(or|and)\s/.test(line) ||
      /[|/]/.test(line) ||
      line.includes(' - ')
    );
  }

  private static cleanQuestionText(line: string): string {
    return line
      .replace(/^(Q\d*[:.]?\s*|Question\s*\d*[:.]?\s*|\d+.?\s*)/i, '')
      .replace(/^([a-zA-Z0-9]\)|[a-zA-Z0-9].|[-•→>]{1,2})\s/, '')
      .trim();
  }

  private static cleanOptionText(line: string): string {
    return line.replace(/^([a-dA-D]\)|[a-zA-Z0-9].|[-•→>]{1,2})\s*/, '').trim();
  }

  private static parseCommaSeparatedOptions(line: string): string[] {
    return line.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
  }

  private static extractOptionsFromText(line: string): string[] {
    const separators = [',', '|', '/', ' - ', ' or ', ' and '];
    for (const sep of separators) {
      if (line.includes(sep)) {
        return line.split(sep).map(p => p.trim()).filter(p => p);
      }
    }
    return [];
  }

  private static detectQuestionType(text: string): ParsedQuestion['type'] {
    const lower = text.toLowerCase();
    if (this.SHORT_ANSWER_KEYWORDS.some(k => lower.includes(k))) return 'short_answer';
    if (this.EMOJI_KEYWORDS.some(k => lower.includes(k))) return 'emoji';
    if (this.SCALE_KEYWORDS.some(k => lower.includes(k))) return 'scale';
    if (/\d+\s*(-|to|out of)\s*\d+/.test(lower)) return 'scale';
    return 'choice';
  }

  private static inferTypeFromContent(
    questionText: string,
    options: string[]
  ): ParsedQuestion['type'] {
    if (/lol|idk|omg|🤷|options[:\s]*$/i.test(questionText)) {
      return 'invalid';
    }

    if (options.some(opt => this.EMOJI_REGEX.test(opt))) {
      return 'emoji';
    }

    if (
      options.length >= 3 &&
      options.every(opt =>
        /^\d+/.test(opt.trim()) || opt.match(/^\d+\s*[-–]\s*/)
      )
    ) {
      return 'scale';
    }

    if (options.length === 0) {
      return 'short_answer';
    }

    return this.detectQuestionType(questionText);
  }

  private static processOption(
    option: string,
    type: ParsedQuestion['type'],
    index: number
  ): { label: string; emoji?: string } {
    const emojiMatch = option.match(this.EMOJI_REGEX);
    const emoji = emojiMatch?.[0];
    const label = emoji ? option.replace(this.EMOJI_REGEX, '').trim() : option.trim();

    if (type === 'emoji' && !emoji) {
      const fallbackEmojis = ['😊', '😐', '😞', '😍', '😤', '🤔', '👍', '👎', '❤️', '🎉'];
      return { label, emoji: fallbackEmojis[index % fallbackEmojis.length] };
    }

    return { label, emoji };
  }

  static formatAsWidgetQuestions(parsedQuestions: ParsedQuestion[]): Question[] {
    return parsedQuestions.map((pq, index) => ({
      id: `q${index + 1}`,
      text: pq.text,
      type: pq.type,
      options: pq.options
    }));
  }

  static generateExample(): string {
    return `How are you feeling today?
a) 😊 Happy
b) 😐 Okay
c) 😞 Sad
d) 😤 Frustrated

What features do you use most?
Speed
Reliability
Design
Support

Rate your satisfaction from 1 to 5:
1 - Very Dissatisfied, 2 - Dissatisfied, 3 - Neutral, 4 - Satisfied, 5 - Very Satisfied

Please describe what you like most about our product:

Which devices do you use our app on?
Phone, Tablet, Laptop, Desktop, Smartwatch

How likely are you to recommend us to a friend?
→ 1 - Not likely
→ 2
→ 3
→ 4
→ 5 - Very likely

Tell us what you'd improve:`;
  }
}
