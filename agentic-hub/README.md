# 🚀 Agentic Hub

**Plataforma SaaS B2B para criação e gestão de agentes conversacionais com Knowledge Graphs**

## 📌 Visão Geral

Agentic Hub é uma plataforma multi-tenant que permite empresas criarem seus próprios agentes de IA conversacionais, alimentados por grafos de conhecimento 3D interativos. Os agentes podem ser integrados com múltiplos canais de comunicação (Website, WhatsApp, Email, etc).

### Proposta de Valor

> "Cada empresa pode criar seus próprios agentes inteligentes, alimentados por grafos de conhecimento 3D interativos, com visibilidade total sobre conversas e insights através de exploração visual e conversacional."

## 🏗️ Arquitetura

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           AGENTIC HUB PLATFORM                                │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────────────────────┐ │
│  │   SUPER ADMIN       │    │           TENANT WORKSPACES                  │ │
│  │   (Operador)        │    │  ┌─────────────┐  ┌─────────────┐           │ │
│  │  • Gerenciar        │    │  │ CLIENTE A   │  │ CLIENTE B   │  ...      │ │
│  │    Clientes         │    │  │  • Agentes  │  │  • Agentes  │           │ │
│  │  • Billing          │    │  │  • Grafos   │  │  • Grafos   │           │ │
│  │  • Templates        │    │  │  • Conversas│  │  • Conversas│           │ │
│  └─────────────────────┘    │  └─────────────┘  └─────────────┘           │ │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TailwindCSS |
| **Visualização** | 3d-force-graph, Three.js (futuro) |
| **Backend** | Next.js API Routes, Supabase Edge Functions |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Auth** | Supabase Auth |
| **AI/LLM** | OpenAI, Cognee |
| **Monorepo** | pnpm workspaces + Turborepo |

## 📁 Estrutura do Projeto

```
agentic-hub/
├── apps/
│   └── web/                    # App principal Next.js
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   │   ├── (auth)/     # Login, registro
│       │   │   ├── (dashboard)/# Dashboard do tenant
│       │   │   ├── (admin)/    # Super admin
│       │   │   └── api/        # API routes
│       │   ├── components/     # React components
│       │   ├── lib/            # Utilities
│       │   └── types/          # TypeScript types
│       └── ...
├── packages/
│   └── database/               # Supabase client e types
│       ├── src/
│       └── supabase/migrations/
└── services/                   # Microserviços (futuro)
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js >= 20
- pnpm >= 9

### Instalação

```bash
# Clone o repositório
cd agentic-hub

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente
cp apps/web/.env.example apps/web/.env.local

# Inicie o desenvolvimento
pnpm dev
```

### Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# OpenAI (para agentes)
OPENAI_API_KEY=your-openai-key
```

## 📊 Modelo de Dados

### Principais Entidades

- **Organizations**: Tenants da plataforma
- **Users**: Usuários vinculados a organizações
- **Agents**: Agentes de IA com persona e configurações
- **Knowledge Graphs**: Grafos de conhecimento (nodes + edges)
- **Conversations**: Histórico de conversas por canal

## 🎯 Roadmap

### Fase 1: MVP
- [x] Setup monorepo
- [x] Schema de banco de dados
- [ ] Autenticação multi-tenant
- [ ] CRUD de agentes
- [ ] Visualização 3D de grafos
- [ ] Widget de chat para website

### Fase 2: Canais
- [ ] Integração WhatsApp Business
- [ ] Integração Email
- [ ] Inbox unificado

### Fase 3: Inteligência
- [ ] Pipeline Cognee para grafos
- [ ] Busca semântica no histórico
- [ ] Analytics avançado

## 🔒 Segurança

- Row Level Security (RLS) no Supabase
- Isolamento de dados por organização
- API Keys por tenant
- Audit logging

## 📜 Licença

Proprietário - Todos os direitos reservados.

