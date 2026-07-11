import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User as UserIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup, OAuthProvider } from 'firebase/auth';
import CookieConsent from '../components/CookieConsent';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [acceptCookies, setAcceptCookies] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefEmails, setPrefEmails] = useState(true);
  const [prefAnalytics, setPrefAnalytics] = useState(true);
  const [prefPersonalization, setPrefPersonalization] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login({ email, password });
        navigate('/dashboard');
      } else {
        if (!acceptTerms) {
          setError('Please accept the terms and conditions');
          setIsLoading(false);
          return;
        }
        if (!name.trim()) {
          setError('Please enter your name');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }
        await register({ email, password, name });
        setShowSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || (isLogin ? 'Login failed' : 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError('');
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      // Send Firebase token to our backend to create/login user
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiBase = isLocalhost ? 'http://localhost:5000' : 'https://hostslice.onrender.com';
      
      const response = await fetch(`${apiBase}/api/auth/firebase-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idToken,
          email: result.user.email,
          name: result.user.displayName || result.user.email?.split('@')[0],
          provider: 'google'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        navigate('/dashboard');
        window.location.reload();
      } else {
        const err = await response.json();
        setError(err.error || 'Google sign-in failed');
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      setIsLoading(true);
      setError('');
      const microsoftProvider = new OAuthProvider('microsoft.com');
      microsoftProvider.addScope('email');
      microsoftProvider.addScope('profile');
      
      const result = await signInWithPopup(auth, microsoftProvider);
      const idToken = await result.user.getIdToken();
      
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiBase = isLocalhost ? 'http://localhost:5000' : 'https://hostslice.onrender.com';
      
      const response = await fetch(`${apiBase}/api/auth/firebase-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          email: result.user.email,
          name: result.user.displayName || result.user.email?.split('@')[0],
          provider: 'microsoft'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        navigate('/dashboard');
        window.location.reload();
      } else {
        const err = await response.json();
        setError(err.error || 'Microsoft sign-in failed');
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Microsoft sign-in failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-950 via-red-950/40 to-gray-950 relative overflow-hidden flex items-center justify-center">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[80vh] h-[40vh] rounded-b-full bg-red-500/10 blur-[100px]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-sm w-full mx-4"
        >
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-red-500/10 text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <Mail className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Check Your Email</h2>
            <p className="text-white/60 text-sm mb-2">We've sent a confirmation link to</p>
            <p className="text-red-400 font-medium text-sm mb-4">{email}</p>
            <p className="text-white/40 text-xs mb-6">Click the link to verify your account. Check spam if you don't see it.</p>
            <button
              onClick={() => { setIsLogin(true); setShowSuccess(false); }}
              className="w-full bg-red-500 text-white font-medium h-10 rounded-lg text-sm hover:bg-red-600 transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden overflow-y-auto flex items-center justify-center bg-gradient-to-b from-white via-white to-red-100/60 py-8">
      {/* Background - bottom to top shade */}
      <div className="absolute inset-0">
        {/* Strong bottom shade going up */}
        <div className="absolute bottom-0 left-0 right-0 h-[70%] bg-gradient-to-t from-red-200/50 via-red-100/30 to-transparent" />
        {/* Softer top accent */}
        <div className="absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-red-50/40 to-transparent" />
        {/* Side shades */}
        <div className="absolute bottom-0 left-0 w-[40%] h-[50%] bg-gradient-to-tr from-red-300/20 to-transparent blur-[40px]" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[50%] bg-gradient-to-tl from-orange-200/20 to-transparent blur-[40px]" />
      </div>

      {/* Floating soft blobs */}
      <motion.div
        className="absolute top-[10%] right-[12%] w-36 h-36 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)' }}
        animate={{ y: [-15, 15, -15], x: [0, 8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[20%] left-[8%] w-28 h-28 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.06) 0%, transparent 70%)' }}
        animate={{ y: [10, -10, 10], x: [-5, 5, -5] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute top-[50%] right-[6%] w-3 h-3 rounded-full bg-red-400/25"
        animate={{ y: [-25, 25, -25], opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[18%] left-[15%] w-2 h-2 rounded-full bg-orange-300/35"
        animate={{ y: [15, -15, 15], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.012]" style={{
        backgroundImage: `linear-gradient(rgba(239,68,68,1) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-full max-w-[380px] relative z-10 mx-4 my-8"
        style={{ perspective: 1500 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="relative group">
            {/* Animated border glow */}
            <div className="absolute -inset-[1px] rounded-2xl overflow-hidden">
              <motion.div className="absolute top-0 left-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-red-500 to-transparent"
                animate={{ left: ['-35%', '100%'] }}
                transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.5 }}
              />
              <motion.div className="absolute top-0 right-0 h-[35%] w-[2px] bg-gradient-to-b from-transparent via-red-500 to-transparent"
                animate={{ top: ['-35%', '100%'] }}
                transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.5, delay: 0.9 }}
              />
              <motion.div className="absolute bottom-0 right-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-red-500 to-transparent"
                animate={{ right: ['-35%', '100%'] }}
                transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.5, delay: 1.8 }}
              />
              <motion.div className="absolute bottom-0 left-0 h-[35%] w-[2px] bg-gradient-to-b from-transparent via-red-500 to-transparent"
                animate={{ bottom: ['-35%', '100%'] }}
                transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.5, delay: 2.7 }}
              />
            </div>

            {/* Glass card - fully transparent glassmorphism */}
            <div className="relative bg-white/30 backdrop-blur-xl rounded-2xl p-7 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden">
              {/* Top shimmer line */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

              {/* Logo with animation */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', duration: 1.2, bounce: 0.5 }}
                  className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-red-50 to-white border border-red-100 flex items-center justify-center relative mb-4 shadow-lg shadow-red-500/10"
                >
                  {/* Orbiting ring */}
                  <motion.div
                    className="absolute inset-[-6px] rounded-2xl"
                    style={{ border: '1.5px dashed rgba(239,68,68,0.2)' }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  />
                  {/* Orbiting dot 1 */}
                  <motion.div
                    className="absolute w-2 h-2 bg-red-400 rounded-full shadow-lg shadow-red-400/50"
                    animate={{ 
                      rotate: 360,
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    style={{ top: '-4px', left: '50%', transformOrigin: '0px 36px' }}
                  />
                  {/* Orbiting dot 2 */}
                  <motion.div
                    className="absolute w-1.5 h-1.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"
                    animate={{ 
                      rotate: -360,
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    style={{ bottom: '-3px', left: '50%', transformOrigin: '0px -32px' }}
                  />
                  {/* Pulse ring */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-red-400/30"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
                  />
                  {/* Logo with bounce */}
                  <motion.img
                    src="/logo.png"
                    alt="Logo"
                    className="w-9 h-9 object-contain relative z-10 drop-shadow-sm"
                    animate={{ 
                      y: [0, -3, 0],
                      rotate: [0, 5, 0, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-gray-900"
                >
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-500 text-sm mt-1"
                >
                  {isLogin ? 'Sign in to continue to Pepperwahl' : 'Get started with Pepperwahl'}
                </motion.p>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs text-center"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name (signup only) */}
                <AnimatePresence>
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={`relative flex items-center rounded-xl overflow-hidden border transition-all ${focusedInput === 'name' ? 'border-red-400 bg-white shadow-sm' : 'border-gray-200 bg-white/80'}`}>
                        <UserIcon className={`absolute left-3.5 w-4 h-4 transition-colors ${focusedInput === 'name' ? 'text-red-500' : 'text-gray-400'}`} />
                        <input
                          type="text"
                          placeholder="Full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onFocus={() => setFocusedInput('name')}
                          onBlur={() => setFocusedInput(null)}
                          className="w-full bg-transparent text-gray-900 placeholder:text-gray-400 h-11 rounded-xl pl-11 pr-4 text-sm outline-none"
                          required={!isLogin}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email */}
                <div className={`relative flex items-center rounded-xl overflow-hidden border transition-all ${focusedInput === 'email' ? 'border-red-400 bg-white shadow-sm' : 'border-gray-200 bg-white/80'}`}>
                  <Mail className={`absolute left-3.5 w-4 h-4 transition-colors ${focusedInput === 'email' ? 'text-red-500' : 'text-gray-400'}`} />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    className="w-full bg-transparent text-gray-900 placeholder:text-gray-400 h-11 rounded-xl pl-11 pr-4 text-sm outline-none"
                    required
                  />
                </div>

                {/* Password */}
                <div className={`relative flex items-center rounded-xl overflow-hidden border transition-all ${focusedInput === 'password' ? 'border-red-400 bg-white shadow-sm' : 'border-gray-200 bg-white/80'}`}>
                  <Lock className={`absolute left-3.5 w-4 h-4 transition-colors ${focusedInput === 'password' ? 'text-red-500' : 'text-gray-400'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    className="w-full bg-transparent text-gray-900 placeholder:text-gray-400 h-11 rounded-xl pl-11 pr-11 text-sm outline-none"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5">
                    {showPassword
                      ? <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" />
                      : <EyeOff className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" />
                    }
                  </button>
                </div>

                {/* Terms & Preferences (signup only) */}
                <AnimatePresence>
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="pt-2"
                    >
                      {/* Terms checkbox with expand arrow */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <input
                            id="terms"
                            type="checkbox"
                            checked={acceptTerms}
                            onChange={() => setAcceptTerms(!acceptTerms)}
                            className="mt-0.5 h-4 w-4 rounded border border-gray-300 bg-white accent-red-500 cursor-pointer"
                          />
                          <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                            I agree to the <span className="text-red-500 font-medium hover:underline">Terms & Conditions</span> and <span className="text-red-500 font-medium hover:underline">Privacy Policy</span>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPreferences(!showPreferences)}
                          className={`p-1 rounded-md transition-all ${showPreferences ? 'bg-stone-100 rotate-180' : 'hover:bg-stone-50'}`}
                        >
                          <ChevronDown size={14} className="text-stone-400" />
                        </button>
                      </div>

                      {/* Expandable preferences */}
                      <AnimatePresence>
                        {showPreferences && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 ml-7 space-y-2.5 max-h-[120px] overflow-y-auto pr-1">
                              {/* Preference 1 */}
                              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                                <span className="text-[11px] text-gray-500">Receive tips, updates & offers via email</span>
                                <button
                                  type="button"
                                  onClick={() => setPrefEmails(!prefEmails)}
                                  className={`w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${prefEmails ? 'bg-red-500' : 'bg-stone-300'}`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${prefEmails ? 'translate-x-[17px]' : 'translate-x-[2px]'}`} />
                                </button>
                              </div>
                              {/* Preference 2 */}
                              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                                <span className="text-[11px] text-gray-500">Allow analytics to improve experience</span>
                                <button
                                  type="button"
                                  onClick={() => setPrefAnalytics(!prefAnalytics)}
                                  className={`w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${prefAnalytics ? 'bg-red-500' : 'bg-stone-300'}`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${prefAnalytics ? 'translate-x-[17px]' : 'translate-x-[2px]'}`} />
                                </button>
                              </div>
                              {/* Preference 3 */}
                              <div className="flex items-center justify-between py-1.5">
                                <span className="text-[11px] text-gray-500">Personalize content based on activity</span>
                                <button
                                  type="button"
                                  onClick={() => setPrefPersonalization(!prefPersonalization)}
                                  className={`w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${prefPersonalization ? 'bg-red-500' : 'bg-stone-300'}`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${prefPersonalization ? 'translate-x-[17px]' : 'translate-x-[2px]'}`} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-5 relative group/button"
                >
                  <div className="absolute inset-0 bg-red-500/30 rounded-xl blur-xl opacity-0 group-hover/button:opacity-60 transition-opacity duration-300" />
                  <div className="relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 text-white font-medium h-11 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-red-500/25">
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <div className="w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                        </motion.div>
                      ) : (
                        <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-2 text-sm font-semibold"
                        >
                          {isLogin ? 'Sign In' : 'Create Account'}
                          <ArrowRight className="w-4 h-4 group-hover/button:translate-x-1 transition-transform" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>

                {/* Divider */}
                <div className="relative my-5 flex items-center">
                  <div className="flex-grow border-t border-gray-200" />
                  <span className="mx-4 text-xs text-gray-400">or continue with</span>
                  <div className="flex-grow border-t border-gray-200" />
                </div>

                {/* Social buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Google */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleGoogleLogin}
                    className="relative bg-white h-11 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/>
                      <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067C3.198 21.302 7.27 24 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/>
                      <path fill="#4A90D9" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/>
                      <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"/>
                    </svg>
                    <span className="text-gray-700 text-xs font-medium">Google</span>
                  </motion.button>

                  {/* Microsoft */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleMicrosoftLogin}
                    className="relative bg-white h-11 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <rect fill="#F25022" x="1" y="1" width="10" height="10"/>
                      <rect fill="#7FBA00" x="13" y="1" width="10" height="10"/>
                      <rect fill="#00A4EF" x="1" y="13" width="10" height="10"/>
                      <rect fill="#FFB900" x="13" y="13" width="10" height="10"/>
                    </svg>
                    <span className="text-gray-700 text-xs font-medium">Microsoft</span>
                  </motion.button>
                </div>

                {/* Switch */}
                <motion.p
                  className="text-center text-sm text-gray-500 mt-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="text-red-500 font-semibold hover:text-red-600 transition-colors"
                  >
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </button>
                </motion.p>
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
      <CookieConsent />
    </div>
  );
};

export default LoginPage;
