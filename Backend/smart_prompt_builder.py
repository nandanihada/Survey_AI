"""
Smart Prompt Builder — Constructs the AI system prompt based on parsed user input.

Handles:
- User-provided questions (must include verbatim)
- Skip logic / conditional branching
- Question count math (user questions + generated = total)
- Audience-aware generation
- Data collection preferences
- Tone matching
- Deduplication instructions
"""

import re
import json


def parse_user_prompt(prompt_text: str, image_context: str = "") -> dict:
    """
    Server-side prompt parser. Extracts structured data from user's raw prompt.
    Returns dict with: topic, question_count, user_questions, audience, tone, data_collection
    """
    result = {
        "topic": "",
        "question_count_from_prompt": None,
        "user_questions": [],
        "audience": None,
        "tone": "professional",
        "data_collection": None,
        "mentioned_types": [],
        "image_questions": [],
    }

    # Extract question count from prompt text
    count_patterns = [
        r'(\d+)\s*(?:questions?|qs?)\b',
        r'\b(?:generate|create|make|give me)\s+(\d+)',
        r'\btotal\s*(?:of\s*)?(\d+)',
        r'\bexactly\s+(\d+)',
    ]
    for pattern in count_patterns:
        match = re.search(pattern, prompt_text, re.IGNORECASE)
        if match:
            num = int(match.group(1))
            if 1 <= num <= 100:
                result["question_count_from_prompt"] = num
                break

    # Extract user-provided questions (lines ending with ? or numbered items)
    lines = prompt_text.split('\n')
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # Question ending with ?
        if stripped.endswith('?') and len(stripped) > 12:
            cleaned = re.sub(r'^[\d]+[.\)\-]\s*', '', stripped).strip()
            if len(cleaned) > 12:
                result["user_questions"].append(cleaned)
        else:
            # Numbered item that reads like a question
            numbered = re.match(r'^[\d]+[.\)\-]\s+(.{15,})', stripped)
            if numbered:
                content = numbered.group(1)
                if re.match(r'^(what|how|why|when|where|which|who|do|does|did|is|are|was|were|have|has|would|could|should|can|rate|describe|explain)', content, re.IGNORECASE):
                    result["user_questions"].append(content)

    # Extract questions from image context — keep the raw text too
    if image_context:
        result["raw_image_text"] = image_context.strip()
        img_lines = image_context.split('\n')
        for line in img_lines:
            stripped = line.strip()
            if not stripped or len(stripped) < 8:
                continue
            # Lines ending with ?
            if stripped.endswith('?') and len(stripped) > 10:
                cleaned = re.sub(r'^[\d]+[.\)\-]\s*', '', stripped).strip()
                cleaned = re.sub(r'^[-•*]\s*', '', cleaned).strip()
                if len(cleaned) > 10:
                    result["image_questions"].append(cleaned)
            # Numbered items
            elif re.match(r'^[\d]+[.\)\-]\s+(.{10,})', stripped):
                content = re.match(r'^[\d]+[.\)\-]\s+(.{10,})', stripped).group(1)
                result["image_questions"].append(content)
            # Bullet points
            elif re.match(r'^[-•*]\s+(.{10,})', stripped):
                content = re.match(r'^[-•*]\s+(.{10,})', stripped).group(1)
                if any(w in content.lower() for w in ['what', 'how', 'why', 'when', 'which', 'who', 'do ', 'did ', 'is ', 'are ', 'would', 'rate']):
                    result["image_questions"].append(content)

    # Detect audience
    audience_patterns = [
        (r'\b(?:for|targeting)\s+(?:my\s+)?(?:customers?|clients?|buyers?)\b', 'customers'),
        (r'\b(?:for|targeting)\s+(?:my\s+)?(?:employees?|staff|team|workers?)\b', 'employees'),
        (r'\b(?:for|targeting)\s+(?:my\s+)?(?:students?|learners?|class)\b', 'students'),
        (r'\b(?:for|targeting)\s+(?:my\s+)?(?:users?|visitors?)\b', 'users'),
        (r'\bcustomer\s+(?:satisfaction|feedback|experience)', 'customers'),
        (r'\bemployee\s+(?:engagement|feedback|check)', 'employees'),
        (r'\bstudent\s+(?:feedback|evaluation)', 'students'),
    ]
    for pattern, audience in audience_patterns:
        if re.search(pattern, prompt_text, re.IGNORECASE):
            result["audience"] = audience
            break

    # Detect tone
    if re.search(r'\b(hey|cool|awesome|gonna|wanna|chill|vibe)\b', prompt_text, re.IGNORECASE):
        result["tone"] = "casual"
    elif re.search(r'\b(pursuant|regarding|pertaining|stakeholders|comprehensive|assessment)\b', prompt_text, re.IGNORECASE):
        result["tone"] = "formal"

    # Detect data collection preference
    if re.search(r'\b(anonymous|no\s*names?|no\s*personal)\b', prompt_text, re.IGNORECASE):
        result["data_collection"] = "anonymous"
    elif re.search(r'\b(email\s*only|just\s*email)\b', prompt_text, re.IGNORECASE):
        result["data_collection"] = "email_only"
    elif re.search(r'\b(name|phone|contact|details)\b', prompt_text, re.IGNORECASE):
        result["data_collection"] = "full_details"

    # Detect mentioned question types
    if re.search(r'\b(multiple\s*choice|mcq|options)\b', prompt_text, re.IGNORECASE):
        result["mentioned_types"].append("multiple_choice")
    if re.search(r'\b(rating|rate|scale)\b', prompt_text, re.IGNORECASE):
        result["mentioned_types"].append("rating")
    if re.search(r'\b(open\s*ended|text|free\s*text|short\s*answer)\b', prompt_text, re.IGNORECASE):
        result["mentioned_types"].append("short_answer")
    if re.search(r'\b(yes\s*/?\s*no)\b', prompt_text, re.IGNORECASE):
        result["mentioned_types"].append("yes_no")

    # Detect language (non-English scripts)
    result["language"] = "english"
    # Hindi (Devanagari script)
    if re.search(r'[\u0900-\u097F]', prompt_text):
        result["language"] = "hindi"
    # Hinglish detection (Hindi words written in Roman/Latin script)
    elif re.search(r'\b(karo|banao|banaen|chahiye|kaise|kitne|sawal|prashna|survekshan|santusti|grahak|karmchari|baare|mein|hai|hain|aur|ya|ke liye|mujhe|humein|hamari)\b', prompt_text, re.IGNORECASE):
        result["language"] = "hinglish"
    # Spanish (strong indicators only)
    elif re.search(r'\b(encuesta|preguntas?\s+sobre|satisfacción|crear\s+una)\b', prompt_text, re.IGNORECASE):
        result["language"] = "spanish"
    # French (strong indicators only)
    elif re.search(r'\b(sondage|enquête|créer\s+un|à\s+propos)\b', prompt_text, re.IGNORECASE):
        result["language"] = "french"
    # Arabic
    elif re.search(r'[\u0600-\u06FF]', prompt_text):
        result["language"] = "arabic"
    # Chinese/Japanese/Korean
    elif re.search(r'[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]', prompt_text):
        result["language"] = "cjk"

    # Extract topic (cleaned version)
    topic = prompt_text
    # Remove count phrases
    topic = re.sub(r'\b\d+\s*(?:questions?|qs?)\b', '', topic, flags=re.IGNORECASE)
    topic = re.sub(r'\d+\s*(?:प्रश्न|सवाल|preguntas?|fragen)', '', topic)
    topic = re.sub(r'\b(?:generate|create|make|build|give me)\s+', '', topic, flags=re.IGNORECASE)
    topic = re.sub(r'(?:बनाएं|बनाओ|crear|créer)', '', topic)
    topic = topic.strip().strip(',').strip()
    if len(topic) < 3:
        topic = prompt_text
    result["topic"] = topic

    return result


