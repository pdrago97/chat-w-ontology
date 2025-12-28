import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createKnowledgeItem } from '@/lib/knowledge';
import { processDocument, chunkText } from '@/lib/document-processor';
import { query } from '@/lib/db';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!['owner', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const agentId = formData.get('agentId') as string | null;
    const tags = formData.get('tags') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 10MB)' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|xlsx|xls|csv|docx|txt|md)$/i)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use PDF, Excel, CSV, Word ou texto.' },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process document
    let processed;
    try {
      processed = await processDocument(buffer, file.name, file.type);
    } catch (error) {
      console.error('Error processing document:', error);
      return NextResponse.json(
        { error: 'Erro ao processar documento. Verifique se o arquivo é válido.' },
        { status: 400 }
      );
    }

    // Create knowledge item with file data
    const item = await createKnowledgeItem({
      organizationId: session.organizationId,
      title: title || file.name.replace(/\.[^.]+$/, ''),
      content: processed.text,
      contentType: 'document',
      agentId: agentId || undefined,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileData: buffer, // Store original file for reprocessing
      metadata: {
        ...processed.metadata,
        originalName: file.name,
      },
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
    });

    if (!item) {
      return NextResponse.json({ error: 'Erro ao salvar item' }, { status: 500 });
    }

    // Create chunks for embedding (async, don't wait)
    const chunks = chunkText(processed.text);

    // Save chunks to database
    for (let i = 0; i < chunks.length; i++) {
      await query(
        `INSERT INTO knowledge_chunks (knowledge_item_id, content, chunk_index, token_count)
         VALUES ($1, $2, $3, $4)`,
        [item.id, chunks[i], i, Math.ceil(chunks[i].length / 4)]
      );
    }

    // Update status to indexed (for now, embeddings will be added later with OpenAI)
    await query(
      `UPDATE knowledge_items SET status = 'indexed', indexed_at = NOW() WHERE id = $1`,
      [item.id]
    );

    return NextResponse.json({
      item: { ...item, status: 'indexed' },
      chunks: chunks.length,
      metadata: processed.metadata,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

