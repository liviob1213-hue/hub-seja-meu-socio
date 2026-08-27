# Migração para Vercel

## Arquitetura proposta

O frontend será entregue como **SPA Vite** a partir de `dist/public`, com reescrita de rotas para `index.html`. O backend será movido para funções em `api/`, removendo a dependência do servidor Manus.

| Necessidade | Serviço proposto | Motivo |
|---|---|---|
| Dados de usuários e projetos | Neon Postgres via Vercel Marketplace | Banco relacional serverless, próprio para contas, projetos e permissões. |
| Capas e vídeos | Vercel Blob | Upload direto do navegador para o armazenamento, adequado a arquivos maiores. |
| Sessão | JWT em cookie HTTP-only | Sessão independente do OAuth do Manus. |

## Referências oficiais

- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite): SPA requer `vercel.json` com reescrita para `index.html`.
- [Express on Vercel](https://vercel.com/docs/frameworks/backend/express): aplicações Express podem ser publicadas como funções, sem servidor persistente.
- [Vercel Blob — Client Upload](https://vercel.com/docs/vercel-blob/client-upload): uploads maiores devem ir diretamente do navegador ao Blob e a rota de token deve autenticar o usuário.
- [Marketplace Storage](https://vercel.com/docs/marketplace-storage): integrações de banco conectadas ao projeto injetam credenciais automaticamente.
- [Postgres on Vercel](https://vercel.com/docs/postgres): bancos novos devem ser conectados por uma integração do Marketplace, como Neon.

## Situação da conta Vercel

A rota geral de armazenamento da equipe retornou 404. Para criar os recursos, é necessário entrar no projeto da Vercel, abrir **Storage** e conectar um banco Postgres pelo Marketplace (como Neon) e um Blob store. Essas operações podem criar recursos com cobrança e exigem confirmação do proprietário da conta.
