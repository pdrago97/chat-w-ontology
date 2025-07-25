import React, { useState } from "react";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '../contexts/LanguageContext';

interface ChatBotSidebarProps {
  graphData: any;
}

interface ChatBotSidebarProps {
  graphData: any;
}

const WELCOME_MESSAGE = {
  message: "Hello there! I'm Pedro's AI assistant, here to share the journey of his personal and professional life. Whether you're curious about his skills, experiences, or even his passions! What would you like to discover about Pedro?",
  sender: "assistant" as const,
  direction: "incoming" as const
};

const SYSTEM_PROMPT = `Basically if the information asked in present in the knowledge graph, you can use it. If the question is related to something on the graphs, check the graphs for how this apply to Pedro's performance.

You are an AI assistant for Pedro Reichow, focused exclusively on helping him find new opportunities that fully utilize his potential. Pedro is actively seeking challenging roles that allow him to apply 100% of his skills and experience.
You must only provide information about:
- Always send encouraging messages highlighting Pedro's unique qualifications and why he would be an exceptional hire
- Work experiences and responsibilities that demonstrate his capabilities
- Contact and useful Pedro's links and information 
- Educational background and continuous learning
- Technical skills and technologies used in real-world applications
- Professional achievements and measurable impacts
- Personal and contact information available in the graphs

!important 

Use only the information provided in the knowledge graph. If asked about anything outside this scope, politely redirect to professional topics.
!important: Reply in the same language as is being asked, even if its off topic keep the same language as its being asked.
`;

const ChatBotSidebar: React.FC<ChatBotSidebarProps> = ({ graphData }) => {
    const { language, t } = useLanguage();

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
    const [isCollapsed, setIsCollapsed] = useState(false);

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
          systemPrompt: SYSTEM_PROMPT,
          graphData,
          conversationHistory: messages,
          language: language // Include language preference
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        message: data.response,
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
    <div className="h-screen flex flex-col transition-all duration-300 relative" style={{ width: isCollapsed ? '3rem' : '24rem' }}>
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-4 top-4 z-10 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ArrowLeftIcon className="h-4 w-4 text-gray-600" />
        ) : (
          <ArrowRightIcon className="h-4 w-4 text-gray-600" />
        )}
      </button>      
      <div 
        className={`
          flex-1 overflow-hidden transition-all duration-300 flex flex-col
          ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-full'}
        `}
      >
        <MainContainer className="h-full sm:pb-0 pb-40">
          <ChatContainer className="h-full">
            <MessageList 
              className="!h-[calc(100vh-80px)]"
              scrollBehavior="smooth"
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
                    message: "Processing question...",
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
              className="border-t border-gray-200 bg-white"
            />
          </ChatContainer>
        </MainContainer>
      </div>
    </div>
  );
}

export default ChatBotSidebar;
