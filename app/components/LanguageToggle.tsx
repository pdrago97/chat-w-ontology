import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const LanguageToggle: React.FC = () => {
  const { language, setLanguage, isTranslating } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'pt' : 'en');
  };

  return (
    <button
      onClick={toggleLanguage}
      disabled={isTranslating}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        height: 36,
        borderRadius: 9999,
        paddingLeft: 4,
        paddingRight: 4,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        border: '1px solid',
        borderColor: isTranslating
          ? (isDark ? '#92400e' : '#fcd34d')
          : (isDark ? '#4b5563' : '#d1d5db'),
        background: isTranslating
          ? (isDark ? 'rgba(120, 53, 15, 0.3)' : '#fffbeb')
          : (isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)'),
        backdropFilter: 'blur(8px)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        cursor: isTranslating ? 'wait' : 'pointer',
        flexShrink: 0,
      }}
      title={isTranslating ? 'Translating...' : 'Switch language'}
    >
      {/* Sliding indicator */}
      <span
        style={{
          position: 'absolute',
          top: 4,
          height: 28,
          borderRadius: 9999,
          background: isDark
            ? 'linear-gradient(to right, #2563eb, #1d4ed8)'
            : 'linear-gradient(to right, #3b82f6, #2563eb)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          transition: 'all 0.3s ease',
          left: language === 'en' ? 4 : 60,
          width: language === 'en' ? 56 : 52,
        }}
      />

      {/* EN option */}
      <span
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 600,
          transition: 'color 0.3s ease',
          color: language === 'en' ? '#ffffff' : (isDark ? '#9ca3af' : '#6b7280'),
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>🇺🇸</span>
        EN
      </span>

      {/* PT option */}
      <span
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 600,
          transition: 'color 0.3s ease',
          color: language === 'pt' ? '#ffffff' : (isDark ? '#9ca3af' : '#6b7280'),
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>🇧🇷</span>
        PT
      </span>

      {/* Loading spinner overlay */}
      {isTranslating && (
        <span style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 9999,
          background: isDark ? 'rgba(120, 53, 15, 0.5)' : 'rgba(255, 251, 235, 0.8)',
        }}>
          <span style={{
            width: 16,
            height: 16,
            border: '2px solid #fbbf24',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </span>
      )}
    </button>
  );
};

export default LanguageToggle;
