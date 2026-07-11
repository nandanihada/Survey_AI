/**
 * Prompt Parser — Extracts structured data from user's survey prompt
 * 
 * Extracts: topic, question count, user-provided questions, audience,
 * tone, question types, language hints
 */

export interface ParsedPrompt {
  topic: string;
  questionCount: number | null;       // null = not mentioned
  userQuestions: string[];             // questions user explicitly included
  audience: string | null;            // detected audience (customers, employees, etc.)
  tone: 'formal' | 'casual' | 'professional';
  mentionedTypes: string[];           // question types user mentioned
  dataCollection: string | null;      // if user mentioned email/anonymous etc.
  isTopicClear: boolean;              // is there enough context to generate?
  rawPrompt: string;
}

export interface ClarificationNeeds {
  needsQuestionCount: boolean;
  needsTopic: boolean;
  needsAudience: boolean;
  needsDataCollection: boolean;       // always true per our rules
}

/**
 * Main parser: extracts everything we can from the user's prompt text
 */
export function parsePrompt(prompt: string, dropdownCount: number | null): ParsedPrompt {
  const trimmed = prompt.trim();
  
  return {
    topic: extractTopic(trimmed),
    questionCount: extractQuestionCount(trimmed, dropdownCount),
    userQuestions: extractUserQuestions(trimmed),
    audience: extractAudience(trimmed),
    tone: detectTone(trimmed),
    mentionedTypes: extractQuestionTypes(trimmed),
    dataCollection: extractDataCollection(trimmed),
    isTopicClear: checkTopicClarity(trimmed),
    rawPrompt: trimmed,
  };
}

/**
 * Determine what still needs clarification
 */
export function getClarificationNeeds(parsed: ParsedPrompt, dropdownChanged: boolean): ClarificationNeeds {
  return {
    needsTopic: !parsed.isTopicClear,
    needsQuestionCount: parsed.questionCount === null && !dropdownChanged,
    needsAudience: parsed.audience === null,
    needsDataCollection: parsed.dataCollection === null, // Only ask if not detected in prompt
  };
}

/**
 * Check if we can skip clarification entirely (only data collection remains)
 */
export function canSkipToClarificationOnly(needs: ClarificationNeeds): boolean {
  return !needs.needsTopic && !needs.needsQuestionCount && !needs.needsAudience;
}

// ─── Extraction Functions ──────────────────────────────────────────────────────

function extractTopic(text: string): string {
  // Remove question count phrases to get cleaner topic
  let cleaned = text
    .replace(/\b(generate|create|make|build|give me)\s+/i, '')
    .replace(/\b\d+\s*(questions?|qs?)\b/i, '')
    .replace(/\b(about|for|on|regarding)\s+/i, '')
    .trim();
  
  // If after cleaning we have very little, use original
  if (cleaned.length < 5) cleaned = text;
  
  return cleaned;
}

function extractQuestionCount(text: string, dropdownCount: number | null): number | null {
  // Patterns to detect question count in text
  const patterns = [
    /(\d+)\s*(questions?|qs?)\b/i,
    /\b(generate|create|make|give me)\s+(\d+)/i,
    /\btotal\s*(?:of\s*)?(\d+)/i,
    /\bexactly\s+(\d+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Find the numeric capture group
      const num = parseInt(match[1]) || parseInt(match[2]);
      if (num >= 1 && num <= 100) {
        return num; // Prompt always wins over dropdown
      }
    }
  }
  
  // If user changed dropdown from default (10), use that
  if (dropdownCount !== null && dropdownCount !== 10) {
    return dropdownCount;
  }
  
  return null; // Not specified anywhere
}

function extractUserQuestions(text: string): string[] {
  const questions: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Detect questions: ends with ?, or starts with number/bullet
    if (trimmedLine.endsWith('?') && trimmedLine.length > 10) {
      // Remove numbering prefix
      const cleaned = trimmedLine.replace(/^[\d]+[\.\)\-]\s*/, '').trim();
      if (cleaned.length > 10) {
        questions.push(cleaned);
      }
    }
    
    // Detect numbered items that look like survey questions
    const numberedMatch = trimmedLine.match(/^[\d]+[\.\)\-]\s+(.{15,})/);
    if (numberedMatch && !trimmedLine.endsWith('?')) {
      // Could be a question without '?' — check if it reads like one
      const content = numberedMatch[1];
      const questionWords = /^(what|how|why|when|where|which|who|do|does|did|is|are|was|were|have|has|would|could|should|can|rate|describe|explain)/i;
      if (questionWords.test(content)) {
        questions.push(content);
      }
    }
  }
  
  return questions;
}

