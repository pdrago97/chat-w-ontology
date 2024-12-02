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

interface ChatBotSidebarProps {
  graphData: any;
}

interface ChatBotSidebarProps {
  graphData: any;
}

const WELCOME_MESSAGE = {
  message: "Hi! I'm Pedro's AI assistant. I can help you learn about his professional experience, skills, and achievements. What would you like to know?",
  sender: "assistant" as const,
  direction: "incoming" as const
};

const SYSTEM_PROMPT = `You are an AI assistant for Pedro Reichow, focused exclusively on his professional background.
You must only provide information about:
- Work experiences and responsibilities
- Educational background
- Technical skills and technologies used
- Professional achievements

Use only the information provided in the knowledge graph. If asked about anything outside this scope, politely redirect to professional topics.
!important: Reply in the same language as is being asked, even if its off topic keep the same language as its being asked.
`;

const ChatBotSidebar: React.FC<ChatBotSidebarProps> = ({ graphData }) => {
    const [messages, setMessages] = useState<{
      message: string;
      sender: "user" | "assistant";
      direction: "incoming" | "outgoing";
    }[]>([WELCOME_MESSAGE]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

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
          conversationHistory: messages
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
        message: "I apologize, but I encountered an error. Please try asking about Pedro's professional background again.",
        sender: "assistant",
        direction: "incoming"
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className={`h-full flex flex-col transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-96'}`}>
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
          flex-1 overflow-hidden transition-all duration-300
          ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-full'}
        `}
      >
        <div className="h-full flex flex-col">
          <MainContainer className="h-full">
            <ChatContainer className="h-full">
              <MessageList className="h-full overflow-y-auto">
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
                      message: "Analyzing your question about Pedro's professional background...",
                      sender: "assistant",
                      direction: "incoming",
                      position: "single"
                    }}
                  />
                )}
              </MessageList>
              <MessageInput 
                placeholder="Ask about Pedro's professional experience..." 
                onSend={handleSendMessage}
                attachButton={false}
                disabled={isLoading}
                style={{ maxHeight: '100vh' }}
                className="sticky bottom-0"
              />
            </ChatContainer>
          </MainContainer>
        </div>
      </div>
    </div>
  );
};

export default ChatBotSidebar;