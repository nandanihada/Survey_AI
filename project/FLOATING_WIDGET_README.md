# Floating Widget Feature

## Overview

The Floating Widget is a minimal, behavior-aware survey component that appears as a floating overlay on your survey application. It asks 2-3 emotionally warm, personalized questions with intelligent timing and provides personalized content recommendations based on user responses.

## Features

### 🎯 Behavior-Aware Display
- **Idle Time Detection**: Shows after 5 seconds of user inactivity
- **Smart Timing**: Appears based on user engagement metrics (time on page, scroll percentage, click count)
- **User Intent Recognition**: Avoids showing to users who appear to be leaving

### 💝 Emotionally Warm Questions
- **Personalized Content**: Questions adapt based on user behavior patterns
- **Friendly Tone**: Uses warm, conversational language
- **Visual Feedback**: Emoji-based responses and smooth animations

### ⏰ Intelligent Timing
- **Progressive Reveal**: 20-30 second delays between questions
- **Auto-dismiss**: Automatically closes after 45 seconds if unanswered
- **Optimal Timing**: Uses engagement algorithms to determine the best moment to show

### 🎨 Personalized Content
- **Smart Recommendations**: Suggests content based on user responses
- **Adaptive Messaging**: Different CTAs based on user sentiment
- **Light Ad Integration**: Non-intrusive promotional content when appropriate

## Component Structure

```
src/components/
├── FloatingWidget.tsx           # Main widget component
├── FloatingWidgetProvider.tsx   # Context provider and logic
├── FloatingWidgetDemo.tsx       # Demo/control component
└── hooks/
    └── useUserBehavior.ts       # User behavior tracking hook
```

## Usage

### Basic Integration

```tsx
import { FloatingWidgetProvider } from './components/FloatingWidgetProvider';

function App() {
  const handleWidgetComplete = (responses: Record<string, string>) => {
    console.log('Widget responses:', responses);
    // Send to analytics, backend, etc.
  };

  return (
    <FloatingWidgetProvider
      isDarkMode={isDarkMode}
      onWidgetComplete={handleWidgetComplete}
      onWidgetDismiss={() => console.log('Widget dismissed')}
    >
      <YourAppContent />
    </FloatingWidgetProvider>
  );
}
```

### Manual Control

```tsx
import { useFloatingWidget } from './components/FloatingWidgetProvider';

function MyComponent() {
  const { showWidget, hideWidget, isWidgetEnabled, setWidgetEnabled } = useFloatingWidget();

  return (
    <div>
      <button onClick={showWidget}>Show Widget</button>
      <button onClick={hideWidget}>Hide Widget</button>
      <button onClick={() => setWidgetEnabled(!isWidgetEnabled)}>
        Toggle Widget
      </button>
    </div>
  );
}
```

## Configuration

### Widget Behavior Settings

The widget can be configured by modifying the following parameters in `FloatingWidget.tsx`:

```tsx
// Timing settings
const IDLE_DELAY = 5000;          // Show after 5 seconds of inactivity
const AUTO_DISMISS_DELAY = 45000; // Auto-dismiss after 45 seconds
const QUESTION_DELAY = 1500;      // Delay between questions

// Behavior thresholds
const MIN_ENGAGEMENT_SCORE = 30;  // Minimum engagement to show widget
const HIGH_ENGAGEMENT_TIME = 15000; // Time threshold for engaged users
```

### Question Customization

Modify the `getPersonalizedQuestions()` function to customize questions:

```tsx
const baseQuestions: Question[] = [
  {
    id: 'mood',
    text: 'How are you feeling about your experience so far?',
    type: 'emoji',
    options: [
      { value: 'amazing', label: 'Amazing', emoji: '🤩' },
      { value: 'good', label: 'Good', emoji: '😊' },
      // ... more options
    ],
    delay: 3000
  },
  // ... more questions
];
```

## User Behavior Tracking

