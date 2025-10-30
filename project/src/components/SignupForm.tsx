import React, { useState } from 'react';
import { User, Mail, Globe, Link, Settings, Plus, X, Check, Lock } from 'lucide-react';

interface SignupFormProps {
  isDarkMode?: boolean;
  onSubmit?: (data: SignupFormData) => void;
}

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  website: string;
  postbackUrl: string;
  parameterMappings: Record<string, string>;
}

const AVAILABLE_PARAMETERS = {
  'transaction_id': 'Unique transaction identifier',
  'survey_id': 'Survey identifier',
  'username': 'User\'s username or identifier',
  'email': 'User\'s email address',
  'user_id': 'User\'s ID in our system',
  'click_id': 'Click tracking identifier',
  'payout': 'Payout amount',
  'currency': 'Currency code (USD, EUR, etc.)',
  'status': 'Completion status',
  'responses': 'Survey responses (JSON format)',
  'responses_flat': 'Survey responses (flat key=value format)',
  'responses_count': 'Number of survey responses',
  'responses_summary': 'Brief summary of responses',
  'timestamp': 'Completion timestamp',
  'ip_address': 'User\'s IP address'
};

export default function SignupForm({ isDarkMode = false, onSubmit }: SignupFormProps) {
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    website: '',
    postbackUrl: '',
    parameterMappings: {}
  });

  const [showParameterMapping, setShowParameterMapping] = useState(false);
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addParameterMapping = () => {
    if (newParamKey && newParamValue) {
      setFormData(prev => ({
        ...prev,
        parameterMappings: {
          ...prev.parameterMappings,
          [newParamKey]: newParamValue
        }
      }));
      setNewParamKey('');
      setNewParamValue('');
    }
  };

  const removeParameterMapping = (key: string) => {
    setFormData(prev => {
      const newMappings = { ...prev.parameterMappings };
      delete newMappings[key];
      return { ...prev, parameterMappings: newMappings };
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.email.includes('@')) newErrors.email = 'Valid email is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.confirmPassword.trim()) newErrors.confirmPassword = 'Confirm password is required';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.website.trim()) newErrors.website = 'Website URL is required';
    if (!formData.postbackUrl.trim()) newErrors.postbackUrl = 'Postback URL is required';
    
    try {
      new URL(formData.website);
    } catch {
      newErrors.website = 'Valid website URL is required';
    }

    try {
      new URL(formData.postbackUrl);
    } catch {
      newErrors.postbackUrl = 'Valid postback URL is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit?.(formData);
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className={`flex-1 flex items-center justify-center p-8 ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="w-full max-w-md">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-red-500/20' : 'bg-red-50'}`}>
                <img
                  src="https://i.postimg.cc/9Mhc6NJ6/chilllllllli.png"
                  alt="Logo"
                  className="w-8 h-8"
                  style={{ filter: 'drop-shadow(0 0 4px red)' }}
                />
              </div>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                PepperAds
              </h1>
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Register Account
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              Get your free PepperAds account now.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className={`flex rounded-lg p-1 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <button className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${isDarkMode ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600'}`}>
                Account Details
              </button>
              <button className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                User Details
              </button>
              <button className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Additional Questions
              </button>
              <button className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Partner Sign Up
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Account Details
              </h3>

              {/* Name Field */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Full Name
                </label>
                <div className="relative">
                  <User size={20} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                      errors.name 
                        ? 'border-red-500' 
                        : isDarkMode 
                        ? 'border-slate-600 bg-slate-700 text-white' 
                        : 'border-gray-300 bg-white'
                    } focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                  />
                </div>
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Email Field */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={20} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email address"
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                      errors.email 
                        ? 'border-red-500' 
                        : isDarkMode 
                        ? 'border-slate-600 bg-slate-700 text-white' 
                        : 'border-gray-300 bg-white'
                    } focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Password Field */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={20} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                      errors.password 
                        ? 'border-red-500' 
                        : isDarkMode 
                        ? 'border-slate-600 bg-slate-700 text-white' 
                        : 'border-gray-300 bg-white'
                    } focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                  />
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password Field */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={20} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Confirm your password"
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                      errors.confirmPassword 
                        ? 'border-red-500' 
                        : isDarkMode 
                        ? 'border-slate-600 bg-slate-700 text-white' 
                        : 'border-gray-300 bg-white'
                    } focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                  />
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              {/* Website Field */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Website URL
                </label>
                <div className="relative">
                  <Globe size={20} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://your-website.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                      errors.website 
                        ? 'border-red-500' 
                        : isDarkMode 
                        ? 'border-slate-600 bg-slate-700 text-white' 
                        : 'border-gray-300 bg-white'
                    } focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                  />
                </div>
                {errors.website && <p className="text-red-500 text-sm mt-1">{errors.website}</p>}
              </div>

              {/* Postback URL Field */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Postback URL
                </label>
                <div className="relative">
                  <Link size={20} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type="url"
                    value={formData.postbackUrl}
                    onChange={(e) => handleInputChange('postbackUrl', e.target.value)}
                    placeholder="https://your-site.com/postback?txn_id={transaction_id}&status={status}"
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                      errors.postbackUrl 
                        ? 'border-red-500' 
                        : isDarkMode 
                        ? 'border-slate-600 bg-slate-700 text-white' 
                        : 'border-gray-300 bg-white'
                    } focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                  />
                </div>
                {errors.postbackUrl && <p className="text-red-500 text-sm mt-1">{errors.postbackUrl}</p>}
              </div>

              {/* Parameter Mapping Toggle */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowParameterMapping(!showParameterMapping)}
                  className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                >
                  <Settings size={16} />
                  Configure Parameter Mapping
                  {showParameterMapping ? <X size={16} /> : <Plus size={16} />}
                </button>
              </div>

              {/* Parameter Mapping Section */}
              {showParameterMapping && (
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-gray-50'}`}>
                  <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Parameter Mappings
                  </h4>
                  
                  {/* Add New Mapping */}
                  <div className="flex gap-2 mb-3">
                    <select
                      value={newParamKey}
                      onChange={(e) => setNewParamKey(e.target.value)}
                      className={`flex-1 px-3 py-2 rounded border text-sm ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white'}`}
                    >
                      <option value="">Select Parameter</option>
                      {Object.entries(AVAILABLE_PARAMETERS).map(([key, description]) => (
                        <option key={key} value={key}>{key} - {description}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newParamValue}
                      onChange={(e) => setNewParamValue(e.target.value)}
                      placeholder="Your parameter name"
                      className={`flex-1 px-3 py-2 rounded border text-sm ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white'}`}
                    />
                    <button
                      type="button"
                      onClick={addParameterMapping}
                      className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Current Mappings */}
                  <div className="space-y-2">
                    {Object.entries(formData.parameterMappings).map(([key, value]) => (
                      <div key={key} className={`flex items-center justify-between p-2 rounded border ${isDarkMode ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'}`}>
                        <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          <code className={`px-1 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-gray-100'}`}>{key}</code>
                          {' → '}
                          <code className={`px-1 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-gray-100'}`}>{value}</code>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeParameterMapping(key)}
                          className={`text-red-500 hover:text-red-700 ${isDarkMode ? 'hover:text-red-400' : ''}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Account...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Check size={20} />
                  Create Account
                </div>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Side - Testimonial */}
      <div 
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=387)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Transparent red overlay */}
        <div className="absolute inset-0 bg-red-500/70"></div>
        
        {/* Content */}
        <div className="text-white max-w-md relative z-10">
          <div className="mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <Check size={24} />
            </div>
          </div>
          <blockquote className="text-lg mb-6">
            "I never knew how to monetize my website and make money from it. But then I found this PepperAds and now I know how to do exactly that! Survey monetization made me feel more confident about running a business because now I know what to do with my site. Literally, appreciate it!"
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <div className="font-semibold">Richard Drews</div>
              <div className="text-white/80 text-sm">Publisher</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
