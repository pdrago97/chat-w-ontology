import React, { useState } from "react";
import { 
  MainContainer, 
  ChatContainer, 
  MessageList, 
  Message, 
  MessageInput 
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";

interface ChatBotSidebarProps {
  graphData: any;
}

const WELCOME_MESSAGE = {
  message: "Hi! I'm Pedro's AI assistant. I'm here to answer any questions regarding Pedro's professional capabilities, experiences and skills.",
  sender: "assistant" as const,
  direction: "incoming" as const
};

const SYSTEM_PROMPT = `You are an AI assistant for Pedro Reichow. Your purpose is to help answer questions about Pedro's professional experience, skills, and capabilities.
You should use the provided knowledge graph data to ensure accurate responses about:
- Work experiences and responsibilities
- Educational background
- Technical skills and technologies used
- Professional achievements

Only make statements that can be supported by the information in the knowledge graph. If asked about something outside of this scope, politely explain that you can only provide information about Pedro's professional background.`;

const ChatBotSidebar: React.FC<ChatBotSidebarProps> = ({ graphData }) => {
  const [messages, setMessages] = useState<{
    message: string;
    sender: "user" | "assistant";
    direction: "incoming" | "outgoing";
  }[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setMessages(prev => [...prev, {
      message,
      sender: "user",
      direction: "outgoing"
    }]);

    try {
      const response = await generateAIResponse(message, graphData);
      
      setMessages(prev => [...prev, {
        message: response,
        sender: "assistant",
        direction: "incoming"
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        message: "I apologize, but I encountered an error processing your request. Please try again.",
        sender: "assistant",
        direction: "incoming"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = async (userMessage: string, graphData: any): Promise<string> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          systemPrompt: SYSTEM_PROMPT,
          graphData: graphData,
          conversationHistory: messages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  };

  return (
    <div className="h-full">
      <MainContainer>
        <ChatContainer>
          <MessageList>
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
                  message: "Thinking...",
                  sender: "assistant",
                  direction: "incoming",
                  position: "single"
                }}
              />
            )}
          </MessageList>
          <MessageInput 
            placeholder="Ask me anything about Pedro's professional background..." 
            onSend={handleSendMessage}
            attachButton={false}
            disabled={isLoading}
          />
        </ChatContainer>
      </MainContainer>
    </div>
  );
};

export default ChatBotSidebar;