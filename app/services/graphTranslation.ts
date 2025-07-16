import type { Language } from '../contexts/LanguageContext';

// Translation mappings for graph content
const graphTranslations = {
  // Node types
  nodeTypes: {
    en: {
      'Person': 'Person',
      'Experience': 'Experience', 
      'Education': 'Education',
      'Skills': 'Skills',
      'Project': 'Project',
      'Certification': 'Certification',
      'Company': 'Company',
      'University': 'University',
      'Technology': 'Technology'
    },
    pt: {
      'Person': 'Pessoa',
      'Experience': 'Experiência',
      'Education': 'Educação', 
      'Skills': 'Habilidades',
      'Project': 'Projeto',
      'Certification': 'Certificação',
      'Company': 'Empresa',
      'University': 'Universidade',
      'Technology': 'Tecnologia'
    }
  },

  // Relations
  relations: {
    en: {
      'WORKED_AT': 'Worked at',
      'STUDIED_AT': 'Studied at',
      'HAS_SKILL': 'Has skill',
      'CERTIFIED': 'Certified',
      'CREATED': 'Created',
      'CONTRIBUTED_TO': 'Contributed to',
      'HOLD_CERTIFICATION': 'Holds certification',
      'USED_SKILLS': 'Used skills',
      'HOSTED_PROJECT': 'Hosted project',
      'DEVELOPED': 'Developed',
      'BUILT': 'Built',
      'DESIGNED': 'Designed'
    },
    pt: {
      'WORKED_AT': 'Trabalhou em',
      'STUDIED_AT': 'Estudou em',
      'HAS_SKILL': 'Tem habilidade',
      'CERTIFIED': 'Certificado',
      'CREATED': 'Criou',
      'CONTRIBUTED_TO': 'Contribuiu para',
      'HOLD_CERTIFICATION': 'Possui certificação',
      'USED_SKILLS': 'Usou habilidades',
      'HOSTED_PROJECT': 'Hospedou projeto',
      'DEVELOPED': 'Desenvolveu',
      'BUILT': 'Construiu',
      'DESIGNED': 'Projetou'
    }
  },

  // Specific content translations
  content: {
    en: {
      // Names (keep original)
      'Pedro Reichow': 'Pedro Reichow',
      'Pedro Drago Reichow': 'Pedro Drago Reichow',
      'QI Tech': 'QI Tech',
      'MoveUp AI': 'MoveUp AI',
      'Trinnix AI Lab': 'Trinnix AI Lab',
      'Universidade Federal do Rio Grande do Sul': 'Federal University of Rio Grande do Sul',
      'Simulated Reality': 'Simulated Reality',
      'PecSmart': 'PecSmart',

      // Skills & Technologies
      'Data Engineering': 'Data Engineering',
      'Cloud Technologies': 'Cloud Technologies',
      'Software Development': 'Software Development',
      'AI/ML': 'AI/ML',
      'AWS Solutions Architect': 'AWS Solutions Architect',
      'Computer Vision Solutions': 'Computer Vision Solutions',
      'AI-Powered Solutions': 'AI-Powered Solutions',
      'Data Engineering Skills': 'Data Engineering Skills',
      'AI/ML Skills': 'AI/ML Skills',
      'Software Development Skills': 'Software Development Skills',
      'AI Integration Skills': 'AI Integration Skills',
      'AWS Certification': 'AWS Certification',
      'Education': 'Education',

      // Projects
      'MoveUp AI Platform': 'MoveUp AI Platform',
      'IoT Cattle Monitoring System': 'IoT Cattle Monitoring System',
      'AI-Powered Workforce Intelligence': 'AI-Powered Workforce Intelligence',

      // Positions
      'Founding Engineer': 'Founding Engineer',
      'Lead Developer': 'Lead Developer',
      'Solutions Architect': 'Solutions Architect'
    },
    pt: {
      // Names (translate where appropriate)
      'Pedro Reichow': 'Pedro Reichow',
      'Pedro Drago Reichow': 'Pedro Drago Reichow',
      'QI Tech': 'QI Tech',
      'MoveUp AI': 'MoveUp AI',
      'Trinnix AI Lab': 'Trinnix AI Lab',
      'Federal University of Rio Grande do Sul': 'Universidade Federal do Rio Grande do Sul',
      'Universidade Federal do Rio Grande do Sul': 'Universidade Federal do Rio Grande do Sul',
      'Simulated Reality': 'Realidade Simulada',
      'PecSmart': 'PecSmart',

      // Skills & Technologies
      'Data Engineering': 'Engenharia de Dados',
      'Cloud Technologies': 'Tecnologias em Nuvem',
      'Software Development': 'Desenvolvimento de Software',
      'AI/ML': 'IA/ML',
      'AWS Solutions Architect': 'Arquiteto de Soluções AWS',
      'Computer Vision Solutions': 'Soluções de Visão Computacional',
      'AI-Powered Solutions': 'Soluções Baseadas em IA',
      'Data Engineering Skills': 'Habilidades em Engenharia de Dados',
      'AI/ML Skills': 'Habilidades em IA/ML',
      'Software Development Skills': 'Habilidades em Desenvolvimento de Software',
      'AI Integration Skills': 'Habilidades de Integração de IA',
      'AWS Certification': 'Certificação AWS',
      'Education': 'Educação',

      // Projects
      'MoveUp AI Platform': 'Plataforma MoveUp AI',
      'IoT Cattle Monitoring System': 'Sistema de Monitoramento de Gado IoT',
      'AI-Powered Workforce Intelligence': 'Inteligência de Força de Trabalho Baseada em IA',

      // Positions
      'Founding Engineer': 'Engenheiro Fundador',
      'Lead Developer': 'Desenvolvedor Líder',
      'Solutions Architect': 'Arquiteto de Soluções'
    }
  }
};

