import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import GraphComponent from "../components/GraphComponent";
import ChatBotSidebar from "../components/ChatBotSidebar";
import LanguageToggle from "../components/LanguageToggle";
import { LanguageProvider } from "../contexts/LanguageContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import WelcomeModal from "./welcomeModal";


export const loader: LoaderFunction = async ({ request }) => {
  try {
    // Always load from local static JSON file (comprehensive knowledge graph)
    const [{ default: fs }, { default: path }] = await Promise.all([
      import("fs/promises"),
      import("path"),
    ]);
    const filePath = path.join(process.cwd(), "public", "knowledge-graph.json");
    const fileContents = await fs.readFile(filePath, "utf-8");
    const graphData = JSON.parse(fileContents);
    return json(graphData);
  } catch (error) {
    console.error("Error loading graph data:", error);
    throw new Response("Error loading graph data", { status: 500 });
  }
};

// Theme toggle button
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '1px solid',
        borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
        background: theme === 'dark' ? 'rgba(31,41,55,0.9)' : 'rgba(255,255,255,0.9)',
        color: theme === 'dark' ? '#d1d5db' : '#4b5563',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        flexShrink: 0,
      }}
      title={t('theme.toggle')}
    >
      {theme === 'dark' ? (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      ) : (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      )}
    </button>
  );
}

function IndexContent() {
  const initialGraphData = useLoaderData();
  const [graphData, setGraphData] = useState(initialGraphData);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const { t } = useLanguage();
  const { theme } = useTheme();

  const handleGraphUpdate = (newGraphData: any) => {
    setGraphData(newGraphData);
  };

  if (!graphData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: theme === 'dark' ? '#030712' : '#f8fafc' }}>
        <span style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 14 }}>Loading...</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      width: '100%',
      background: theme === 'dark' ? '#030712' : '#f8fafc',
      transition: 'background 0.3s ease',
      overflow: 'hidden',
    }}>
      {/* ── Top toolbar ── */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10003,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: theme === 'dark' ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}>
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* ── Main content area ── */}
      <div style={{
        display: 'flex',
        flex: 1,
        paddingTop: 52,
        overflow: 'hidden',
        height: 'calc(100dvh - 52px)',
      }}>
        {/* Graph area */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <GraphComponent graphData={graphData} onGraphUpdate={handleGraphUpdate} />
          </div>
        </div>

        {/* Desktop chat sidebar - hidden below 1024px */}
        <div className="hidden lg:flex" style={{
          position: 'relative',
          height: '100%',
          flexDirection: 'column',
          width: '26rem',
          borderLeft: `1px solid ${theme === 'dark' ? '#1f2937' : '#e5e7eb'}`,
          background: theme === 'dark' ? '#111827' : '#ffffff',
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatBotSidebar graphData={graphData} />
          </div>
        </div>
      </div>

      {/* ── Mobile chat FAB ── */}
      <button
        onClick={() => setIsMobileChatOpen(true)}
        className="lg:hidden"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 10002,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981, #14b8a6)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
          display: isMobileChatOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        title={t('chat.open')}
      >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      </button>

      {/* ── Mobile chat drawer ── */}
      {isMobileChatOpen && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 10004 }}>
          {/* Backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setIsMobileChatOpen(false)}
          />
          {/* Drawer */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '85vh',
            maxHeight: '85vh',
            background: theme === 'dark' ? '#111827' : '#ffffff',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            boxShadow: '0 -8px 30px rgba(0,0,0,0.3)',
            borderTop: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInFromBottom 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
          }}>
            {/* Handle + close */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: `1px solid ${theme === 'dark' ? '#1f2937' : '#f3f4f6'}`,
            }}>
              <div style={{ width: 32, height: 4, borderRadius: 4, background: theme === 'dark' ? '#4b5563' : '#d1d5db' }} />
              <button
                onClick={() => setIsMobileChatOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  cursor: 'pointer',
                }}
                title={t('chat.close')}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ChatBotSidebar graphData={graphData} />
            </div>
          </div>
        </div>
      )}

      {/* ── Welcome modal ── */}
      <WelcomeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default function Index() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <IndexContent />
      </ThemeProvider>
    </LanguageProvider>
  );
}
