import React from 'react';

interface OptimizedLoaderProps {
  type?: 'editor' | 'question' | 'page';
  message?: string;
}

const OptimizedLoader: React.FC<OptimizedLoaderProps> = ({ 
  type = 'editor', 
  message = 'Loading...' 
}) => {
  const getLoaderContent = () => {
    switch (type) {
      case 'question':
        return (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 bg-gray-300 rounded mt-1"></div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'page':
        return (
          <div className="min-h-screen bg-gray-50 animate-pulse">
            <div className="bg-white border-b border-gray-200 h-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-6 bg-gray-300 rounded"></div>
                  <div className="w-48 h-6 bg-gray-300 rounded"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-8 bg-gray-300 rounded"></div>
                  <div className="w-16 h-8 bg-gray-300 rounded"></div>
                  <div className="w-20 h-8 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="h-6 bg-gray-300 rounded w-40 mb-4"></div>
                    <div className="space-y-4">
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
                    <div className="space-y-4">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="text-gray-600 text-lg font-medium">{message}</p>
              <p className="text-gray-400 text-sm mt-2">
                Optimizing your survey editor experience...
              </p>
            </div>
          </div>
        );
    }
  };

  return getLoaderContent();
};

export default React.memo(OptimizedLoader);