export function translateGraphData(graphData: any, targetLanguage: Language): any {
  if (!graphData) return graphData;

  try {
    const translated = JSON.parse(JSON.stringify(graphData)); // Deep clone

    // Create ID mapping to maintain edge consistency
    const idMapping = new Map<string, string>();

  // Translate nodes (but keep original IDs for edge consistency)
  if (translated.nodes) {
    translated.nodes = translated.nodes.map((node: any) => {
      const translatedNode = { ...node };

      // Keep original ID but create display label
      const originalId = node.id;
      let displayLabel = originalId;

      // Translate display content but keep ID unchanged
      if (node.id && graphTranslations.content[targetLanguage][node.id]) {
        displayLabel = graphTranslations.content[targetLanguage][node.id];
      } else if (node.label && graphTranslations.content[targetLanguage][node.label]) {
        displayLabel = graphTranslations.content[targetLanguage][node.label];
      } else {
        // Fallback: use original label or ID
        displayLabel = node.label || node.id;
      }

      // Set label for display (this is what Cytoscape will show)
      translatedNode.label = displayLabel;

      // Keep original type unchanged for CSS styling
      // Don't translate node types as they're used for Cytoscape CSS classes

      // Translate title if exists
      if (node.title && graphTranslations.content[targetLanguage][node.title]) {
        translatedNode.title = graphTranslations.content[targetLanguage][node.title];
      }

      // Store mapping for potential future use
      idMapping.set(originalId, displayLabel);

      return translatedNode;
    });
  }

  // Translate edges (keep original source/target IDs, translate relations only)
  if (translated.edges) {
    translated.edges = translated.edges.map((edge: any) => {
      const translatedEdge = { ...edge };

      // Keep original source/target IDs unchanged for consistency
      // Only translate the relation/label for display
      if (edge.relation && graphTranslations.relations[targetLanguage][edge.relation]) {
        translatedEdge.relation = graphTranslations.relations[targetLanguage][edge.relation];
      }

      // Translate label if exists
      if (edge.label && graphTranslations.relations[targetLanguage][edge.label]) {
        translatedEdge.label = graphTranslations.relations[targetLanguage][edge.label];
      }

      return translatedEdge;
    });
  }

  return translated;

  } catch (error) {
    console.error('Translation error:', error);
    // Return original data if translation fails
    return graphData;
  }
}

export function getLanguageFlag(language: Language): string {
  return language === 'en' ? '🇺🇸' : '🇧🇷';
}

export function getLanguageName(language: Language): string {
  return language === 'en' ? 'English' : 'Português';
}
