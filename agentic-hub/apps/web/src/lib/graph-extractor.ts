/**
 * Graph Extractor Service
 * Extracts entities and relationships from text/files using Google Gemini AI
 * Builds knowledge graphs from documents
 */

export interface ExtractedEntity {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface ExtractedRelation {
  source: string;
  target: string;
  type: string;
  label: string;
  weight: number;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
  metadata: {
    source: string;
    extractedAt: string;
    entityCount: number;
    relationCount: number;
  };
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

function generateId(): string {
  return `e_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface GeminiEntity {
  name: string;
  type: string;
  description?: string;
}

interface GeminiRelation {
  source: string;
  target: string;
  relation_type: string;
  description?: string;
}

interface GeminiExtractionResponse {
  entities: GeminiEntity[];
  relations: GeminiRelation[];
}

/**
 * Upload a file to Gemini File API and get the file URI
 */
async function uploadFileToGemini(buffer: Buffer, mimeType: string, fileName: string): Promise<string | null> {
  try {
    // Step 1: Start resumable upload
    const startResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': buffer.length.toString(),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: {
            display_name: fileName,
          },
        }),
      }
    );

    const uploadUrl = startResponse.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) {
      console.error('Failed to get upload URL');
      return null;
    }

    // Step 2: Upload the file bytes
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': buffer.length.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      console.error('File upload failed:', await uploadResponse.text());
      return null;
    }

    const fileInfo = await uploadResponse.json();
    return fileInfo.file?.uri || null;
  } catch (error) {
    console.error('Error uploading file to Gemini:', error);
    return null;
  }
}

/**
 * Extract entities and relations using Google Gemini AI
 */
async function extractWithGemini(text: string, documentTitle: string): Promise<GeminiExtractionResponse> {
  const prompt = `Você é um especialista em extração de conhecimento. Analise o seguinte documento e extraia:

1. **Entidades**: Identifique todas as entidades importantes como:
   - PERSON: Pessoas mencionadas
   - ORGANIZATION: Empresas, instituições, organizações
   - SKILL: Habilidades técnicas e soft skills
   - TECHNOLOGY: Tecnologias, frameworks, linguagens de programação
   - CONCEPT: Conceitos importantes
   - LOCATION: Locais, cidades, países
   - PROJECT: Projetos mencionados
   - EDUCATION: Formações, cursos, certificações
   - ROLE: Cargos e funções profissionais

2. **Relações**: Identifique como as entidades se relacionam:
   - HAS_SKILL: Pessoa possui habilidade
   - WORKS_AT: Pessoa trabalha em organização
   - STUDIED_AT: Pessoa estudou em instituição
   - USES: Entidade usa tecnologia
   - LOCATED_IN: Entidade está localizada em
   - PART_OF: Entidade faz parte de
   - RELATED_TO: Relação genérica
   - WORKED_ON: Pessoa trabalhou em projeto
   - KNOWS: Pessoa conhece conceito/tecnologia

**Documento (${documentTitle}):**
${text.substring(0, 15000)}

**Responda APENAS com um JSON válido** no seguinte formato (sem markdown, sem explicações):
{
  "entities": [
    {"name": "Nome da Entidade", "type": "TIPO", "description": "Breve descrição opcional"}
  ],
  "relations": [
    {"source": "Nome Entidade Origem", "target": "Nome Entidade Destino", "relation_type": "TIPO_RELACAO", "description": "Descrição opcional"}
  ]
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean up the response - remove markdown code blocks if present
    let jsonStr = textContent.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr) as GeminiExtractionResponse;
    return parsed;
  } catch (error) {
    console.error('Error extracting with Gemini:', error);
    // Return empty result on error
    return { entities: [], relations: [] };
  }
}

/**
 * Main extraction function - processes text and returns graph data
 * Uses Gemini AI for intelligent entity and relation extraction
 */
export async function extractGraphFromText(
  text: string,
  source: string = 'document'
): Promise<ExtractionResult> {
  // Check if Gemini API key is available
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set, returning empty extraction');
    return {
      entities: [],
      relations: [],
      metadata: {
        source,
        extractedAt: new Date().toISOString(),
        entityCount: 0,
        relationCount: 0,
      },
    };
  }

  // Use Gemini for extraction
  const geminiResult = await extractWithGemini(text, source);

  // Create entity ID map for relation mapping
  const entityIdMap = new Map<string, string>();

  // Convert Gemini entities to our format
  const entities: ExtractedEntity[] = geminiResult.entities.map((e) => {
    const id = generateId();
    entityIdMap.set(e.name.toLowerCase(), id);
    return {
      id,
      type: e.type,
      label: e.name,
      properties: {
        description: e.description || '',
      },
    };
  });

