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
import random

GENERATION_ANGLES = [
    "Focus on pain points and frustrations — what is broken or missing",
    "Focus on positive outcomes and success factors — what is working well",
    "Focus on comparisons — how this compares to alternatives or competitors",
    "Focus on behavioral patterns — what people actually do vs. what they say",
    "Focus on priorities and trade-offs — what matters most when choices must be made",
    "Focus on barriers and blockers — what prevents action or adoption",
    "Focus on future expectations — what respondents want or expect next",
    "Focus on trust and confidence — how reliable or credible the subject feels",
    "Focus on frequency and recency — how often and how recently things happen",
    "Focus on the gap between expectation and reality",
]


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
    raw_prompt: str = "",
) -> str:
    """
    Builds the complete AI system prompt with all rules.
    """
    # Check if the original prompt is detailed enough to warrant descriptions
    prompt_word_count = len(raw_prompt.split()) if raw_prompt else 0
    generate_descriptions = prompt_word_count > 50

    user_questions = parsed["user_questions"] + parsed["image_questions"]
    user_q_count = len(user_questions)
    questions_to_generate = max(0, final_question_count - user_q_count)

    # Build user questions section
    user_q_section = ""
    raw_image_text = parsed.get("raw_image_text", "")

    if user_questions:
        if user_q_count >= final_question_count:
            user_q_section = f"""USER-PROVIDED QUESTIONS (INCLUDE ALL VERBATIM — DO NOT REPHRASE OR SKIP ANY):
{chr(10).join(f'  {i+1}. {q}' for i, q in enumerate(user_questions))}

You MUST include ALL {user_q_count} questions above exactly as written. Do NOT generate any additional questions.
The total survey will have exactly {user_q_count} questions."""
        else:
            user_q_section = f"""USER-PROVIDED QUESTIONS (INCLUDE VERBATIM — DO NOT REPHRASE):
{chr(10).join(f'  {i+1}. {q}' for i, q in enumerate(user_questions))}

You must include ALL {user_q_count} questions above exactly as written.
Generate {questions_to_generate} additional questions to reach the total of {final_question_count}."""
    elif raw_image_text:
        user_q_section = f"""IMAGE CONTENT — THE USER UPLOADED A SURVEY IMAGE. REPRODUCE IT EXACTLY:
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
8. The final survey should have exactly {final_question_count} questions total. If image has fewer, add relevant ones. If image has more, include all from image."""
    else:
        user_q_section = "(none — generate all questions from scratch)"

    # Audience string
    audience_map = {
        "customers": "Customers / clients of a product or service",
        "employees": "Employees within an organization",
        "students": "Students or learners",
        "users": "Website visitors or app users",
        "general_public": "General public — varied backgrounds",
    }
    audience_str = audience_map.get(audience, audience) if audience else "Not specified — infer from topic"

    # Tone instruction
    tone_label = parsed.get("tone_label", "")
    tone_label_map = {
        "Professional": "Use clear, professional but approachable language. Business-appropriate, neutral, and concise. Suitable for corporate surveys.",
        "Friendly": "Use warm, conversational, and welcoming language. Make respondents feel comfortable sharing honest feedback. Approachable but still respectful.",
        "Casual": "Use relaxed, informal language. Feel free to use emojis, slang, and a fun tone. Like talking to a friend. Keep it light and engaging.",
        "Academic": "Use precise, structured, research-grade language. Formal phrasing suitable for universities, research papers, and institutional assessments.",
        "Direct": "Use short, no-fluff, straight-to-the-point language. Minimal wording, maximum clarity. No pleasantries — just ask what you need to know.",
    }
    tone_fallback_map = {
        "casual": "Use friendly, relaxed, conversational language. Feel free to use emojis and informal phrasing. Keep it fun and approachable.",
        "formal": "Use formal, precise, academic language. Structured and research-appropriate. Suitable for institutional or scholarly contexts.",
        "professional": "Use clear, professional but approachable language. Business-appropriate, neutral, and concise.",
    }
    if tone_label:
        tone_instruction = tone_label_map.get(tone_label, tone_fallback_map.get(parsed.get("tone", "professional"), tone_fallback_map["professional"]))
    else:
        tone_instruction = tone_fallback_map.get(parsed.get("tone", "professional"), tone_fallback_map["professional"])

    # Description rule
    # Extract key phrases from the raw prompt to anchor descriptions
    # Take up to 8 meaningful words (skip short stop words) as phrase anchors
    stop_words = {'a','an','the','and','or','but','in','on','at','to','for','of','with',
                  'is','are','was','were','be','been','being','have','has','had','do','does',
                  'did','will','would','could','should','may','might','shall','can','this',
                  'that','these','those','it','its','i','we','my','our','your','their',
                  'create','generate','make','build','survey','about','please','give','me'}
    prompt_words = [w.strip('.,!?:;()[]"\'') for w in raw_prompt.lower().split()]
    key_phrases = [w for w in prompt_words if len(w) > 4 and w not in stop_words][:10]
    phrase_anchor_str = ', '.join(f'"{p}"' for p in key_phrases) if key_phrases else '(none extracted)'

    if generate_descriptions:
        description_rule = (
            f"REQUIRED — prompt was {prompt_word_count} words (>50). "
            "Populate \"questionDescription\" for EVERY question with 1–2 sentences explaining WHY it is being asked. "
            f"IMPORTANT: Echo the user's own language — use actual words and phrases from their prompt such as {phrase_anchor_str}. "
            "The description should feel like the survey creator wrote it personally, not generic AI filler. "
            "Connect each question back to the specific goal stated in the brief. "
            "Keep each under 40 words. NEVER leave null when prompt is detailed."
        )
    else:
        description_rule = (
            "OPTIONAL — prompt was brief (<50 words). "
            "Set \"questionDescription\" to null unless a question clearly benefits from a short clarification."
        )

    # Data collection rule
    if data_collection == "full_details":
        data_collection_rule = (
            "Include fields for Name, Email, and Phone. "
            "Do NOT place them at positions 1–3. Scatter among positions 4–8. Never group consecutively."
        )
    elif data_collection == "email_only":
        data_collection_rule = (
            "Include one Email field. Do NOT place it at position 1 or 2. Insert it at position 4 or later."
        )
    else:
        data_collection_rule = (
            "Survey is anonymous. Do NOT ask for name, email, or phone number."
        )

    # Random angle
    random_angle = random.choice(GENERATION_ANGLES)

    # Question type instruction
    if parsed.get("mentioned_types"):
        types_str = ', '.join(parsed["mentioned_types"])
        if len(parsed["mentioned_types"]) == 1:
            the_type = parsed["mentioned_types"][0]
            if the_type == "multiple_choice":
                type_instruction = (
                    f"ALL {final_question_count} questions MUST be multiple_choice ONLY with exactly 4 options each. "
                    "Do NOT use any other type."
                )
            elif the_type == "rating":
                type_instruction = (
                    f"ALL {final_question_count} questions MUST be rating type (1–10 scale) ONLY. "
                    "Do NOT use any other type. No options array needed."
                )
            elif the_type == "short_answer":
                type_instruction = (
                    f"ALL {final_question_count} questions MUST be short_answer (open text) ONLY. "
                    "Do NOT use any other type."
                )
            elif the_type == "yes_no":
                type_instruction = (
                    f"ALL {final_question_count} questions MUST be yes_no ONLY with options [\"Yes\", \"No\"]. "
                    "Do NOT use any other type."
                )
            else:
                type_instruction = f"ALL questions MUST be {types_str} type ONLY."
        else:
            type_instruction = (
                f"ONLY use these question types: {types_str}. "
                "Do NOT use any other type. Distribute questions evenly among the allowed types."
            )
    else:
        type_instruction = (
            "Use a variety of types: multiple_choice (~20%), multi_select (~10%), "
            "rating (~15%), yes_no (~10%), short_answer (~15%), likert (~10%), "
            "ranking (~5%), dropdown (~5%), dropdown_multi (~5%), matrix (~5%). "
            "Never let more than 2 consecutive questions share the same type."
        )

    # Language instruction
    language_instruction = ""
    if parsed.get("language", "english") != "english":
        lang_map = {
            "hindi": "Generate the ENTIRE survey in Hindi (हिंदी). All question text and answer options must be in Hindi using Devanagari script.",
            "hinglish": "Generate the ENTIRE survey in Hinglish (Hindi written in English/Roman script). Example: 'Aap kitne satisfied hain hamare product se?' — Mix Hindi words with English script. Do NOT use Devanagari. Do NOT use pure English.",
            "spanish": "Generate the ENTIRE survey in Spanish (Español). All question text and answer options must be in Spanish.",
            "french": "Generate the ENTIRE survey in French (Français). All question text and answer options must be in French.",
            "arabic": "Generate the ENTIRE survey in Arabic (العربية). All question text and answer options must be in Arabic.",
            "cjk": "Generate the ENTIRE survey in the same language as the user's prompt. All question text and answer options must be in that language.",
        }
        language_instruction = f"LANGUAGE: {lang_map.get(parsed['language'], '')}"

    system_prompt = f"""You are an expert survey designer with 15+ years of experience. Generate a precise, non-generic survey.

=== INPUT CONTEXT ===
Topic/Brief: {parsed["topic"]}
Target Audience: {audience_str}
Tone: {tone_instruction}
Number of Questions: {final_question_count}
Collect Respondent Details: {data_collection}
Include Descriptions: {generate_descriptions}

=== STEP 1: INTERNAL ANALYSIS (do this silently before writing) ===
Before generating questions, determine:
- Who exactly is answering? (their role, background, context)
- What decision or insight will this survey data be used for?
- What domain-specific vocabulary, categories, or scales are implied?
  e.g. "software engineers" → real certifications like "AWS Certified Solutions Architect"
  NEVER use generic buckets like "High School / Undergraduate / Graduate" unless audience is explicitly general public.
- Pick a fresh ANGLE for this specific generation — choose one from:
  {random_angle}
  Use this angle to decide WHICH aspects of the topic to probe most deeply.

=== STEP 2: GENERATION RULES (strict — follow all) ===
1. GROUNDING: Every question and every answer option must be traceable to the brief or audience. No filler.
2. NO GENERIC OPTIONS: Use real, domain-specific terms. Never vague catch-alls.
3. NO DUPLICATES: No two questions test the same underlying idea.
4. TYPE VARIETY: Never let more than 2 consecutive questions share the same type.
5. PHRASING VARIETY: Do not reuse the same sentence template more than twice.
6. LOGICAL ORDER: Screening/context → core topic → demographic/closing.
7. DESCRIPTIONS: {description_rule}
8. RESPONDENT DETAILS: {data_collection_rule}

=== FEW-SHOT EXAMPLE ===
BAD (never produce this):
{{"text": "What is your qualification?", "type": "multiple_choice", "options": ["High School", "Undergraduate", "Graduate"]}}

GOOD (produce this style):
{{"text": "What is your highest relevant technical qualification?",
 "questionDescription": "Helps us understand the educational background across our engineering team.",
 "type": "multiple_choice",
 "options": ["B.Tech/B.E. Computer Science or related", "M.Tech/M.S. Computer Science", "Professional cert (AWS/Azure/GCP)", "Self-taught / Bootcamp", "PhD in technical field"]}}

=== USER-PROVIDED QUESTIONS ===
{user_q_section}

=== OUTPUT FORMAT (strict JSON array only — no markdown, no backticks, no commentary) ===
[
  {{
    "id": "q1",
    "text": "Question text",
    "questionDescription": "1-2 sentence context (null if Include Descriptions is false)",
    "type": "multiple_choice | multi_select | yes_no | short_answer | rating | likert | ranking | dropdown | numeric",
    "allowMultiple": false,
    "options": ["option1", "option2"],
    "required": true,
    "show_if": null
  }}
]

=== SHOW LOGIC (conditional branching — use this to create smart surveys) ===
When a question's visibility should depend on a previous answer, populate "show_if" instead of leaving it null.

TWO CONDITION TYPES:
1. "equals" — show when one specific answer was selected
   Example: {{"depends_on": "q2", "condition": "equals", "value": "Yes"}}

2. "in" — show when ANY of several answers were selected (multi-answer routing)
   Example: {{"depends_on": "q3", "condition": "in", "value": ["Manager", "Director", "VP"]}}

RULES for show_if:
- depends_on must reference a PREVIOUS question's id (not current or future)
- Only use show_if on questions where it genuinely improves the survey logic
- A follow-up to a yes_no question: use "equals" with "Yes" or "No"
- When multiple similar answers all lead to the same follow-up: use "in" with an array
- Short_answer, rating, likert, ranking → usually show_if: null (always show)
- Aim for at least 25-30% of questions to have conditional show_if when the topic warrants it

EXAMPLE — education survey with branching:
[
  {{"id": "q1", "text": "Are you currently a student?", "type": "yes_no", "options": ["Yes","No"], "show_if": null}},
  {{"id": "q2", "text": "What is your major?", "type": "multiple_choice", "options": ["Engineering","Business","Arts","Science"], "show_if": {{"depends_on": "q1", "condition": "equals", "value": "Yes"}}}},
  {{"id": "q3", "text": "What year are you in?", "type": "multiple_choice", "options": ["1st","2nd","3rd","4th","5th+"], "show_if": {{"depends_on": "q1", "condition": "equals", "value": "Yes"}}}},
  {{"id": "q4", "text": "What is your current profession?", "type": "short_answer", "options": [], "show_if": {{"depends_on": "q1", "condition": "equals", "value": "No"}}}},
  {{"id": "q5", "text": "Rate your campus facilities", "type": "rating", "options": [], "show_if": {{"depends_on": "q2", "condition": "in", "value": ["Engineering","Science"]}}}}
]

TYPE GUIDE:
- multiple_choice: single-select from options (radio buttons). For most questions, add "Other (please specify)" as the final option so respondents can write their own answer if none fit.
- multi_select: select all that apply (checkboxes) — set allowMultiple: true. Always add "Other (please specify)" as the final option.
- yes_no: binary Yes/No question — do NOT add Other
- short_answer: free text response
- rating: numeric 1-10 scale
- likert: agreement scale — options MUST be exactly: ["Strongly Agree", "Agree", "Neutral", "Disagree", "Strongly Disagree"]
- ranking: rank items in order — provide 3-6 items as options
- dropdown: single select shown as dropdown — use for long option lists (5+ items). Add "Other (please specify)" if applicable.
- dropdown_multi: multi-select dropdown (checkboxes in a list) — use when multiple selections needed from a long list. Set allowMultiple: true.
- matrix: grid/table question — rows are topics in "options", columns are scale headers in "matrixColumns". Provide 3-5 rows and 3-5 column headers (e.g. ["Very Good","Good","Neutral","Poor","Very Poor"]).
- list: numbered list of selectable items — similar to multi_select but displayed as a numbered list. Set allowMultiple: true.
- numeric: number input — add "min" and "max" fields if relevant

{type_instruction}
{language_instruction}

Generate exactly {final_question_count} questions. Return valid JSON array only."""

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
        # Override tone from wizard selection
        if clarification_answers.get("tone"):
            tone_val = clarification_answers["tone"].lower()
            tone_mapping = {
                "professional": "professional",
                "friendly": "professional",  # friendly maps to approachable professional
                "casual": "casual",
                "academic": "formal",
                "direct": "professional",
            }
            parsed["tone"] = tone_mapping.get(tone_val, "professional")
            # Store the original tone label for more specific instructions
            parsed["tone_label"] = clarification_answers["tone"]

    # Calculate final question count
    final_count = calculate_question_count(parsed, question_count_from_dropdown)

    # Build the system prompt
    system_prompt = build_system_prompt(parsed, final_count, audience, data_collection, raw_prompt=prompt)

    # Generate a short survey title from the topic
    topic_words = parsed["topic"].split()
    survey_title = " ".join(topic_words[:7]) if len(topic_words) > 7 else parsed["topic"]

    return {
        "system_prompt": system_prompt,
        "final_question_count": final_count,
        "parsed": parsed,
        "user_questions_count": len(parsed["user_questions"]) + len(parsed["image_questions"]),
        "survey_title": survey_title,
    }
