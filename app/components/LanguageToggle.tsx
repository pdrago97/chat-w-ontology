import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getLanguageFlag, getLanguageName } from '../services/graphTranslation';

const LanguageToggle: React.FC = () => {
  const { language, setLanguage, isTranslating } = useLanguage();

  // Add spinner animation styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'pt' : 'en';
    setLanguage(newLanguage);
  };

  const currentFlag = getLanguageFlag(language);
  const targetLanguage = language === 'en' ? 'pt' : 'en';
  const targetFlag = getLanguageFlag(targetLanguage);
  const targetName = getLanguageName(targetLanguage);

  return (
    <button
      onClick={toggleLanguage}
      disabled={isTranslating}
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        padding: '8px 16px',
        backgroundColor: isTranslating ? '#fef3c7' : '#ffffff',
        color: isTranslating ? '#92400e' : '#374151',
        border: isTranslating ? '2px solid #fcd34d' : '2px solid #d1d5db',
        borderRadius: '4px',
        cursor: isTranslating ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: 'normal',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: 'auto',
        minHeight: '36px',
        transition: 'all 0.2s ease'
      }}
      title={isTranslating ? 'Translating...' : `Switch to ${targetName}`}
      onMouseEnter={(e) => {
        if (!isTranslating) {
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.backgroundColor = '#eff6ff';
        }
      }}
      onMouseLeave={(e) => {
        if (!isTranslating) {
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.backgroundColor = '#ffffff';
        }
      }}
    >
      {isTranslating ? (
        <>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #f59e0b',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            Translating...
          </span>
        </>
      ) : (
        <>
          <span style={{ fontSize: '18px' }}>{currentFlag}</span>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            {targetFlag} {targetName}
          </span>
        </>
      )}
    </button>
  );
};

export default LanguageToggle;
