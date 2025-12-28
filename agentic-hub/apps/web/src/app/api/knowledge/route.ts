import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getKnowledgeItemsByOrganization, createKnowledgeItem } from '@/lib/knowledge';

// GET /api/knowledge - List all knowledge items
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const agentId = searchParams.get('agentId') || undefined;

    const items = await getKnowledgeItemsByOrganization(session.organizationId, { type, status, agentId });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching knowledge items:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST /api/knowledge - Create new knowledge item
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!['owner', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, contentType, agentId, sourceUrl, metadata, tags } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 });
    }

    const validTypes = ['text', 'document', 'url', 'prompt', 'instruction', 'tool'];
    const type = contentType || 'text';
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const item = await createKnowledgeItem({
      organizationId: session.organizationId,
      title: title.trim(),
      content,
      contentType: type,
      agentId,
      sourceUrl,
      metadata,
      tags,
    });

    if (!item) {
      return NextResponse.json({ error: 'Erro ao criar item' }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error creating knowledge item:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