def calculate_question_count(parsed: dict, dropdown_count: int) -> int:
    """
    Priority: prompt text > dropdown (if changed from default) > default 10
    BUT: if user provided more questions than the requested count, use the user's count.
    """
    user_q_count = len(parsed["user_questions"]) + len(parsed["image_questions"])
    
    # Get the requested count
    requested = 10  # default
    if parsed["question_count_from_prompt"]:
        requested = parsed["question_count_from_prompt"]
    elif dropdown_count and dropdown_count != 10:
        requested = dropdown_count
    
    # If user provided more questions than requested, include all of theirs
    if user_q_count > requested:
        return min(user_q_count, 100)  # Cap at 100
    
    return min(requested, 100)  # Cap at 100


def build_system_prompt(
    parsed: dict,
    final_question_count: int,
    audience: str = None,
    data_collection: str = "anonymous",
) -> str:
    """
    Builds the complete AI system prompt with all rules.
    """
    user_questions = parsed["user_questions"] + parsed["image_questions"]
    user_q_count = len(user_questions)
    questions_to_generate = max(0, final_question_count - user_q_count)

    # Build user questions section
    user_q_section = ""
    raw_image_text = parsed.get("raw_image_text", "")
    
    if user_questions:
        if user_q_count >= final_question_count:
            user_q_section = f"""
USER-PROVIDED QUESTIONS (INCLUDE ALL VERBATIM — DO NOT REPHRASE OR SKIP ANY):
{chr(10).join(f'  {i+1}. {q}' for i, q in enumerate(user_questions))}

You MUST include ALL {user_q_count} questions above exactly as written. Do NOT generate any additional questions.
The total survey will have exactly {user_q_count} questions.
"""
        else:
            user_q_section = f"""
USER-PROVIDED QUESTIONS (INCLUDE VERBATIM — DO NOT REPHRASE):
{chr(10).join(f'  {i+1}. {q}' for i, q in enumerate(user_questions))}

You must include ALL {user_q_count} questions above exactly as written.
Generate {questions_to_generate} additional questions to reach the total of {final_question_count}.
"""
    elif raw_image_text:
        # We have image content — pass it with very explicit instructions
        user_q_section = f"""
IMAGE CONTENT — THE USER UPLOADED A SURVEY IMAGE. REPRODUCE IT EXACTLY:
---
{raw_image_text}
---

YOU MUST:
1. Copy each question WORD-FOR-WORD from the text above.
2. Copy each option WORD-FOR-WORD. If the text above shows options like "A) Book Club" then your options array must be ["Book Club"] — use THE EXACT WORDS shown above.
3. Do NOT invent new options. Do NOT use generic options like "Fiction/Non-Fiction". Use ONLY what is written above.
4. Do NOT duplicate any question.
5. If the text shows [multiple_choice] tag, set type to "multiple_choice" and copy all listed options.
6. If the text shows [short_answer] tag, set type to "short_answer" with empty options.
7. If the text shows [yes_no] tag, set type to "yes_no" with options ["Yes", "No"].
8. The final survey should have exactly {final_question_count} questions total. If image has fewer, add relevant ones. If image has more, include all from image.
"""

    # Audience context
    audience_context = ""
    if audience:
        audience_map = {
            "customers": "The respondents are customers/clients of a product or service.",
            "employees": "The respondents are employees within an organization.",
            "students": "The respondents are students or learners.",
            "users": "The respondents are website visitors or app users.",
            "general_public": "The respondents are general public with varied backgrounds.",
        }
        audience_context = f"\nAUDIENCE: {audience_map.get(audience, audience)}"

    # Data collection context
    data_collection_context = ""
    if data_collection == "full_details":
        data_collection_context = "\nDATA COLLECTION: Include fields for Name, Email, and Phone at the beginning."
    elif data_collection == "email_only":
        data_collection_context = "\nDATA COLLECTION: Include an Email field at the beginning."
    elif data_collection == "anonymous":
        data_collection_context = "\nDATA COLLECTION: Survey is anonymous. Do NOT ask for name, email, or phone."

    # Tone instruction
    tone_map = {
        "casual": "Use friendly, conversational language. Keep it light and approachable.",
        "formal": "Use formal, professional language suitable for corporate/academic contexts.",
        "professional": "Use clear, professional but approachable language.",
    }
    tone_instruction = tone_map.get(parsed["tone"], tone_map["professional"])

    # Question type distribution
    type_instruction = ""
    if parsed["mentioned_types"]:
        types_str = ', '.join(parsed['mentioned_types'])
        if len(parsed["mentioned_types"]) == 1:
            the_type = parsed["mentioned_types"][0]
            # Build type-specific enforcement
            if the_type == "multiple_choice":
                type_instruction = f"""
QUESTION TYPES — STRICT REQUIREMENT:
ALL {final_question_count} questions MUST be multiple_choice ONLY.
Every single question must have exactly 4 answer options (A, B, C, D).
Do NOT include any rating scales, open text, yes/no, or any other type. ONLY multiple choice.
"""
            elif the_type == "rating":
                type_instruction = f"""
QUESTION TYPES — STRICT REQUIREMENT:
ALL {final_question_count} questions MUST be rating scale ONLY.
Every single question must be answerable on a 1-5 numeric scale.
Do NOT include any multiple choice, open text, yes/no, or any other type. ONLY rating (1-5 scale).
Set type to "rating" for every question. No options array needed.
"""
            elif the_type == "short_answer":
                type_instruction = f"""
QUESTION TYPES — STRICT REQUIREMENT:
ALL {final_question_count} questions MUST be short_answer (open text) ONLY.
Every single question must be answered with free-form text.
Do NOT include any multiple choice, rating scales, yes/no, or any other type. ONLY open-ended text.
Set type to "short_answer" for every question. No options array needed.
"""
            elif the_type == "yes_no":
                type_instruction = f"""
QUESTION TYPES — STRICT REQUIREMENT:
ALL {final_question_count} questions MUST be yes_no ONLY.
Every single question must have exactly 2 options: ["Yes", "No"].
Do NOT include any multiple choice, rating scales, open text, or any other type. ONLY yes/no.
"""
            else:
                type_instruction = f"""
QUESTION TYPES — STRICT REQUIREMENT:
ALL questions MUST be {types_str} type ONLY. Do NOT use any other question type.
"""
        else:
            # Multiple types mentioned — only use those
            type_instruction = f"""
QUESTION TYPES — STRICT REQUIREMENT:
ONLY use these question types: {types_str}. Do NOT use any other type.
Distribute questions evenly among the allowed types.
"""
    else:
        type_instruction = """
QUESTION TYPE DISTRIBUTION (for generated questions):
- Multiple Choice: ~30% (4 options A-D)
- Rating (1-5 or 1-10): ~20%
- Yes/No: ~15%
- Short Answer (open text): ~20%
- Opinion Scale: ~15%
"""

    # Language instruction
    language_instruction = ""
    if parsed.get("language", "english") != "english":
        lang_map = {
            "hindi": "LANGUAGE: Generate the ENTIRE survey in Hindi (हिंदी). All question text and answer options must be in Hindi using Devanagari script.",
            "hinglish": "LANGUAGE: Generate the ENTIRE survey in Hinglish (Hindi written in English/Roman script). Example: 'Aap kitne satisfied hain hamare product se?' — Mix Hindi words with English script. Do NOT use Devanagari. Do NOT use pure English.",
            "spanish": "LANGUAGE: Generate the ENTIRE survey in Spanish (Español). All question text and answer options must be in Spanish.",
            "french": "LANGUAGE: Generate the ENTIRE survey in French (Français). All question text and answer options must be in French.",
            "arabic": "LANGUAGE: Generate the ENTIRE survey in Arabic (العربية). All question text and answer options must be in Arabic.",
            "cjk": "LANGUAGE: Generate the ENTIRE survey in the same language as the user's prompt. All question text and answer options must be in that language.",
        }
        language_instruction = lang_map.get(parsed["language"], "")

    system_prompt = f"""You are an expert survey designer. Generate a high-quality survey following these exact rules.

TOPIC: {parsed["topic"]}
TOTAL QUESTIONS REQUIRED: {final_question_count}
TONE: {tone_instruction}
{language_instruction}
{audience_context}
{data_collection_context}
{type_instruction}
{user_q_section}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SKIP LOGIC (MOST IMPORTANT):
   - For every Yes/No question, check if any following question assumes "Yes"
   - If it does, add a show_if condition to that follow-up question
   - For "Do you use/have X?" questions, ALL follow-ups about X must be gated
   - For rating questions: if score is low (1-3), show "what can we improve?"
     If score is high (8-10), show "what did you enjoy?"
   - NEVER generate a question that contradicts a possible answer to a previous one

2. QUESTION QUALITY:
   - Each question must be answerable and unambiguous
   - No double-barreled questions (asking two things at once)
   - No leading questions (don't suggest the answer)
   - Keep questions under 25 words
   - Multiple choice options must be mutually exclusive
   - Include "Other" option where appropriate

3. QUESTION FLOW:
   - Start with easy/demographic questions
   - Move to opinion/rating questions in the middle
   - End with open-ended/suggestion questions
   - Group related questions together
   - Dependent questions must come right after their parent

4. DEDUPLICATION:
   - No two questions should ask essentially the same thing
   - Each question must add unique value to the survey

5. PATH COMPLETENESS:
   - Every respondent path must feel complete
   - If you gate 2 questions behind a "Yes", also provide 1-2 alternative
     questions for the "No" path so all paths have roughly equal length

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (JSON):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY a valid JSON array. No markdown, no explanation, no backticks.

Each question object:
{{
  "id": "q1",
  "text": "Question text here",
  "type": "multiple_choice" | "rating" | "yes_no" | "short_answer" | "scale",
  "options": ["A", "B", "C", "D"],  // only for multiple_choice and yes_no
  "required": true,
  "show_if": null | {{"depends_on": "q3", "condition": "equals", "value": "Yes"}}
}}

For show_if conditions:
- "condition" can be: "equals", "not_equals", "greater_than", "less_than"
- "value" is the answer value that triggers this question
- Set to null if question always shows

Generate exactly {final_question_count} questions total. Return valid JSON only.
"""

    return system_prompt