function extractAudience(text: string): string | null {
  const audiencePatterns: [RegExp, string][] = [
    [/\b(for|targeting|aimed at)\s+(my\s+)?(\w+\s+)*(customers?|clients?|buyers?)\b/i, 'customers'],
    [/\b(for|targeting|aimed at)\s+(my\s+)?(\w+\s+)*(employees?|staff|team|workers?|colleagues?)\b/i, 'employees'],
    [/\b(for|targeting|aimed at)\s+(my\s+)?(\w+\s+)*(students?|learners?|class)\b/i, 'students'],
    [/\b(for|targeting|aimed at)\s+(my\s+)?(\w+\s+)*(users?|visitors?|audience)\b/i, 'users'],
    [/\b(for|targeting|aimed at)\s+(the\s+)?(general public|everyone|anyone)\b/i, 'general_public'],
    [/\b(internal|company|organization)\s+(survey|feedback|check)/i, 'employees'],
    [/\bmy\s+(\w+\s+)?team\b/i, 'employees'],
    [/\bemployee\s+(engagement|feedback|satisfaction|wellness|check)/i, 'employees'],
    [/\bcustomer\s+(satisfaction|feedback|experience|support)/i, 'customers'],
    [/\bstudent\s+(feedback|evaluation|assessment)/i, 'students'],
    [/\bwebsite\s+(visitors?|users?|experience)/i, 'users'],
  ];
  
  for (const [pattern, audience] of audiencePatterns) {
    if (pattern.test(text)) return audience;
  }
  
  return null;
}

function detectTone(text: string): 'formal' | 'casual' | 'professional' {
  const casualIndicators = /\b(hey|cool|awesome|gonna|wanna|lol|haha|btw|tbh|chill|vibe)\b/i;
  const formalIndicators = /\b(pursuant|regarding|pertaining|henceforth|whereby|stakeholders|comprehensive|assessment)\b/i;
  
  if (casualIndicators.test(text)) return 'casual';
  if (formalIndicators.test(text)) return 'formal';
  return 'professional';
}

function extractQuestionTypes(text: string): string[] {
  const types: string[] = [];
  
  if (/\b(multiple\s*choice|mcq|options)\b/i.test(text)) types.push('multiple_choice');
  if (/\b(rating|rate|scale|1\s*(-|to)\s*(5|10))\b/i.test(text)) types.push('rating');
  if (/\b(open\s*ended|text|free\s*text|short\s*answer)\b/i.test(text)) types.push('short_answer');
  if (/\b(yes\s*\/?\s*no|boolean)\b/i.test(text)) types.push('yes_no');
  if (/\b(nps|net\s*promoter)\b/i.test(text)) types.push('nps');
  
  return types;
}

function extractDataCollection(text: string): string | null {
  if (/\b(anonymous|keep\s*(it\s*)?anonymous|no\s*names?|don't\s*collect|no\s*personal|no\s*data|confidential)\b/i.test(text)) return 'anonymous';
  if (/\b(email\s*only|just\s*email|collect\s*email|only\s*email)\b/i.test(text)) return 'email_only';
  if (/\b(name|email|phone|details|personal\s*info|contact|collect\s*(their|respondent))\b/i.test(text)) return 'full_details';
  return null;
}

function checkTopicClarity(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  
  // Too short
  if (trimmed.length < 10) return false;
  
  // Exact vague patterns
  const vaguePatterns = [
    /^(make|create|generate|build|give|get)\s+(me\s+)?(a\s+)?(survey|questionnaire|form|questions?)\.?$/i,
    /^(i\s+)?(need|want|require)\s+(a\s+)?(some\s+)?(survey|questions?|form|questionnaire)\.?$/i,
    /^survey$/i,
    /^help\s*me.*$/i,
    /^(something|anything|whatever).*$/i,
    /^(i\s+)?(need|want)\s+(some|few|more|new)\s+(questions?|survey)\.?$/i,
    /^(can you|please|pls)\s+(make|create|generate|help).*?(survey|questions?|form)\.?$/i,
    /^(just|only)\s+(make|create|generate)\s+(a\s+)?(survey|questions?)\.?$/i,
    /^questions?\s*(please|pls)?$/i,
    /^(give|get)\s+me\s+(some\s+)?questions?\.?$/i,
    /^i\s+(need|want)\s+(some|few)?\s*questions?\.?$/i,
  ];
  
  if (vaguePatterns.some(p => p.test(trimmed))) return false;

  // Check if it's just generic request words without a real topic
  // Remove common filler words and see if anything meaningful remains
  const withoutFillers = trimmed
    .replace(/\b(i|me|my|we|our|please|pls|can you|could you|help|need|want|would like|generate|create|make|build|give|get|some|a|an|the|few|more|new|about|for|with|and|or|of|to|in|on)\b/gi, '')
    .replace(/\b(survey|questions?|questionnaire|form)\b/gi, '')
    .replace(/\b\d+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If after removing filler there's less than 4 chars of actual topic content, it's unclear
  if (withoutFillers.length < 4) return false;

  return true;
}
