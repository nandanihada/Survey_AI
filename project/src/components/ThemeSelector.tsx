import React, { useState } from 'react';
import { Palette, Type, Zap, Droplet, Monitor, Layout, ChevronDown } from 'lucide-react';

interface Theme {
  font: string;
  intent: string;
  animationSpeed: number;
  colors: {
    primary: string;
    background: string;
    text: string;
  };
}

interface ThemeSelectorProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  isDarkMode?: boolean;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  theme, 
  onThemeChange, 
  isDarkMode = false 
}) => {
  const [activePicker, setActivePicker] = useState<string | null>(null);
  
  const updateTheme = (updates: Partial<Theme>) => {
    onThemeChange({ ...theme, ...updates });
  };

  const updateColors = (colorUpdates: Partial<Theme['colors']>) => {
    onThemeChange({
      ...theme,
      colors: { ...theme.colors, ...colorUpdates }
    });
  };

  // Color presets (Canva-style)
  const colorPalettes = {
    primary: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'],
    background: ['#FFFFFF', '#F3F4F6', '#E5E7EB', '#1E293B', '#0F172A', '#111827'],
    text: ['#1E293B', '#334155', '#64748B', '#FFFFFF', '#E2E8F0', '#CBD5E1']
  };

  const fontOptions = [
    { 
      value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", 
      name: 'Inter',
      import: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap"
    },
    { 
      value: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", 
      name: 'Poppins',
      import: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&display=swap"
    },
    { 
      value: "'Roboto Slab', Georgia, serif", 
      name: 'Roboto Slab',
      import: "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;500&display=swap"
    },
    { 
      value: "'Courier New', Courier, monospace", 
      name: 'Courier',
      import: null
    },
    { 
      value: "Georgia, 'Times New Roman', Times, serif", 
      name: 'Georgia',
      import: null
    }
  ];

  const intentOptions = [
    { value: 'professional', name: 'Professional' },
    { value: 'minimal', name: 'Minimal' },
    { value: 'modern', name: 'Modern' },
    { value: 'playful', name: 'Playful' }
  ];

  // Load font when selected
  const handleFontChange = (fontValue: string) => {
    const selectedFont = fontOptions.find(f => f.value === fontValue);
    if (selectedFont?.import) {
      const link = document.createElement('link');
      link.href = selectedFont.import;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    updateTheme({ font: fontValue });
    setActivePicker(null);
  };

  // Styles
  const styles = {
    container: isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900',
    button: isDarkMode 
      ? 'bg-slate-700 hover:bg-slate-600 text-white' 
      : 'bg-gray-100 hover:bg-gray-200 text-gray-800',
    activeButton: 'ring-2 ring-purple-500',
    colorCircle: 'w-6 h-6 rounded-full cursor-pointer border border-opacity-20 shadow-sm transition-transform hover:scale-110',
    dropdown: isDarkMode 
      ? 'bg-slate-700 border-slate-600' 
      : 'bg-white border-gray-200'
  };

  return (
    <div className={`p-3 rounded-lg shadow-sm ${styles.container}`}>
      {/* Header with preview */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Palette className="text-purple-500" size={18} />
          <h3 className="text-sm font-medium">Theme</h3>
        </div>
        <div className="flex gap-1">
          <div 
            className="w-4 h-4 rounded-full border" 
            style={{ backgroundColor: theme.colors.primary }}
            title="Primary color"
          />
          <div 
            className="w-4 h-4 rounded-full border" 
            style={{ backgroundColor: theme.colors.background }}
            title="Background color"
          />
          <div 
            className="w-4 h-4 rounded-full border" 
            style={{ backgroundColor: theme.colors.text }}
            title="Text color"
          />
        </div>
      </div>

      {/* Color Pickers */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { key: 'primary', icon: <Droplet size={16} />, title: 'Primary' },
          { key: 'background', icon: <Monitor size={16} />, title: 'Background' },
          { key: 'text', icon: <Type size={16} />, title: 'Text' }
        ].map(({ key, icon, title }) => (
          <div key={key} className="relative">
            <button
              onClick={() => setActivePicker(activePicker === key ? null : key)}
              className={`w-full py-2 rounded-md flex flex-col items-center gap-1 ${styles.button} ${
                activePicker === key ? styles.activeButton : ''
              }`}
              aria-label={title}
            >
              <span className="text-purple-500">{icon}</span>
              <div 
                className="w-5 h-5 rounded-full border" 
                style={{ backgroundColor: theme.colors[key as keyof typeof theme.colors] }}
              />
            </button>

            {activePicker === key && (
              <div className={`absolute z-10 mt-1 p-3 rounded-lg border shadow-lg ${styles.dropdown}`}>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {colorPalettes[key as keyof typeof colorPalettes].map(color => (
                    <div
                      key={color}
                      className={`${styles.colorCircle} ${
                        theme.colors[key as keyof typeof theme.colors] === color ? 'ring-2 ring-purple-500' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        updateColors({ [key]: color });
                        setActivePicker(null);
                      }}
                      title={color}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={theme.colors[key as keyof typeof theme.colors]}
                  onChange={(e) => updateColors({ [key]: e.target.value })}
                  className="w-full h-8 cursor-pointer"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Font Selector */}
      <div className="relative mb-3">
        <button
          className={`w-full py-2 px-3 rounded-md flex items-center justify-between ${styles.button}`}
          onClick={() => setActivePicker(activePicker === 'font' ? null : 'font')}
        >
          <div className="flex items-center gap-2">
            <Type size={16} className="text-purple-500" />
            <span className="text-xs">
              {fontOptions.find(f => f.value === theme.font)?.name}
            </span>
          </div>
          <ChevronDown 
            size={16} 
            className={`transition-transform ${activePicker === 'font' ? 'rotate-180' : ''}`}
          />
        </button>
        
        {activePicker === 'font' && (
          <div className={`absolute z-10 w-full mt-1 py-1 rounded-md border shadow-lg ${styles.dropdown}`}>
            {fontOptions.map((option) => (
              <div
                key={option.value}
                className="px-3 py-2 text-xs hover:bg-purple-500/10 cursor-pointer"
                onClick={() => handleFontChange(option.value)}
                style={{ fontFamily: option.value }}
              >
                {option.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Style Selector */}
      <div className="relative mb-3">
        <button
          className={`w-full py-2 px-3 rounded-md flex items-center justify-between ${styles.button}`}
          onClick={() => setActivePicker(activePicker === 'intent' ? null : 'intent')}
        >
          <div className="flex items-center gap-2">
            <Layout size={16} className="text-purple-500" />
            <span className="text-xs capitalize">
              {theme.intent}
            </span>
          </div>
          <ChevronDown 
            size={16} 
            className={`transition-transform ${activePicker === 'intent' ? 'rotate-180' : ''}`}
          />
        </button>
        
        {activePicker === 'intent' && (
          <div className={`absolute z-10 w-full mt-1 py-1 rounded-md border shadow-lg ${styles.dropdown}`}>
            {intentOptions.map((option) => (
              <div
                key={option.value}
                className="px-3 py-2 text-xs hover:bg-purple-500/10 cursor-pointer capitalize"
                onClick={() => {
                  updateTheme({ intent: option.value });
                  setActivePicker(null);
                }}
              >
                {option.value}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Animation Speed */}
      <div className={`py-2 px-3 rounded-md flex items-center gap-3 ${styles.button}`}>
        <Zap size={16} className="text-purple-500" />
        <input
          type="range"
          min="0.02"
          max="0.2"
          step="0.01"
          value={theme.animationSpeed}
          onChange={(e) => updateTheme({ animationSpeed: parseFloat(e.target.value) })}
          className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${
            isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
          }`}
          style={{
            accentColor: isDarkMode ? '#a78bfa' : '#8b5cf6'
          }}
        />
        <span className="text-xs w-8 text-right">
          {theme.animationSpeed.toFixed(2)}s
        </span>
      </div>
    </div>
  );
};

export default ThemeSelector;