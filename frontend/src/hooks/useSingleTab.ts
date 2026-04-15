import { useEffect, useState } from 'react';

const TAB_ID = Math.random().toString(36).substring(2, 15);
const STORAGE_KEY = 'wumpus_active_tab';
const HEARTBEAT_INTERVAL = 1000;
const TIMEOUT_THRESHOLD = 2500;

/**
 * Enforces single-tab usage within the system using a localStorage heartbeat mechanism.
 * Detects concurrent sessions and signals the UI to block duplicate connections.
 * 
 * @returns {Object} isBlocked status of the current tab.
 */
export function useSingleTab() {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const checkTab = () => {
      const now = Date.now();
      const activeTabData = localStorage.getItem(STORAGE_KEY);
      
      if (activeTabData) {
        const { id, lastSeen } = JSON.parse(activeTabData);
        
        // If another tab is active and not timed out
        if (id !== TAB_ID && (now - lastSeen) < TIMEOUT_THRESHOLD) {
          setIsBlocked(true);
          return;
        }
      }
      
      // We are the master tab or previous master timed out
      setIsBlocked(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        id: TAB_ID,
        lastSeen: now
      }));
    };

    // Initial check
    checkTab();

    // Heartbeat to keep this tab active
    const interval = setInterval(checkTab, HEARTBEAT_INTERVAL);

    // Clean up on close
    const handleUnload = () => {
      const activeTabData = localStorage.getItem(STORAGE_KEY);
      if (activeTabData) {
        const { id } = JSON.parse(activeTabData);
        if (id === TAB_ID) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        checkTab();
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return { isBlocked };
}
