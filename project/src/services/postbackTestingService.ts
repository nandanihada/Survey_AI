import { io, Socket } from 'socket.io-client';
import { PostbackTestConfig, StartTestResponse, TestStatusResponse, PostbackTestLog } from '../types/postback-testing';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
let socket: Socket | null = null;

// Initialize WebSocket connection
const initSocket = (testId: string, onLogUpdate: (log: PostbackTestLog) => void) => {
  if (!socket) {
    socket = io(API_BASE);
  }

  // Listen for log updates
  socket.on(`test:${testId}:log`, onLogUpdate);

  return socket;
};

// Clean up WebSocket listeners
const cleanupSocket = (testId: string) => {
  if (socket) {
    socket.off(`test:${testId}:log`);
  }
};

export const startPostbackTest = async (config: PostbackTestConfig): Promise<StartTestResponse> => {
  const response = await fetch(`${API_BASE}/api/postback-tests/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start postback test');
  }
  
  return response.json();
};

export const stopPostbackTest = async (testId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/postback-tests/${testId}/stop`, {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to stop postback test');
  }
};

export const getTestStatus = async (testId: string): Promise<TestStatusResponse> => {
  const response = await fetch(`${API_BASE}/api/postback-tests/${testId}/status`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get test status');
  }
  
  return response.json();
};

export const getAllTests = async (): Promise<TestStatusResponse[]> => {
  const response = await fetch(`${API_BASE}/api/postback-tests`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get test history');
  }
  
  return response.json();
};

export const subscribeToTestUpdates = (
  testId: string,
  onLogUpdate: (log: PostbackTestLog) => void
) => {
  initSocket(testId, onLogUpdate);
  
  return () => {
    cleanupSocket(testId);
  };
};
