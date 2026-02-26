import { useNavigate } from 'react-router-dom';
import { Lock, Home } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <Lock size={80} className="mx-auto text-red-600 mb-4" />
          <h1 className="text-4xl font-bold text-gray-800">Access Denied</h1>
          <p className="text-gray-600 mt-4">
            You don't have permission to access this page.
          </p>
        </div>
        
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mx-auto"
        >
          <Home size={20} />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
