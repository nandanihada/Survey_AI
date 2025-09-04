import random
import string
from typing import Optional

def generate_short_id(length: int = 5) -> str:
    """Generate a random alphanumeric ID of specified length.
    
    Args:
        length: Length of the ID
        
    Returns:
        A random string of the specified length containing uppercase letters and digits
    """
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))

def generate_simple_user_id() -> int:
    """Generate a simple numeric user ID.
    
    Returns:
        A random 6-digit integer
    """
    return random.randint(100000, 999999)

def is_valid_short_id(short_id: str, length: int = 5) -> bool:
    """Check if a string is a valid short ID.
    
    Args:
        short_id: The ID to validate
        length: Expected length of the ID
        
    Returns:
        bool: True if valid, False otherwise
    """
    if len(short_id) != length:
        return False
    return all(c.isalnum() for c in short_id.upper())

def is_valid_simple_user_id(user_id) -> bool:
    """Check if a value is a valid simple user ID.
    
    Args:
        user_id: The user ID to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    try:
        uid = int(user_id)
        return 100000 <= uid <= 999999
    except (ValueError, TypeError):
        return False

# Keep old function for backward compatibility
def generate_fancy_user_id() -> int:
    """Generate a simple numeric user ID (renamed for compatibility)."""
    return generate_simple_user_id()
