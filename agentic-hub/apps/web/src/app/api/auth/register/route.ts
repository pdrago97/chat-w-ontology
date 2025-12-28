import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, findOrganizationBySlug, createOrganization, createUser } from '@/lib/db';
import { hashPassword, createToken, getSessionCookieOptions } from '@/lib/auth';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, organizationName } = body;

    // Validation
    if (!email || !password || !name || !organizationName) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado' },
        { status: 409 }
      );
    }

    // Generate unique slug
    let slug = slugify(organizationName);
    let slugSuffix = 0;
    while (await findOrganizationBySlug(slug + (slugSuffix ? `-${slugSuffix}` : ''))) {
      slugSuffix++;
    }
    if (slugSuffix) slug = `${slug}-${slugSuffix}`;

    // Create organization
    const organization = await createOrganization(organizationName, slug);
    if (!organization) {
      return NextResponse.json(
        { error: 'Erro ao criar organização' },
        { status: 500 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await createUser(organization.id, email, passwordHash, name, 'owner');
    if (!user) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    // Create session token
    const token = createToken({
      id: user.id,
      email: user.email,
      name: name,
      role: user.role,
      organizationId: organization.id,
      organizationSlug: organization.slug,
    });

    // Set cookie
    const cookieOptions = getSessionCookieOptions();
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: name,
        role: user.role,
        organizationSlug: organization.slug,
      },
    });

    response.cookies.set(cookieOptions.name, token, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

