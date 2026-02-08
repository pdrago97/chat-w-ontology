import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    // UI Elements
    'language.toggle': 'Português',
    'chat.placeholder': 'Ask anything about Pedro...',
    'chat.send': 'Send',
    'chat.open': 'Chat',
    'chat.close': 'Close chat',
    'graph.refresh': 'Refresh',
    'graph.loading': 'Loading graph...',
    'graph.error': 'Visualization Error',
    'graph.error.message': 'Unable to render graph. Data structure may be incompatible.',
    'welcome.title': "Hello! I'm Pedro's AI assistant",
    'welcome.subtitle': 'here to share the journey of his personal and professional life.',
    'welcome.question': 'What would you like to discover about Pedro?',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.toggle': 'Toggle theme',

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

    // Welcome Modal
    'modal.hero.greeting': 'Hey there!',
    'modal.hero.name': "I'm Pedro Reichow",
    'modal.hero.tagline': 'AI Engineer & Data Scientist',
    'modal.hero.description': 'Explore my professional journey through an interactive knowledge graph powered by AI.',
    'modal.features.title': 'What you can do',
    'modal.feature.graph.title': '3D Knowledge Graph',
    'modal.feature.graph.desc': 'Navigate through an interactive visualization of skills, experiences, and connections.',
    'modal.feature.chat.title': 'AI-Powered Chat',
    'modal.feature.chat.desc': 'Ask questions and get contextual answers about my career and expertise.',
    'modal.feature.explore.title': 'Entity Explorer',
    'modal.feature.explore.desc': 'Click nodes to discover relationships between companies, skills, and projects.',
    'modal.feature.sources.title': 'Multi-Source Data',
    'modal.feature.sources.desc': 'Switch between Cognee AI, curated data, and raw database views.',
    'modal.tryAsking': 'Try asking...',
    'modal.suggestion.1': 'What is your experience with AI/ML?',
    'modal.suggestion.2': 'Tell me about your projects',
    'modal.suggestion.3': 'What technologies do you use?',
    'modal.suggestion.4': 'How did you get into data engineering?',
    'modal.cta': "Let's explore!",
    'modal.poweredBy': 'Powered by Cognee AI + Knowledge Graphs',
  },
  pt: {
    // UI Elements
    'language.toggle': 'English',
    'chat.placeholder': 'Pergunte qualquer coisa sobre Pedro...',
    'chat.send': 'Enviar',
    'chat.open': 'Chat',
    'chat.close': 'Fechar chat',
    'graph.refresh': 'Atualizar',
    'graph.loading': 'Carregando grafo...',
    'graph.error': 'Erro de Visualização',
    'graph.error.message': 'Não foi possível renderizar o grafo. A estrutura de dados pode ser incompatível.',
    'welcome.title': 'Olá! Sou o assistente de IA do Pedro',
    'welcome.subtitle': 'aqui para compartilhar a jornada de sua vida pessoal e profissional.',
    'welcome.question': 'O que você gostaria de descobrir sobre Pedro?',
    'theme.light': 'Claro',
    'theme.dark': 'Escuro',
    'theme.toggle': 'Alternar tema',

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

    // Welcome Modal
    'modal.hero.greeting': 'E aí!',
    'modal.hero.name': 'Sou Pedro Reichow',
    'modal.hero.tagline': 'Engenheiro de IA & Cientista de Dados',
    'modal.hero.description': 'Explore minha jornada profissional através de um grafo de conhecimento interativo alimentado por IA.',
    'modal.features.title': 'O que você pode fazer',
    'modal.feature.graph.title': 'Grafo de Conhecimento 3D',
    'modal.feature.graph.desc': 'Navegue por uma visualização interativa de habilidades, experiências e conexões.',
    'modal.feature.chat.title': 'Chat com IA',
    'modal.feature.chat.desc': 'Faça perguntas e receba respostas contextuais sobre minha carreira e expertise.',
    'modal.feature.explore.title': 'Explorador de Entidades',
    'modal.feature.explore.desc': 'Clique nos nós para descobrir relações entre empresas, habilidades e projetos.',
    'modal.feature.sources.title': 'Dados Multi-Fonte',
    'modal.feature.sources.desc': 'Alterne entre Cognee AI, dados curados e visualizações do banco de dados.',
    'modal.tryAsking': 'Tente perguntar...',
    'modal.suggestion.1': 'Qual sua experiência com IA/ML?',
    'modal.suggestion.2': 'Me conte sobre seus projetos',
    'modal.suggestion.3': 'Quais tecnologias você usa?',
    'modal.suggestion.4': 'Como você entrou em engenharia de dados?',
    'modal.cta': 'Vamos explorar!',
    'modal.poweredBy': 'Alimentado por Cognee AI + Grafos de Conhecimento',
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'pt')) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('preferred-language', lang);
    setIsTranslating(true);
    setTimeout(() => setIsTranslating(false), 2000);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
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