  // Convert Gemini relations to our format
  const relations: ExtractedRelation[] = geminiResult.relations
    .map((r) => {
      const sourceId = entityIdMap.get(r.source.toLowerCase());
      const targetId = entityIdMap.get(r.target.toLowerCase());

      if (!sourceId || !targetId) {
        return null;
      }

      return {
        source: sourceId,
        target: targetId,
        type: r.relation_type,
        label: r.description || r.relation_type.toLowerCase().replace(/_/g, ' '),
        weight: 1.0,
      };
    })
    .filter((r): r is ExtractedRelation => r !== null);

  return {
    entities,
    relations,
    metadata: {
      source,
      extractedAt: new Date().toISOString(),
      entityCount: entities.length,
      relationCount: relations.length,
    },
  };
}

/**
 * Extract graph from a file (PDF, etc) using Gemini's multimodal capabilities
 */
export async function extractGraphFromFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ExtractionResult> {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set, returning empty extraction');
    return {
      entities: [],
      relations: [],
      metadata: {
        source: fileName,
        extractedAt: new Date().toISOString(),
        entityCount: 0,
        relationCount: 0,
      },
    };
  }

  // Upload file to Gemini
  const fileUri = await uploadFileToGemini(buffer, mimeType, fileName);

  if (!fileUri) {
    console.error('Failed to upload file to Gemini, falling back to empty result');
    return {
      entities: [],
      relations: [],
      metadata: {
        source: fileName,
        extractedAt: new Date().toISOString(),
        entityCount: 0,
        relationCount: 0,
      },
    };
  }

  const prompt = `Você é um especialista em extração de conhecimento. Analise este documento e extraia:

1. **Entidades**: Identifique TODAS as entidades importantes como:
   - PERSON: Pessoas mencionadas (nomes completos)
   - ORGANIZATION: Empresas, instituições, organizações
   - SKILL: Habilidades técnicas e soft skills
   - TECHNOLOGY: Tecnologias, frameworks, linguagens de programação
   - CONCEPT: Conceitos importantes
   - LOCATION: Locais, cidades, países
   - PROJECT: Projetos mencionados
   - EDUCATION: Formações, cursos, certificações
   - ROLE: Cargos e funções profissionais

2. **Relações**: Identifique como as entidades se relacionam:
   - HAS_SKILL: Pessoa possui habilidade
   - WORKS_AT: Pessoa trabalha em organização
   - STUDIED_AT: Pessoa estudou em instituição
   - USES: Entidade usa tecnologia
   - LOCATED_IN: Entidade está localizada em
   - PART_OF: Entidade faz parte de
   - RELATED_TO: Relação genérica
   - WORKED_ON: Pessoa trabalhou em projeto
   - KNOWS: Pessoa conhece conceito/tecnologia

**Responda APENAS com um JSON válido** no seguinte formato (sem markdown, sem explicações):
{
  "entities": [
    {"name": "Nome da Entidade", "type": "TIPO", "description": "Breve descrição opcional"}
  ],
  "relations": [
    {"source": "Nome Entidade Origem", "target": "Nome Entidade Destino", "relation_type": "TIPO_RELACAO", "description": "Descrição opcional"}
  ]
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { file_data: { mime_type: mimeType, file_uri: fileUri } },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean up the response
    let jsonStr = textContent.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const geminiResult = JSON.parse(jsonStr) as GeminiExtractionResponse;

    // Create entity ID map for relation mapping
    const entityIdMap = new Map<string, string>();

    // Convert Gemini entities to our format
    const entities: ExtractedEntity[] = geminiResult.entities.map((e) => {
      const id = generateId();
      entityIdMap.set(e.name.toLowerCase(), id);
      return {
        id,
        type: e.type,
        label: e.name,
        properties: {
          description: e.description || '',
        },
      };
    });

    // Convert Gemini relations to our format
    const relations: ExtractedRelation[] = geminiResult.relations
      .map((r) => {
        const sourceId = entityIdMap.get(r.source.toLowerCase());
        const targetId = entityIdMap.get(r.target.toLowerCase());

        if (!sourceId || !targetId) {
          return null;
        }

        return {
          source: sourceId,
          target: targetId,
          type: r.relation_type,
          label: r.description || r.relation_type.toLowerCase().replace(/_/g, ' '),
          weight: 1.0,
        };
      })
      .filter((r): r is ExtractedRelation => r !== null);

    return {
      entities,
      relations,
      metadata: {
        source: fileName,
        extractedAt: new Date().toISOString(),
        entityCount: entities.length,
        relationCount: relations.length,
      },
    };
  } catch (error) {
    console.error('Error extracting from file with Gemini:', error);
    return {
      entities: [],
      relations: [],
      metadata: {
        source: fileName,
        extractedAt: new Date().toISOString(),
        entityCount: 0,
        relationCount: 0,
      },
    };
  }
}
