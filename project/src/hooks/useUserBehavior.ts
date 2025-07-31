import { useState, useEffect, useRef } from 'react';

interface UserBehavior {
  timeOnPage: number;
  scrollPercent: number;
  clickCount: number;
  lastInteraction: number;
  pageViews: number;
  idleTime: number;
  interactions: {
    clicks: number;
    scrolls: number;
    keystrokes: number;
    mouseMovements: number;
  };
}

export const useUserBehavior = () => {
  const [behavior, setBehavior] = useState<UserBehavior>({
    timeOnPage: 0,
    scrollPercent: 0,
    clickCount: 0,
    lastInteraction: Date.now(),
    pageViews: 1,
    idleTime: 0,
    interactions: {
      clicks: 0,
      scrolls: 0,
      keystrokes: 0,
      mouseMovements: 0,
    },
  });

  const startTime = useRef(Date.now());
  const lastScrollTime = useRef(0);
  const mouseMoveThrottleTime = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateTimeOnPage = () => {
      const currentTime = Date.now();
      const timeOnPage = currentTime - startTime.current;
      
      setBehavior(prev => ({
        ...prev,
        timeOnPage,
        idleTime: currentTime - prev.lastInteraction,
      }));
    };

    // Update time on page every second
    intervalRef.current = setInterval(updateTimeOnPage, 1000);

    const handleScroll = () => {
      const currentTime = Date.now();
      
      // Throttle scroll events
      if (currentTime - lastScrollTime.current < 100) return;
      lastScrollTime.current = currentTime;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;

      setBehavior(prev => ({
        ...prev,
        scrollPercent: Math.max(prev.scrollPercent, scrollPercent),
        lastInteraction: currentTime,
        interactions: {
          ...prev.interactions,
          scrolls: prev.interactions.scrolls + 1,
        },
      }));
    };

    const handleClick = () => {
      const currentTime = Date.now();
      setBehavior(prev => ({
        ...prev,
        clickCount: prev.clickCount + 1,
        lastInteraction: currentTime,
        interactions: {
          ...prev.interactions,
          clicks: prev.interactions.clicks + 1,
        },
      }));
    };

    const handleKeydown = () => {
      const currentTime = Date.now();
      setBehavior(prev => ({
        ...prev,
        lastInteraction: currentTime,
        interactions: {
          ...prev.interactions,
          keystrokes: prev.interactions.keystrokes + 1,
        },
      }));
    };

    const handleMouseMove = () => {
      const currentTime = Date.now();
      
      // Throttle mouse move events
      if (currentTime - mouseMoveThrottleTime.current < 500) return;
      mouseMoveThrottleTime.current = currentTime;

      setBehavior(prev => ({
        ...prev,
        lastInteraction: currentTime,
        interactions: {
          ...prev.interactions,
          mouseMovements: prev.interactions.mouseMovements + 1,
        },
      }));
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs or minimized window
        setBehavior(prev => ({
          ...prev,
          lastInteraction: Date.now(),
        }));
      } else {
        // User returned to the page
        setBehavior(prev => ({
          ...prev,
          pageViews: prev.pageViews + 1,
          lastInteraction: Date.now(),
        }));
      }
    };

    // Event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Calculate engagement score (0-100)
  const getEngagementScore = (): number => {
    const timeWeight = Math.min(behavior.timeOnPage / 120000, 1) * 30; // 2 minutes max = 30 points
    const scrollWeight = (behavior.scrollPercent / 100) * 25; // 25 points max
    const clickWeight = Math.min(behavior.clickCount / 20, 1) * 25; // 20 clicks max = 25 points
    const interactionWeight = Math.min(
      (behavior.interactions.clicks + behavior.interactions.keystrokes) / 50,
      1
    ) * 20; // 20 points max

    return Math.round(timeWeight + scrollWeight + clickWeight + interactionWeight);
  };

  // Determine user intent based on behavior
  const getUserIntent = (): 'exploring' | 'engaged' | 'leaving' | 'focused' => {
    const { timeOnPage, scrollPercent, clickCount, idleTime } = behavior;
    
    if (idleTime > 30000) return 'leaving'; // Idle for 30+ seconds
    if (timeOnPage > 180000 && scrollPercent > 70) return 'focused'; // 3+ minutes, high scroll
    if (clickCount > 10 && scrollPercent > 50) return 'engaged'; // Active user
    return 'exploring'; // Default
  };

  // Check if user is likely to convert
  const isLikelyToConvert = (): boolean => {
    const engagementScore = getEngagementScore();
    const intent = getUserIntent();
    
    return engagementScore > 60 && (intent === 'engaged' || intent === 'focused');
  };

  // Get optimal time to show widget
  const getOptimalWidgetTime = (): number => {
    const { timeOnPage, scrollPercent } = behavior;
    
    // Don't show immediately
    if (timeOnPage < 5000) return 5000 - timeOnPage;
    
    // Show after significant engagement
    if (scrollPercent > 30 && timeOnPage > 15000) return 0;
    
    // Show after moderate time on page
    if (timeOnPage > 45000) return 0;
    
    // Default wait time
    return 30000 - timeOnPage;
  };

  return {
    behavior,
    engagementScore: getEngagementScore(),
    userIntent: getUserIntent(),
    isLikelyToConvert: isLikelyToConvert(),
    optimalWidgetTime: getOptimalWidgetTime(),
  };
};
