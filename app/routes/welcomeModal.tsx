import React from 'react';
import pedroImage from '/assets/Pedro.jpg';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Make sure we're clicking the backdrop itself
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      onClose();
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };
  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50"
      onClick={handleBackdropClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-2xl mx-4 relative text-gray-800"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        tabIndex={0}
      >
        <button 
          onClick={handleCloseClick}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        
        <div className="flex items-center gap-3 mb-4 max-h-24">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500 shadow-lg flex-shrink-0">
            <img 
              src={pedroImage} 
              alt="Pedro Reichow" 
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Welcome to Pedro Reichow's Talk-To-My-Resume!</h2>
        </div>
        
        <div className="space-y-3">
          <p className="text-gray-700">
            This is an interactive way to explore my professional background through a knowledge graph and AI-powered chat interface. Built with React and Remix.run, it features a Cytoscape.js visualization connected to a RAG-enabled chatbot powered by Portkey AI and LLMs with semantic guardrails.
          </p>
          <p className="text-gray-700 mt-2">
            The app demonstrates modern concepts like knowledge graphs for data representation, retrieval-augmented generation (RAG) for contextual AI responses, and semantic guardrails for reliable interactions.
          </p>
          <div>
            <h3 className="font-semibold mb-1 text-gray-900">How to use:</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>Explore the graph by clicking on different nodes</li>
              <li>Use the chat interface to ask questions about my experience</li>
              <li>Click over nodes to see detailed information</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1 text-gray-900">Try asking questions like:</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>What are your main technical skills?</li>
              <li>Tell me about your most recent work experience</li>
              <li>What projects have you worked on?</li>
              <li>What is your educational background?</li>
            </ul>
          </div>
          <p className="text-gray-700 mt-2">
            Feel free to ask any questions about my background, skills, or experience - the AI assistant is here to help!
          </p>
        </div>
        
        <button
          onClick={handleCloseClick}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;