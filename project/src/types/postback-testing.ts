export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface PostbackTestParams {
  [key: string]: string | number | boolean;
}

export interface PostbackTestConfig {
  url: string;
  method: HttpMethod;
  params: PostbackTestParams;
  interval: number;
  intervalUnit: 'seconds' | 'minutes';
  duration?: number;
  maxRequests?: number;
}

export interface PostbackTestLog {
  timestamp: Date;
  url: string;
  statusCode: number;
  statusText: string;
  response: any;
  error?: string;
  duration: number;
}

export interface PostbackTestResult {
  _id?: string;
  testId: string;
  config: PostbackTestConfig;
  logs: PostbackTestLog[];
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  totalRequests: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StartTestResponse {
  testId: string;
  message: string;
}

export interface TestStatusResponse {
  testId: string;
  status: PostbackTestResult['status'];
  logs: PostbackTestLog[];
  stats: {
    totalRequests: number;
    successCount: number;
    errorCount: number;
    averageResponseTime: number;
  };
}
