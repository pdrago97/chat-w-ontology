import React, { useState } from "react";
import { 
  MainContainer, 
  ChatContainer, 
  MessageList, 
  Message, 
  MessageInput 
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";

const ChatBotSidebar: React.FC = () => {
  const [messages, setMessages] = useState<{
    message: string;
    sender: "user" | "assistant";
    direction: "incoming" | "outgoing";
  }[]>([]);

  const handleSendMessage = async (message: string) => {
    // Add user message
    setMessages(prev => [...prev, {
      message,
      sender: "user",
      direction: "outgoing"
    }]);

    // Simulate AI response
    const response = await simulateLLMResponse(message);
    
    // Add AI response
    setMessages(prev => [...prev, {
      message: response,
      sender: "assistant", 
      direction: "incoming"
    }]);
  };

  const simulateLLMResponse = async (query: string): Promise<string> => {
    return `Echoing your message: ${query}`;
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
          </MessageList>
          <MessageInput 
            placeholder="Type message here" 
            onSend={handleSendMessage}
            attachButton={false}
          />
        </ChatContainer>
      </MainContainer>
    </div>
  );
};

export default ChatBotSidebar;