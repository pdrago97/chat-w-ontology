import React, { useState } from "react";

const ChatBotSidebar: React.FC = () => {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);

  const handleSendMessage = async (message: string) => {
    setMessages([...messages, { role: "user", content: message }]);

    // Simulate LLM response
    const response = await simulateLLMResponse(message);
    setMessages([...messages, { role: "assistant", content: response }]);
  };

  const simulateLLMResponse = async (query: string): Promise<string> => {
    // In a real scenario, you'd make an API call to your LLM service here.
    // For demonstration, we'll just return a static response.
    return `Echoing your message: ${query}`;
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-4">Chat with LLM</h2>
      <div className="space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`p-2 rounded ${msg.role === "user" ? "bg-blue-100" : "bg-gray-100"}`}>
            <strong>{msg.role === "user" ? "User" : "LLM"}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const message = formData.get("message")?.toString() || "";
          handleSendMessage(message);
          e.target.reset();
        }}
        className="mt-4"
      >
        <input type="text" name="message" placeholder="Type your message..." className="w-full p-2 rounded" required />
        <button type="submit" className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBotSidebar;