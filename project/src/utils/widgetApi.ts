// Widget response storage utility
interface WidgetResponse {
  id?: string;
  responses: Record<string, string>;
  timestamp: number;
  userAgent: string;
  sessionId: string;
}

export const saveWidgetResponses = async (responses: Record<string, string>): Promise<void> => {
  try {
    const responseData: WidgetResponse = {
      responses,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      sessionId: generateSessionId()
    };

    // For now, save to localStorage (you can replace with actual API call)
    const existingResponses = getStoredResponses();
    existingResponses.push({
      ...responseData,
      id: generateId()
    });

    localStorage.setItem('widgetResponses', JSON.stringify(existingResponses));
    
    // Log for debugging
    console.log('Widget responses saved:', responseData);
    
    // TODO: Replace with actual API call
    // await fetch('/api/widget-responses', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(responseData)
    // });
    
  } catch (error) {
    console.error('Failed to save widget responses:', error);
  }
};

export const getStoredResponses = (): WidgetResponse[] => {
  try {
    const stored = localStorage.getItem('widgetResponses');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to retrieve stored responses:', error);
    return [];
  }
};

export const getResponsesAnalytics = () => {
  const responses = getStoredResponses();
  
  return {
    totalResponses: responses.length,
    latestResponse: responses[responses.length - 1],
    responsesByQuestion: responses.reduce((acc, response) => {
      Object.entries(response.responses).forEach(([questionId, answer]) => {
        if (!acc[questionId]) acc[questionId] = {};
        if (!acc[questionId][answer]) acc[questionId][answer] = 0;
        acc[questionId][answer]++;
      });
      return acc;
    }, {} as Record<string, Record<string, number>>)
  };
};

const generateSessionId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};
