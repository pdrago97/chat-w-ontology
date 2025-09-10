import { useState, useCallback } from 'react';

interface ChatMessage {
  message: string;
  sender: 'user' | 'assistant';
  direction: 'outgoing' | 'incoming';
}

interface AsyncChatState {
  isLoading: boolean;
  error: string | null;
  messages: ChatMessage[];
}

interface AsyncChatResponse {
  jobId?: string;
  status: 'processing' | 'completed' | 'error';
  result?: ChatMessage;
  error?: string;
  message?: string;
}

export const useAsyncChat = (initialMessages: ChatMessage[] = []) => {
  const [state, setState] = useState<AsyncChatState>({
    isLoading: false,
    error: null,
    messages: initialMessages
  });

  const pollJobStatus = async (jobId: string): Promise<ChatMessage | null> => {
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/chat-async?jobId=${jobId}`);
        const data: AsyncChatResponse = await response.json();

        if (data.status === 'completed' && data.result) {
          return data.result;
        } else if (data.status === 'error') {
          throw new Error(data.error || 'Processing failed');
        }

        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        attempts++;
      } catch (error) {
        console.error('Polling error:', error);
        throw error;
      }
    }

    throw new Error('Request timed out. Please try again.');
  };

  const sendMessage = useCallback(async (message: string, language: string = 'en') => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    // Add user message immediately
    const userMessage: ChatMessage = {
      message,
      sender: 'user',
      direction: 'outgoing'
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage]
    }));

    try {
      // Start async processing
      const response = await fetch('/api/chat-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          language,
          history: state.messages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start processing');
      }

      const data: AsyncChatResponse = await response.json();

      if (!data.jobId) {
        throw new Error('No job ID received');
      }

      // Add processing message
      const processingMessage: ChatMessage = {
        message: data.message || '🤖 Processing your question...',
        sender: 'assistant',
        direction: 'incoming'
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, processingMessage]
      }));

      // Poll for results
      const result = await pollJobStatus(data.jobId);

      // Replace processing message with actual result
      setState(prev => ({
        ...prev,
        isLoading: false,
        messages: [
          ...prev.messages.slice(0, -1), // Remove processing message
          result // Add actual result
        ]
      }));

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        message: error instanceof Error ? error.message : 'An error occurred. Please try again.',
        sender: 'assistant',
        direction: 'incoming'
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
        messages: [
          ...prev.messages.slice(0, -1), // Remove processing message if it exists
          errorMessage
        ]
      }));
    }
  }, [state.messages]);

  const clearMessages = useCallback((newMessages: ChatMessage[] = []) => {
    setState({
      isLoading: false,
      error: null,
      messages: newMessages
    });
  }, []);

  const setInitialMessages = useCallback((messages: ChatMessage[]) => {
    setState(prev => ({
      ...prev,
      messages
    }));
  }, []);

  return {
    ...state,
    sendMessage,
    clearMessages,
    setInitialMessages
  };
};
