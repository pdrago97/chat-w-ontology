import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import pedroImage from "../assets/Pedro.jpg";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURES = [
  {
    iconPath: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
    titleKey: 'modal.feature.graph.title',
    descKey: 'modal.feature.graph.desc',
    gradient: 'linear-gradient(135deg, #10b981, #0d9488)',
    bgLight: 'rgba(236, 253, 245, 0.8)',
    bgDark: 'rgba(6, 78, 59, 0.15)',
  },
  {
    iconPath: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
    titleKey: 'modal.feature.chat.title',
    descKey: 'modal.feature.chat.desc',
    gradient: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
    bgLight: 'rgba(239, 246, 255, 0.8)',
    bgDark: 'rgba(30, 58, 138, 0.15)',
  },
  {
    iconPath: 'M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59',
    titleKey: 'modal.feature.explore.title',
    descKey: 'modal.feature.explore.desc',
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    bgLight: 'rgba(250, 245, 255, 0.8)',
    bgDark: 'rgba(88, 28, 135, 0.15)',
  },
  {
    iconPath: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
    titleKey: 'modal.feature.sources.title',
    descKey: 'modal.feature.sources.desc',
    gradient: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    bgLight: 'rgba(255, 251, 235, 0.8)',
    bgDark: 'rgba(120, 53, 15, 0.15)',
  },
];

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Use a small timeout instead of requestAnimationFrame to ensure DOM is ready
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      onClose();
    }
  };

  const isDark = theme === 'dark';

  const suggestions = [
    t('modal.suggestion.1'),
    t('modal.suggestion.2'),
    t('modal.suggestion.3'),
    t('modal.suggestion.4'),
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '12px',
        overflowY: 'auto',
        background: visible ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(12px)' : 'blur(0px)',
        WebkitBackdropFilter: visible ? 'blur(12px)' : 'blur(0px)',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
      }}
      onClick={handleBackdropClick}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      tabIndex={-1}
    >
      {/* Decorative orbs */}
      <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: -80,
            left: -80,
            width: 288,
            height: 288,
            borderRadius: '50%',
            opacity: isDark ? 0.1 : 0.2,
            filter: 'blur(48px)',
            background: 'radial-gradient(circle, #22c55e, transparent)',
            animation: 'orbFloat1 8s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            right: -80,
            width: 384,
            height: 384,
            borderRadius: '50%',
            opacity: isDark ? 0.1 : 0.15,
            filter: 'blur(48px)',
            background: 'radial-gradient(circle, #3b82f6, transparent)',
            animation: 'orbFloat2 10s ease-in-out infinite',
          }}
        />
      </div>

      {/* Modal card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          background: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 20,
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
            : '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.3)',
          border: `1px solid ${isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(255,255,255,0.3)'}`,
          maxHeight: '92vh',
          overflowY: 'auto',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(12px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        tabIndex={0}
      >
        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            color: isDark ? '#6b7280' : '#9ca3af',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero section */}
        <div style={{
          position: 'relative',
          padding: '32px 24px 24px',
          textAlign: 'center',
          overflow: 'hidden',
        }}>
          {/* Background gradient decoration */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: isDark
              ? 'linear-gradient(to bottom, rgba(6,78,59,0.1), transparent)'
              : 'linear-gradient(to bottom, rgba(236,253,245,0.5), transparent)',
          }} />

          <div style={{ position: 'relative' }}>
            {/* Photo with animated glow ring */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
              <div style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                overflow: 'hidden',
                boxShadow: '0 0 0 4px rgba(52, 211, 153, 0.4)',
                animation: 'pulseGlow 2s ease-in-out infinite',
              }}>
                <img
                  src={pedroImage}
                  alt="Pedro Reichow"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              {/* Status dot */}
              <span style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#10b981',
                border: `2px solid ${isDark ? '#111827' : '#ffffff'}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>

            {/* Greeting */}
            <p style={{
              fontSize: 14,
              fontWeight: 500,
              color: isDark ? '#34d399' : '#059669',
              marginBottom: 4,
              margin: '0 0 4px 0',
            }}>
              {t('modal.hero.greeting')}
            </p>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              color: isDark ? '#ffffff' : '#111827',
              margin: '0 0 4px 0',
            }}>
              {t('modal.hero.name')}
            </h2>
            <p style={{
              fontSize: 13,
              fontWeight: 500,
              color: isDark ? '#9ca3af' : '#6b7280',
              letterSpacing: '0.05em',
              textTransform: 'uppercase' as const,
              margin: 0,
            }}>
              {t('modal.hero.tagline')}
            </p>
            <p style={{
              marginTop: 12,
              fontSize: 14,
              color: isDark ? '#9ca3af' : '#4b5563',
              maxWidth: 360,
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.6,
            }}>
              {t('modal.hero.description')}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          margin: '0 24px',
          height: 1,
          background: isDark
            ? 'linear-gradient(to right, transparent, #374151, transparent)'
            : 'linear-gradient(to right, transparent, #e5e7eb, transparent)',
        }} />

        {/* Features grid */}
        <div style={{ padding: '20px 24px' }}>
          <h3 style={{
            fontSize: 11,
            fontWeight: 600,
            color: isDark ? '#6b7280' : '#9ca3af',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            marginBottom: 12,
            margin: '0 0 12px 0',
          }}>
            {t('modal.features.title')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map((feature, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: isDark ? feature.bgDark : feature.bgLight,
                  border: '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  display: 'inline-flex',
                  padding: 8,
                  borderRadius: 8,
                  background: feature.gradient,
                  color: '#ffffff',
                  marginBottom: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}>
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={feature.iconPath} />
                  </svg>
                </div>
                <h4 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isDark ? '#ffffff' : '#111827',
                  marginBottom: 2,
                  margin: '0 0 2px 0',
                }}>
                  {t(feature.titleKey)}
                </h4>
                <p style={{
                  fontSize: 12,
                  color: isDark ? '#9ca3af' : '#6b7280',
                  lineHeight: 1.5,
                  margin: 0,
                }}>
                  {t(feature.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Try asking section */}
        <div style={{ padding: '0 24px 16px' }}>
          <h3 style={{
            fontSize: 11,
            fontWeight: 600,
            color: isDark ? '#6b7280' : '#9ca3af',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            marginBottom: 8,
            margin: '0 0 8px 0',
          }}>
            {t('modal.tryAsking')}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestions.map((suggestion, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 500,
                  background: isDark ? '#1f2937' : '#f3f4f6',
                  color: isDark ? '#d1d5db' : '#4b5563',
                  border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                  cursor: 'default',
                  transition: 'all 0.2s ease',
                }}
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>

        {/* CTA section */}
        <div style={{ padding: '8px 24px 24px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: 12,
              fontWeight: 600,
              color: '#ffffff',
              fontSize: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #14b8a6, #06b6d4)',
              boxShadow: isDark
                ? '0 4px 14px rgba(16, 185, 129, 0.15)'
                : '0 4px 14px rgba(16, 185, 129, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: 'translateY(0)',
            }}
          >
            {t('modal.cta')}
          </button>

          {/* Powered by */}
          <p style={{
            marginTop: 12,
            textAlign: 'center',
            fontSize: 10,
            color: isDark ? '#4b5563' : '#9ca3af',
            letterSpacing: '0.05em',
          }}>
            {t('modal.poweredBy')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
