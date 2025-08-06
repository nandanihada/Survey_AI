import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAudioFeedbackOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface UseAudioFeedbackReturn {
  isSupported: boolean;
  isPlaying: boolean;
  speak: (text: string) => void;
  stop: () => void;
  playGenerationMessage: () => void;
  availableVoices: SpeechSynthesisVoice[];
}

export const useAudioFeedback = ({
  language = 'en-US',
  rate = 0.85, // Slower, softer rate
  pitch = 1.1, // Slightly higher pitch for femininity
  volume = 0.7, // Softer volume
}: UseAudioFeedbackOptions = {}): UseAudioFeedbackReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load and select the best female voice
  const loadVoices = useCallback(() => {
    if (!('speechSynthesis' in window)) return;

    const voices = speechSynthesis.getVoices();
    setAvailableVoices(voices);

    // Prioritize female voices
    const femaleVoiceNames = [
      'Microsoft Zira - English (United States)', // Windows
      'Google UK English Female', // Chrome
      'Microsoft Hazel - English (Great Britain)', // Windows
      'Samantha', // macOS
      'Karen', // macOS
      'Tessa', // macOS
      'Veena', // macOS
      'Alex', // macOS fallback
    ];

    // Look for preferred female voices by name
    let selectedVoice = voices.find(voice => 
      femaleVoiceNames.some(name => voice.name.includes(name))
    );

    // Fallback: look for any voice with 'female' in the name
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('woman')
      );
    }

    // Fallback: look for voices that are typically female based on language patterns
    if (!selectedVoice && language.startsWith('en')) {
      selectedVoice = voices.find(voice => 
        voice.lang === language && (
          voice.name.includes('Zira') ||
          voice.name.includes('Hazel') ||
          voice.name.includes('Catherine') ||
          voice.name.includes('Samantha')
        )
      );
    }

    // Final fallback: use first available voice for the language
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => voice.lang === language) || voices[0];
    }

    selectedVoiceRef.current = selectedVoice;
  }, [language]);

  // Check if speech synthesis is supported and load voices
  useEffect(() => {
    const isSupported = 'speechSynthesis' in window;
    setIsSupported(isSupported);
    
    if (isSupported) {
      loadVoices();
      
      // Some browsers load voices asynchronously
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
      
      // Fallback: try loading voices after a short delay
      setTimeout(loadVoices, 100);
    }
  }, [loadVoices]);

  const stop = useCallback(() => {
    if (isSupported && speechSynthesis) {
      speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;

    // Cancel any ongoing speech
    stop();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Configure utterance with selected voice
      utterance.lang = language;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      
      // Use selected female voice if available
      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }

      // Event handlers
      utterance.onstart = () => {
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setIsPlaying(false);
        utteranceRef.current = null;
      };

      // Speak the text
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      setIsPlaying(false);
    }
  }, [isSupported, language, rate, pitch, volume, stop]);

  const playGenerationMessage = useCallback(() => {
    speak('Your survey is generating with AI.');
  }, [speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isSupported,
    isPlaying,
    speak,
    stop,
    playGenerationMessage,
    availableVoices,
  };
};
