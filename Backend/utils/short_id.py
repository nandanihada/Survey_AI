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
