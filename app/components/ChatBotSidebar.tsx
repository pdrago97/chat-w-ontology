import React, { useState } from "react";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";

import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface ChatBotSidebarProps {
  graphData: any;
}

const ChatBotSidebar: React.FC<ChatBotSidebarProps> = ({ graphData }) => {
    const { language, t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Dynamic welcome message based on language
    const getWelcomeMessage = () => ({
      message: `${t('welcome.title')}, ${t('welcome.subtitle')} ${t('welcome.question')}`,
      sender: "assistant" as const,
      direction: "incoming" as const
    });

    const [messages, setMessages] = useState<{
      message: string;
      sender: "user" | "assistant";
      direction: "incoming" | "outgoing";
    }[]>([getWelcomeMessage()]);
    const [isLoading, setIsLoading] = useState(false);

    // Update welcome message when language changes
    React.useEffect(() => {
      setMessages([getWelcomeMessage()]);
    }, [language]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = {
      message,
      sender: "user" as const,
      direction: "outgoing" as const
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          language,
          history: messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.message }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        message: data.response || data.message,
        sender: "assistant",
        direction: "incoming"
      }]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      setMessages(prev => [...prev, {
        message: "I apologize, but I encountered an error. Something is wrong with the application, please inform Pedro via linkedIn https://www.linkedin.com/in/pedroreichow.",
        sender: "assistant",
        direction: "incoming"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: isDark ? '#111827' : '#ffffff',
      transition: 'background 0.3s ease',
    }}>
      {/* Messages area - takes remaining space */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <MainContainer style={{
          height: '100%',
          border: 'none',
          background: 'transparent',
        }}>
          <ChatContainer style={{
            height: '100%',
            background: 'transparent',
          }}>
            <MessageList
              scrollBehavior="smooth"
              style={{
                background: 'transparent',
              }}
            >
              {messages.map((msg, idx) => (
                <Message
                  key={idx}
                  model={{
                    message: msg.message,
                    sentTime: "just now",
                    sender: msg.sender,
                    direction: msg.direction,
                    position: "single"
                  }}
                />
              ))}
              {isLoading && (
                <Message
                  model={{
                    message: "🤖 Processing your question about Pedro...",
                    sender: "assistant",
                    direction: "incoming",
                    position: "single"
                  }}
                />
              )}
            </MessageList>
            <MessageInput
              placeholder={t('chat.placeholder')}
              onSend={handleSendMessage}
              attachButton={false}
              disabled={isLoading}
              style={{
                borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                background: isDark ? '#1e293b' : '#ffffff',
                flexShrink: 0,
              }}
            />
          </ChatContainer>
        </MainContainer>
      </div>
    </div>
  );
}

export default ChatBotSidebar;
