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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto"
      style={{ zIndex: 99999 }}
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
        style={{ zIndex: 100000 }}
      >
        <button
          onClick={handleCloseClick}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 p-2"
          style={{ zIndex: 100001 }}
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
            <strong>Advanced AI-Powered Knowledge Graph Platform</strong> featuring a sophisticated 3D visualization of my professional journey. This system demonstrates cutting-edge engineering with <strong>Cognee AI</strong> for automated knowledge extraction, generating 626+ interconnected entities and 1000+ relationships from unstructured resume data.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 my-4">
            <h4 className="font-semibold text-blue-900 mb-2">🚀 Technical Architecture Highlights:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>AI Knowledge Extraction:</strong> Cognee AI processes documents into rich entity-relationship networks</li>
              <li><strong>3D Force-Directed Visualization:</strong> Interactive graph with physics-based node positioning</li>
              <li><strong>Supabase Integration:</strong> Cloud-native database with real-time data synchronization</li>
              <li><strong>Remix Full-Stack:</strong> Server-side rendering with optimized data loading</li>
              <li><strong>Multi-Source Architecture:</strong> Dynamic switching between curated, raw, and AI-generated data</li>
            </ul>
          </div>

          <p className="text-gray-700 leading-relaxed text-sm">
            The platform showcases modern data engineering principles with <strong>RAG capabilities</strong>, <strong>vector embeddings</strong>, and <strong>semantic search</strong> for intelligent conversations. Built with production-grade infrastructure including <strong>Vercel deployment</strong>, <strong>environment-based configurations</strong>, and <strong>TypeScript</strong> for type safety.
          </p>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">🎯 Interactive Features:</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li><strong>3D Navigation:</strong> Pan, zoom, and rotate through the knowledge graph in real-time</li>
              <li><strong>AI-Powered Chat:</strong> Ask questions and get contextual responses from the knowledge base</li>
              <li><strong>Entity Exploration:</strong> Click nodes to discover relationships between companies, skills, and projects</li>
              <li><strong>Source Switching:</strong> Toggle between Cognee AI, curated data, and raw Supabase views</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">💬 Try Advanced Queries:</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>"How did you implement microservices architecture at MoveUp AI?"</li>
              <li>"What's your experience with AI/ML model deployment and LLMOps?"</li>
              <li>"Explain your data engineering pipeline architecture using Spark and Airflow"</li>
              <li>"How do you approach scalable cloud infrastructure design?"</li>
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