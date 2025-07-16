import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionaries
const translations = {
  en: {
    // UI Elements
    'language.toggle': 'Português',
    'chat.placeholder': 'Ask anything about Pedro...',
    'chat.send': 'Send',
    'graph.refresh': 'Refresh',
    'graph.loading': 'Loading graph...',
    'graph.error': 'Visualization Error',
    'graph.error.message': 'Unable to render graph. Data structure may be incompatible.',
    'welcome.title': "Hello! I'm Pedro's AI assistant",
    'welcome.subtitle': 'here to share the journey of his personal and professional life.',
    'welcome.question': 'What would you like to discover about Pedro?',
    
    // Graph Node Types
    'node.person': 'Person',
    'node.experience': 'Experience',
    'node.education': 'Education',
    'node.skills': 'Skills',
    'node.project': 'Project',
    'node.certification': 'Certification',
    
    // Common Relations
    'relation.worked_at': 'Worked at',
    'relation.studied_at': 'Studied at',
    'relation.has_skill': 'Has skill',
    'relation.certified': 'Certified',
    'relation.created': 'Created',
    'relation.contributed_to': 'Contributed to',
  },
  pt: {
    // UI Elements
    'language.toggle': 'English',
    'chat.placeholder': 'Pergunte qualquer coisa sobre Pedro...',
    'chat.send': 'Enviar',
    'graph.refresh': 'Atualizar',
    'graph.loading': 'Carregando grafo...',
    'graph.error': 'Erro de Visualização',
    'graph.error.message': 'Não foi possível renderizar o grafo. A estrutura de dados pode ser incompatível.',
    'welcome.title': 'Olá! Sou o assistente de IA do Pedro',
    'welcome.subtitle': 'aqui para compartilhar a jornada de sua vida pessoal e profissional.',
    'welcome.question': 'O que você gostaria de descobrir sobre Pedro?',
    
    // Graph Node Types
    'node.person': 'Pessoa',
    'node.experience': 'Experiência',
    'node.education': 'Educação',
    'node.skills': 'Habilidades',
    'node.project': 'Projeto',
    'node.certification': 'Certificação',
    
    // Common Relations
    'relation.worked_at': 'Trabalhou em',
    'relation.studied_at': 'Estudou em',
    'relation.has_skill': 'Tem habilidade',
    'relation.certified': 'Certificado',
    'relation.created': 'Criou',
    'relation.contributed_to': 'Contribuiu para',
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [isTranslating, setIsTranslating] = useState(false);

  // Load language preference from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'pt')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language preference
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('preferred-language', lang);
    
    // Trigger graph translation
    setIsTranslating(true);
    setTimeout(() => setIsTranslating(false), 2000); // Reset after 2 seconds
  };

  // Translation function
  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage: handleSetLanguage,
      t,
      isTranslating
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
