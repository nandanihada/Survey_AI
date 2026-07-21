"""
PII Stripper - Removes/hashes personal identifiable information from text
before sending to AI APIs (OpenAI, Gemini, Claude, etc.)

Strips: email addresses, phone numbers, names (when identifiable patterns),
IP addresses, and other PII patterns.
"""

import re
import hashlib


def hash_pii(value: str) -> str:
    """Hash a PII value with SHA-256 (first 8 chars for readability)"""
    return "[REDACTED_" + hashlib.sha256(value.encode()).hexdigest()[:8] + "]"


def strip_pii(text: str) -> str:
    """
    Strip PII from text before sending to AI APIs.
    Replaces emails, phone numbers, IPs with hashed placeholders.
    """
    if not text or not isinstance(text, str):
        return text or ""
    
    # Email addresses
    text = re.sub(
        r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        lambda m: hash_pii(m.group()),
        text
    )
    
    # Phone numbers (various formats)
    # Indian: +91 XXXXX XXXXX, 91-XXXXXXXXXX, +91XXXXXXXXXX
    text = re.sub(
        r'(?:\+?91[\s\-]?)?[6-9]\d{4}[\s\-]?\d{5}',
        lambda m: hash_pii(m.group()),
        text
    )
    # International: +1-XXX-XXX-XXXX, (XXX) XXX-XXXX, etc.
    text = re.sub(
        r'\+?\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}',
        lambda m: hash_pii(m.group()) if len(re.sub(r'[\s\-\(\)\+]', '', m.group())) >= 10 else m.group(),
        text
    )
    
    # IP addresses (IPv4)
    text = re.sub(
        r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b',
        lambda m: hash_pii(m.group()),
        text
    )
    
    # Aadhaar numbers (India): XXXX XXXX XXXX
    text = re.sub(
        r'\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b',
        lambda m: hash_pii(m.group()),
        text
    )
    
    # PAN numbers (India): ABCDE1234F
    text = re.sub(
        r'\b[A-Z]{5}\d{4}[A-Z]\b',
        lambda m: hash_pii(m.group()),
        text
    )
    
    return text


def strip_pii_from_answers(answer_text: str) -> str:
    """Strip PII specifically from survey answer text"""
    return strip_pii(str(answer_text))


def strip_pii_from_prompt(prompt: str) -> str:
    """Strip PII from an AI prompt string"""
    return strip_pii(prompt)
