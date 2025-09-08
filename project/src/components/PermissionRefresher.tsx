import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PermissionRefresherProps {
  onRoleUpdate?: () => void;
}

const PermissionRefresher: React.FC<PermissionRefresherProps> = ({ onRoleUpdate }) => {
  const { refreshPermissions } = useAuth();

  useEffect(() => {
    // Set up periodic permission refresh every 30 seconds
    const interval = setInterval(async () => {
      try {
        await refreshPermissions();
        console.log('Permissions refreshed automatically');
      } catch (error) {
        console.error('Failed to refresh permissions:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshPermissions]);

  // Manual refresh function that can be called externally
  const handleManualRefresh = async () => {
    try {
      await refreshPermissions();
      console.log('Permissions refreshed manually');
      if (onRoleUpdate) {
        onRoleUpdate();
      }
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    }
  };

  // Expose refresh function globally for admin panel
  useEffect(() => {
    (window as any).refreshUserPermissions = handleManualRefresh;
    return () => {
      delete (window as any).refreshUserPermissions;
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PermissionRefresher;
