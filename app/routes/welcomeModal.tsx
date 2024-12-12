import React from 'react';
import pedroImage from '/assets/Pedro.jpg';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto"
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
        className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-xl mx-auto relative text-gray-800 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        tabIndex={0}
      >
        <button 
          onClick={handleCloseClick}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 p-2 z-10"
        >
          ✕
        </button>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 max-h-24">
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-full overflow-hidden border-2 border-blue-500 shadow-lg">
            <img 
              src={pedroImage} 
              alt="Pedro Reichow" 
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight flex-1 overflow-wrap-break-word pr-8">
            Welcome to Pedro Reichow&apos;s Talk-To-My-Resume!
          </h2>
        </div>
        
        <div className="space-y-4 text-sm sm:text-base mt-14">
          <p className="text-gray-700 leading-relaxed">
            This is an interactive way to explore my professional background through a knowledge graph and AI-powered chat interface. Built with RemixJS (an evolution of NextJS adopted by ChatGPT) for server-side rendering and routing, this app features Retrieval Augmented Generation (RAG) capabilities that combine a structured knowledge base with AI to provide accurate responses. It uses Portkey AI for LLM routing, gateway and guardrails to ensure high-quality interactions. The visualization is powered by Cytoscape.js for interactive graph exploration, while TailwindCSS provides responsive styling. The system leverages vector embeddings and semantic search to match user queries with relevant information from my professional background, enabling natural conversations grounded in factual data.
          </p>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">How to use:</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Explore the graph by clicking on different nodes</li>
              <li>Use the chat interface to ask questions about my experience</li>
              <li>Click over nodes to see detailed information</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Try asking questions like:</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>What are your main technical skills?</li>
              <li>Tell me about your most recent work experience</li>
              <li>What projects have you worked on?</li>
            </ul>
          </div>
        </div>
        
        <button
          onClick={handleCloseClick}
          className="mt-6 w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;