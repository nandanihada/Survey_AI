import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, CheckCircle, FileText, Clipboard } from 'lucide-react';
import { QuestionAnswerParser } from '../utils/questionAnswerParser';

interface PasteExampleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPaste: (text: string) => void;
  isDarkMode: boolean;
}

const PasteExampleDialog: React.FC<PasteExampleDialogProps> = ({
  isOpen,
  onClose,
  onPaste,
  isDarkMode
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const examples = [
    {
      title: "Mixed Question Types",
      content: `How are you feeling about your experience so far?
a) 😊 Amazing
b) 😐 Good  
c) 😞 Okay
d) 😤 Frustrated

What's keeping you most engaged right now?
- Content quality
- Design & interface
- Features
- Just exploring

Rate your satisfaction from 1 to 5:
1 - Very Dissatisfied, 2 - Dissatisfied, 3 - Neutral, 4 - Satisfied, 5 - Very Satisfied`
    },
    {
      title: "Simple Q&A Format",
      content: `Q1: What's your favorite color?
Red, Blue, Green, Yellow, Purple

Q2: How often do you use this app?
Daily, Weekly, Monthly, Rarely

Q3: Would you recommend this to a friend?
Yes, No, Maybe`
    },
    {
      title: "Numbered with Options",
      content: `1. What brings you to our website today?
   a) Looking for information
   b) Making a purchase
   c) Customer support
   d) Just browsing

2. How did you hear about us?
   * Social media
   * Search engine
   * Word of mouth
   * Advertisement

3. Rate your overall experience:
   → 1 - Poor
   → 2 - Fair  
   → 3 - Good
   → 4 - Excellent`
    },
    {
      title: "Comma-Separated Style",
      content: `What's your preferred communication method?
Email, Phone, Text message, Video call, In-person

Which features are most important to you?
Speed, Reliability, User-friendliness, Security, Cost-effectiveness

How likely are you to continue using our service?
Very likely, Somewhat likely, Neutral, Somewhat unlikely, Very unlikely`
    }
  ];

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handlePasteExample = (text: string) => {
    onPaste(text);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl ${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-stone-200'
          } border`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`p-6 border-b ${
            isDarkMode ? 'border-slate-700' : 'border-stone-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className={`w-6 h-6 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <div>
                  <h2 className={`text-xl font-semibold ${
                    isDarkMode ? 'text-white' : 'text-stone-800'
                  }`}>
                    Paste Questions Format Examples
                  </h2>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-slate-300' : 'text-stone-600'
                  }`}>
                    Copy any of these examples and use the paste button to import questions
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                    : 'hover:bg-stone-100 text-stone-500 hover:text-stone-700'
                }`}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {examples.map((example, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    isDarkMode
                      ? 'bg-slate-700/50 border-slate-600'
                      : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-stone-800'
                    }`}>
                      {example.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(example.content, index)}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          copiedIndex === index
                            ? 'bg-green-500 text-white'
                            : isDarkMode
                              ? 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                              : 'bg-stone-200 hover:bg-stone-300 text-stone-600'
                        }`}
                        title="Copy to clipboard"
                      >
                        {copiedIndex === index ? (
                          <CheckCircle size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handlePasteExample(example.content)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                        title="Use this example"
                      >
                        <Clipboard size={16} />
                      </button>
                    </div>
                  </div>
                  <pre className={`text-sm whitespace-pre-wrap font-mono p-3 rounded border overflow-x-auto ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-600 text-slate-300'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}>
                    {example.content}
                  </pre>
                </div>
              ))}
            </div>

            {/* Usage Instructions */}
            <div className={`mt-6 p-4 rounded-lg border ${
              isDarkMode
                ? 'bg-blue-500/10 border-blue-500/20'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <h4 className={`font-medium mb-3 ${
                isDarkMode ? 'text-blue-300' : 'text-blue-700'
              }`}>
                How to Use:
              </h4>
              <ol className={`list-decimal list-inside space-y-2 text-sm ${
                isDarkMode ? 'text-blue-200' : 'text-blue-600'
              }`}>
                <li>Copy any of the examples above or create your own following the format</li>
                <li>Click the <Clipboard size={14} className="inline mx-1" /> paste button in the Widget Customizer</li>
                <li>The system will automatically detect question types and format options</li>
                <li>Questions can be numbered (1., Q1:, Question 1:) or unnumbered</li>
                <li>Options can use various formats: a), -, *, •, →, or comma-separated</li>
                <li>Emojis in options will be automatically extracted and preserved</li>
              </ol>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PasteExampleDialog;
