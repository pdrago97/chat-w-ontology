import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { 
  getIntegrationsByOrganization, 
  createIntegration, 
  AIRWEAVE_PROVIDERS 
} from '@/lib/integrations';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const integrations = await getIntegrationsByOrganization(session.organizationId);
    
    return NextResponse.json({ 
      integrations,
      providers: AIRWEAVE_PROVIDERS,
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

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
    const { name, description, sourceType, provider, config, credentials, syncFrequency } = body;

    if (!name || !sourceType) {
      return NextResponse.json({ error: 'Nome e tipo são obrigatórios' }, { status: 400 });
    }

    const integration = await createIntegration({
      organizationId: session.organizationId,
      name,
      description,
      sourceType,
      provider,
      config,
      credentials,
      syncFrequency,
      createdBy: session.userId,
    });

    if (!integration) {
      return NextResponse.json({ error: 'Erro ao criar integração' }, { status: 500 });
    }

    return NextResponse.json({ integration }, { status: 201 });
  } catch (error) {
    console.error('Error creating integration:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

