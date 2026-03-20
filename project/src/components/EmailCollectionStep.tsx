import React, { useState } from 'react';

interface EmailCollectionStepProps {
  onEmailCollected: (email: string) => void;
  triggerInfo: {
    question_id: string;
    answer_value: string;
  }[];
}

const EmailCollectionStep: React.FC<EmailCollectionStepProps> = ({ 
  onEmailCollected, 
  triggerInfo 
}) => {
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setIsValid(validateEmail(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && email) {
      onEmailCollected(email);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998a2 2 0 00-.99.494V15a2 2 0 002 2h-3a2 2 0 002-2v-1.382a2 2 0 00-.996-.504l-7.997-3.998A2 2 0 0012.003 5.884zM18 9a1 1 0 00-1 1H5a1 1 0 00-1-1V7a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Required</h2>
          <p className="text-gray-600 mb-6">
            Based on your answer to the previous question, we need to send you an email with your survey results. Please provide your email to complete the survey.
          </p>
          
          {triggerInfo.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">📧 Trigger Condition Met:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                {triggerInfo.map((trigger, index) => (
                  <li key={index}>
                    <strong>Question {trigger.question_id}:</strong> You answered "{trigger.answer_value}"
                  </li>
                ))}
              </ul>
              <p className="text-blue-700 text-xs mt-2">Please provide your email to continue with the survey.</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email address"
              required
            />
            {!isValid && email && (
              <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
            )}
          </div>

          <div className="flex">
            <button
              type="submit"
              disabled={!isValid || !email}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Submit Survey & Send Email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailCollectionStep;
