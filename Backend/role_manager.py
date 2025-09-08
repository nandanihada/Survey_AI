"""
Role-based access control and feature management system
"""
from enum import Enum
from typing import Dict, List, Set
from dataclasses import dataclass

class UserRole(Enum):
    """User role hierarchy"""
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"
    ADMIN = "admin"

class UserStatus(Enum):
    """User account status"""
    APPROVED = "approved"
    DISAPPROVED = "disapproved"
    LOCKED = "locked"

class Feature(Enum):
    """Available features in the system"""
    CREATE = "create"
    SURVEY = "survey"
    ANALYTICS = "analytics"
    POSTBACK = "postback"
    PASS_FAIL = "pass_fail"
    TEST_LAB = "test_lab"
    ADMIN_PANEL = "admin_panel"
    USER_MANAGEMENT = "user_management"

@dataclass
class StatusMessage:
    """Status message for blocked users"""
    message: str
    title: str = "Access Denied"

class RoleManager:
    """Manages role-based access control and feature permissions"""
    
    # Role hierarchy - each role includes features from lower roles
    ROLE_FEATURES: Dict[UserRole, Set[Feature]] = {
        UserRole.BASIC: {
            Feature.CREATE,
            Feature.SURVEY,
            Feature.ANALYTICS
        },
        UserRole.PREMIUM: {
            Feature.CREATE,
            Feature.SURVEY,
            Feature.ANALYTICS,
            Feature.POSTBACK,
            Feature.PASS_FAIL
        },
        UserRole.ENTERPRISE: {
            Feature.CREATE,
            Feature.SURVEY,
            Feature.ANALYTICS,
            Feature.POSTBACK,
            Feature.PASS_FAIL,
            Feature.TEST_LAB
        },
        UserRole.ADMIN: {
            Feature.CREATE,
            Feature.SURVEY,
            Feature.ANALYTICS,
            Feature.POSTBACK,
            Feature.PASS_FAIL,
            Feature.TEST_LAB,
            Feature.ADMIN_PANEL,
            Feature.USER_MANAGEMENT
        }
    }
    
    # Status messages for blocked users
    STATUS_MESSAGES: Dict[UserStatus, StatusMessage] = {
        UserStatus.DISAPPROVED: StatusMessage(
            title="Account Not Approved",
            message="Your account is not approved. Please contact your manager or support team."
        ),
        UserStatus.LOCKED: StatusMessage(
            title="Account Under Review", 
            message="Your account is under review. Please contact your manager."
        )
    }
    
    @classmethod
    def can_login(cls, status: str) -> tuple[bool, StatusMessage]:
        """Check if user can login based on status"""
        try:
            user_status = UserStatus(status)
        except ValueError:
            # Invalid status, treat as disapproved
            return False, cls.STATUS_MESSAGES[UserStatus.DISAPPROVED]
        
        if user_status == UserStatus.APPROVED:
            return True, None
        
        return False, cls.STATUS_MESSAGES[user_status]
    
    @classmethod
    def has_feature_access(cls, role: str, feature: str) -> bool:
        """Check if user role has access to specific feature"""
        try:
            user_role = UserRole(role)
            feature_enum = Feature(feature)
        except ValueError:
            return False
        
        return feature_enum in cls.ROLE_FEATURES.get(user_role, set())
    
    @classmethod
    def get_user_features(cls, role: str) -> List[str]:
        """Get list of features available to user role"""
        try:
            user_role = UserRole(role)
        except ValueError:
            return []
        
        features = cls.ROLE_FEATURES.get(user_role, set())
        return [feature.value for feature in features]
    
    @classmethod
    def get_role_hierarchy(cls) -> Dict[str, List[str]]:
        """Get role hierarchy with features for frontend"""
        return {
            role.value: [feature.value for feature in features]
            for role, features in cls.ROLE_FEATURES.items()
        }
    
    @classmethod
    def is_valid_role(cls, role: str) -> bool:
        """Check if role is valid"""
        try:
            UserRole(role)
            return True
        except ValueError:
            return False
    
    @classmethod
    def is_valid_status(cls, status: str) -> bool:
        """Check if status is valid"""
        try:
            UserStatus(status)
            return True
        except ValueError:
            return False
    
    @classmethod
    def get_valid_roles(cls) -> List[str]:
        """Get list of valid roles"""
        return [role.value for role in UserRole]
    
    @classmethod
    def get_valid_statuses(cls) -> List[str]:
        """Get list of valid statuses"""
        return [status.value for status in UserStatus]
    
    @classmethod
    def can_access_admin_features(cls, role: str) -> bool:
        """Check if user can access admin features"""
        return cls.has_feature_access(role, Feature.ADMIN_PANEL.value)
    
    @classmethod
    def get_feature_display_name(cls, feature: str) -> str:
        """Get display name for feature"""
        display_names = {
            Feature.CREATE.value: "Create Surveys",
            Feature.SURVEY.value: "Survey Management", 
            Feature.ANALYTICS.value: "Analytics & Reports",
            Feature.POSTBACK.value: "Postback Integration",
            Feature.PASS_FAIL.value: "Pass/Fail Logic",
            Feature.TEST_LAB.value: "Test Lab",
            Feature.ADMIN_PANEL.value: "Admin Panel",
            Feature.USER_MANAGEMENT.value: "User Management"
        }
        return display_names.get(feature, feature.title())
    
    @classmethod
    def get_role_display_name(cls, role: str) -> str:
        """Get display name for role"""
        display_names = {
            UserRole.BASIC.value: "Basic",
            UserRole.PREMIUM.value: "Premium", 
            UserRole.ENTERPRISE.value: "Enterprise",
            UserRole.ADMIN.value: "Administrator"
        }
        return display_names.get(role, role.title())
