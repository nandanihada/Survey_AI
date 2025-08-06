import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export type VoiceInputState = 'idle' | 'listening' | 'processing' | 'error';

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onComplete: () => void;
  language?: string;
  continuous?: boolean;
}

interface UseVoiceInputReturn {
  state: VoiceInputState;
  transcript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
}

export const useVoiceInput = ({
  onTranscript,
  onComplete,
  language = 'en-US',
  continuous = false,
}: UseVoiceInputOptions): UseVoiceInputReturn => {
  const [state, setState] = useState<VoiceInputState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef('');

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
    }
  }, []);

  // Setup speech recognition
  useEffect(() => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setState('listening');
      setError(null);
      finalTranscriptRef.current = '';
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      finalTranscriptRef.current = finalTranscript;
      const currentTranscript = finalTranscript + interimTranscript;
      setTranscript(currentTranscript.trim());
      onTranscript(currentTranscript.trim());

      // If we have final results, set a timeout to stop listening
      if (finalTranscript) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          if (recognition && state === 'listening') {
            recognition.stop();
          }
        }, 2000); // Stop 2 seconds after last final result
      }
    };

    recognition.onend = () => {
      setState('processing');
      
      // Small delay before calling onComplete to show processing state
      setTimeout(() => {
        setState('idle');
        if (finalTranscriptRef.current.trim()) {
          onComplete();
        }
      }, 500);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = 'Voice recognition failed';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone access denied or not available.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied.';
          break;
        case 'network':
          errorMessage = 'Network error occurred.';
          break;
        default:
          errorMessage = `Voice recognition error: ${event.error}`;
      }
      
      setError(errorMessage);
      setState('error');
      
      // Reset to idle after showing error
      setTimeout(() => {
        setState('idle');
        setError(null);
      }, 3000);
    };

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [language, continuous, onTranscript, onComplete, state]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    if (state === 'listening') return;

    try {
      setTranscript('');
      setError(null);
      finalTranscriptRef.current = '';
      recognitionRef.current.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError('Failed to start voice recognition');
      setState('error');
    }
  }, [isSupported, state]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && state === 'listening') {
      recognitionRef.current.stop();
    }
  }, [state]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    transcript,
    isSupported,
    error,
    startListening,
    stopListening,
    clearTranscript,
  };
};