The `useUserBehavior` hook tracks:

- **Time on page**: How long user has been on the current page
- **Scroll percentage**: Maximum scroll depth reached
- **Click count**: Number of clicks/interactions
- **Idle time**: Time since last interaction
- **Engagement score**: Calculated score (0-100) based on behavior
- **User intent**: Categorized as 'exploring', 'engaged', 'leaving', or 'focused'

## Personalization Logic

The widget provides different content based on user responses:

### Response-Based Content
- **Positive + High Likelihood**: Upgrade/premium content
- **Negative/Frustrated**: Support and help resources
- **Content-Focused**: Content recommendations
- **Default**: General discovery content

### Behavioral Targeting
- **High Engagement**: Earlier widget display
- **Long Time on Page**: Personalized timing messages
- **High Scroll**: Exploration-focused questions
- **Many Clicks**: Activity-based personalization

## Storage & Persistence

The widget uses localStorage to:
- **Prevent Re-showing**: Completed widgets won't show again
- **Respect Dismissals**: Dismissed widgets wait 7 days before reshowing
- **Store Responses**: Preserve user responses for analytics
- **Track Engagement**: Remember user behavior patterns

## Development & Debugging

### Debug Mode
In development mode, a debug panel shows:
- Current user behavior metrics
- Engagement score
- User intent classification
- Widget responses

### Testing
Use the `FloatingWidgetDemo` component to manually test widget behavior:
- Force show/hide widget
- Enable/disable widget
- View last responses
- Understand timing logic

## Design System Integration

The widget seamlessly integrates with your existing design system:
- **Theme Support**: Respects light/dark mode settings
- **Color Scheme**: Uses your red-based primary colors
- **Typography**: Matches Poppins font family
- **Spacing**: Follows Tailwind spacing conventions
- **Animations**: Uses Framer Motion for smooth transitions

## Performance Considerations

- **Event Throttling**: Mouse and scroll events are throttled to prevent performance issues
- **Cleanup**: Proper cleanup of event listeners and timers
- **Lazy Loading**: Widget only renders when needed
- **Memory Management**: Efficient state management to prevent memory leaks

## Accessibility

- **Keyboard Support**: Widget can be dismissed with escape key
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Proper focus handling for interactive elements
- **Color Contrast**: Meets WCAG guidelines for color contrast

## API Integration

The widget is designed to work with your existing survey API:

```tsx
// Example: Send responses to backend
const handleWidgetComplete = async (responses: Record<string, string>) => {
  try {
    await fetch('/api/widget-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        responses,
        timestamp: Date.now(),
        userBehavior: behavior,
        engagementScore,
      }),
    });
  } catch (error) {
    console.error('Failed to save widget responses:', error);
  }
};
```

## Customization Examples

### Custom Questions
```tsx
// Add industry-specific questions
const industryQuestions = {
  ecommerce: [
    {
      id: 'shopping_intent',
      text: 'What brings you here today?',
      type: 'choice',
      options: [
        { value: 'browsing', label: 'Just browsing', emoji: '👀' },
        { value: 'specific', label: 'Looking for something specific', emoji: '🔍' },
        { value: 'deals', label: 'Checking for deals', emoji: '💰' },
      ],
    },
  ],
  // ... more industries
};
```

### Custom Styling
```tsx
// Custom theme colors
const customTheme = {
  primary: '#your-primary-color',
  background: '#your-background-color',
  text: '#your-text-color',
  accent: '#your-accent-color',
};
```

### Advanced Behavior Rules
```tsx
// Custom display rules
const shouldShowWidget = (behavior: UserBehavior): boolean => {
  // Custom logic based on your requirements
  return behavior.timeOnPage > 30000 && 
         behavior.scrollPercent > 25 && 
         behavior.clickCount > 3;
};
```

This floating widget provides a sophisticated, non-intrusive way to collect user feedback while delivering personalized content that enhances the user experience.
