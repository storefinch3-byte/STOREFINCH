# Controle Financeiro da Empresa — projeto inicial

Este é um ponto de partida demonstrativo para um sistema financeiro compartilhado. **Ainda não está publicado nem conectado ao seu projeto Supabase**. Leia os passos antes de usar dados reais.

## O que inclui
- Interface inicial em Next.js.
- Cliente Supabase para o navegador.
- Esquema SQL inicial para empresas, membros, categorias e lançamentos.
- Variáveis de ambiente de exemplo.

## Requisitos
- Node.js LTS instalado no computador.
- Um projeto Supabase.

## Configuração
1. Extraia o ZIP.
2. Abra a pasta extraída num terminal.
3. Execute `npm install`.
4. Copie `.env.example` para `.env.local`.
5. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com os valores do painel Supabase. Nunca coloque uma `service_role` ou secret key no navegador.
6. Execute `npm run dev` e abra `http://localhost:3000`.

O login, o convite do sócio e as operações financeiras ainda precisam ser implementados e testados antes de uso real. Aplique `supabase/schema.sql` no SQL Editor do Supabase apenas se você estiver configurando um projeto novo; se já executou o SQL anteriormente, não execute de novo sem revisar.
