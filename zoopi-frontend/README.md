Zoopi Tecnologia - Enterprise Gastro OS
O Zoopi é um sistema de gestão de alta performance para o setor gastronômico, focado em escalabilidade, inteligência artificial e operação offline-first. Recentemente, o sistema evoluiu de uma arquitetura baseada em BaaS (Supabase) para uma infraestrutura robusta e autohospedada utilizando NestJS, PostgreSQL e Docker.
🏗️ Arquitetura do Sistema
A nova arquitetura segue o modelo Client-Server desacoplado:
1. Frontend (Este repositório)
Framework: React 18 + TypeScript + Vite.
UI/UX: Tailwind CSS + Shadcn UI + Framer Motion (animações premium).
Gerenciamento de Estado: TanStack Query (React Query) para cache e sincronização de dados.
Comunicação: Axios centralizado em src/lib/api.ts com interceptores para injeção de tokens JWT e tratamento global de erros.
PWA: Suporte a múltiplos manifestos dinâmicos (Garçom, Tablet, PDV, Totem).
2. Backend (API NestJS)
Tecnologia: NestJS (Node.js framework).
Autenticação: JWT (JSON Web Tokens) com roles específicas (Admin, Waiter, Operator).
Banco de Dados: PostgreSQL (Relacional).
Multitenancy: Identificação de unidades via header x-tenant-slug.
3. Infraestrutura (Docker)
Orquestração: Docker Compose.
Serviços:
zoopi-api: Container da API NestJS.
zoopi-db: Container do banco PostgreSQL.
zoopi-frontend: Container de serving (Nginx/Vite).
📂 Estrutura de Pastas (Frontend)
code
Bash
src/
├── api/                # Definições de chamadas de API por domínio
├── components/         # Componentes core e UI (Shadcn)
├── contexts/           # Contextos de aplicação (Auth, Company, Alert)
├── hooks/              # Hooks customizados para lógica de negócio
├── lib/                # Configurações de bibliotecas (Axios, QueryClient)
├── modules/            # Módulos independentes (ERP, Alertas, Mesas)
│   ├── alerts/         # Sistema global de notificações/alertas
│   ├── tables/         # Gestão de salão e comandas
│   └── finance-erp/    # Dashboards e relatórios financeiros
├── pages/              # Telas da aplicação organizadas por setor
├── services/           # Serviços de integração (Perfil, Imagens)
└── utils/              # Helpers e utilitários (Formatadores, Crop)
🔧 Configuração e Instalação
Pré-requisitos
Node.js 20+
Backend NestJS rodando (Porta 3000 padrão)
Docker & Docker Compose
Variáveis de Ambiente (.env)
Crie um arquivo .env na raiz do projeto:
code
Env
VITE_API_URL=http://localhost:3000/api
Instalação Manual
code
Bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev
Build para Produção
code
Bash
npm run build
🛠️ Mudanças Críticas (Migração Supabase → API)
Remoção do SDK: O pacote @supabase/supabase-js foi desinstalado.
Centralização de Dados: Todas as requisições agora passam pelo src/lib/api.ts.
Segurança: O controle de acesso (RLS) que ficava no banco agora é gerenciado pelos Guards e Decorators do NestJS.
Upload de Imagens: O armazenamento agora é feito via endpoints dedicados (/profiles/avatar) que salvam no storage local ou S3, em vez de Buckets do Supabase.
Alertas Globais: Sistema de captura de erros via Interceptor do Axios que dispara o componente GlobalAlert automaticamente em caso de falha na API.
📱 Funcionalidades PWA
O sistema detecta a rota e altera o manifesto automaticamente:
/pwa/garcom: Interface otimizada para terminais móveis.
/pwa/tablet: Modo cliente para autoatendimento na mesa.
/pwa/pdv: Interface robusta para fechamento de caixa.
