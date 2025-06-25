import React from 'react';
import { Palette } from 'lucide-react';

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
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ theme, onThemeChange }) => {
  const updateTheme = (key: string, value: string) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      if (parent === "colors" && typeof theme.colors === "object") {
        onThemeChange({
          ...theme,
          colors: {
            ...theme.colors,
            [child]: value
          }
        });
      }
    } else {
      onThemeChange({
        ...theme,
        [key]: value
      });
    }
  };

  return (
    <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 border border-red-100">
      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Palette size={20} className="text-red-600" />
        <span className="text-xl"></span>
        Theme Customization
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.colors.primary}
              onChange={(e) => updateTheme('colors.primary', e.target.value)}
              className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={theme.colors.primary}
              onChange={(e) => updateTheme('colors.primary', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.colors.background}
              onChange={(e) => updateTheme('colors.background', e.target.value)}
              className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={theme.colors.background}
              onChange={(e) => updateTheme('colors.background', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.colors.text}
              onChange={(e) => updateTheme('colors.text', e.target.value)}
              className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={theme.colors.text}
              onChange={(e) => updateTheme('colors.text', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Style
          </label>
          <select
            value={theme.font}
            onChange={(e) => updateTheme('font', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="Poppins, sans-serif">Poppins</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
            <option value="'Roboto Slab', serif">Roboto Slab</option>
          </select>
        </div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Typing Animation Speed (lower = faster)
  </label>
  <input
    type="range"
    min="0.02"
    max="0.2"
    step="0.01"
    value={theme.animationSpeed}
    onChange={(e) =>
      onThemeChange({
        ...theme,
        animationSpeed: parseFloat(e.target.value)
      })
    }
    className="w-full"
  />
  <p className="text-xs text-gray-500 mt-1">
    {theme.animationSpeed.toFixed(2)}s per character
  </p>
</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Design Intent
          </label>
          <select
            value={theme.intent}
            onChange={(e) => updateTheme('intent', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="professional">Professional</option>
            <option value="minimal">Minimal</option>
            <option value="playful">Playful</option>
            <option value="elegant">Elegant</option>
          </select>
        </div>
      </div>

      {/* Live Preview */}
      <div className="mt-6 p-4 rounded-lg border-2 border-dashed border-gray-300">
        <h5 className="text-sm font-medium text-gray-600 mb-3">Live Preview</h5>
        <div 
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: theme.colors.background,
            color: theme.colors.text,
            fontFamily: theme.font,
            borderColor: theme.colors.primary
          }}
        >
          <h6 
            className="font-semibold mb-2"
            style={{ color: theme.colors.primary }}
          >
            <span className="mr-2"><img
  src="https://i.postimg.cc/9Mhc6NJ6/chilllllllli.png"
  alt="Chilli Icon"
  className="w-6 h-6 inline-block "
/></span>
            Sample Question
          </h6>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full border-2"
              style={{ borderColor: theme.colors.primary }}
            ></div>
            <span>How satisfied are you with our service?</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;