def build_generation_request(
    prompt: str,
    question_count_from_dropdown: int,
    image_context: str = "",
    audience: str = None,
    data_collection: str = "anonymous",
    clarification_answers: dict = None,
) -> dict:
    """
    Main entry point: takes raw input, builds everything needed for AI generation.
    Returns dict with system_prompt, final_count, parsed data.
    """
    # Parse the prompt
    parsed = parse_user_prompt(prompt, image_context)

    # Apply clarification answers if provided
    if clarification_answers:
        if clarification_answers.get("topic"):
            parsed["topic"] = clarification_answers["topic"]
        if clarification_answers.get("audience"):
            audience = clarification_answers["audience"]
        if clarification_answers.get("dataCollection"):
            data_collection = clarification_answers["dataCollection"]
        if clarification_answers.get("questionCount"):
            question_count_from_dropdown = clarification_answers["questionCount"]

    # Calculate final question count
    final_count = calculate_question_count(parsed, question_count_from_dropdown)

    # Build the system prompt
    system_prompt = build_system_prompt(parsed, final_count, audience, data_collection)

    return {
        "system_prompt": system_prompt,
        "final_question_count": final_count,
        "parsed": parsed,
        "user_questions_count": len(parsed["user_questions"]) + len(parsed["image_questions"]),
    }
