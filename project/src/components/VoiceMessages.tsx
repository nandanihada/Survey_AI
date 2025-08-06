import { useAudioFeedback } from '../hooks/useAudioFeedback';

interface VoiceMessage {
  id: string;
  text: string;
  description: string;
}

export const GENERATION_MESSAGES: VoiceMessage[] = [
  {
    id: 'standard',
    text: 'Your survey is generating with AI.',
    description: 'Standard message'
  },
  {
    id: 'friendly',
    text: 'Hi there! I\'m creating your personalized survey with AI. This will just take a moment.',
    description: 'Friendly and warm'
  },
  {
    id: 'professional',
    text: 'Please wait while I generate your custom survey using artificial intelligence.',
    description: 'Professional tone'
  },
  {
    id: 'encouraging',
    text: 'Great topic! I\'m now crafting the perfect survey questions for you using AI.',
    description: 'Encouraging and positive'
  },
  {
    id: 'soft',
    text: 'Creating something wonderful for you. Your AI-powered survey is being generated.',
    description: 'Soft and gentle'
  }
];

export const COMPLETION_MESSAGES: VoiceMessage[] = [
  {
    id: 'standard',
    text: 'Your survey is ready!',
    description: 'Standard completion'
  },
  {
    id: 'cheerful',
    text: 'Perfect! Your survey has been created and is ready to use.',
    description: 'Cheerful completion'
  },
  {
    id: 'professional',
    text: 'Survey generation complete. You may now review and customize your questions.',
    description: 'Professional completion'
  }
];

interface VoiceMessagesProps {
  onGenerationMessage?: (messageId: string) => void;
  onCompletionMessage?: (messageId: string) => void;
}

export const useVoiceMessages = () => {
  const audioFeedback = useAudioFeedback({
    rate: 0.85,
    pitch: 1.15,
    volume: 0.8,
  });

  const playGenerationMessage = () => {
    audioFeedback.speak('Your survey is generating with AI.');
  };

  const playCompletionMessage = () => {
    audioFeedback.speak('Your survey is ready!');
  };

  const playListeningPrompt = () => {
    audioFeedback.speak('I\'m listening. Please describe your survey topic.');
  };

  const playErrorMessage = (error: string) => {
    const errorMessages: { [key: string]: string } = {
      'no-speech': 'I didn\'t hear anything. Please try speaking again.',
      'audio-capture': 'I can\'t access your microphone. Please check your settings.',
      'not-allowed': 'Microphone permission is needed for voice input.',
      'network': 'There seems to be a connection issue. Please try again.',
      'default': 'Sorry, there was an issue with voice recognition. Please try again.'
    };
    
    const message = errorMessages[error] || errorMessages.default;
    audioFeedback.speak(message);
  };

  return {
    ...audioFeedback,
    playGenerationMessage,
    playCompletionMessage,
    playListeningPrompt,
    playErrorMessage,
  };
};
