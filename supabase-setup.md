# Configuração do Hub Seja Meu Sócio com Supabase externo

Este documento descreve a configuração necessária para o Hub funcionar na Vercel sem Neon, Vercel Blob ou serviços Manus. A arquitetura usa **Supabase Auth** para contas de e-mail e senha, **Postgres via Supabase Data API** para perfis e projetos e o bucket **Supabase Storage `hub-media`** para capas e vídeos.

> A chave `SUPABASE_SERVICE_ROLE_KEY` é exclusivamente de servidor. Ela ignora as políticas RLS e nunca pode ser exposta em `VITE_*`, no navegador, no GitHub ou no código do frontend. [1]

## 1. Criar ou abrir o projeto Supabase

No [Supabase Dashboard](https://supabase.com/dashboard), crie um projeto ou abra o projeto que será usado pelo Hub. Em **Project Settings → General**, copie o **Project URL**. Em **Project Settings → API**, copie a chave pública anon/publishable e a chave secreta service role. A URL normalmente tem o formato `https://SEU_PROJECT_REF.supabase.co`.

No menu **Authentication → Providers → Email**, deixe o provedor de e-mail habilitado. A implementação serverless cria a primeira conta com `email_confirm: true`, portanto o usuário já consegue entrar sem depender de um e-mail de confirmação. O cadastro por senha segue o fluxo oficial `signUp`/`signInWithPassword` do Supabase Auth. [2]

## 2. Executar o SQL

Abra **SQL Editor → New query**, cole todo o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) e clique em **Run**. O script é idempotente para tabelas, índices, função, políticas e bucket: pode ser executado novamente sem duplicar esses objetos.

O script cria `hub_profiles`, que vincula cada conta ao registro correspondente em `auth.users`, e `hub_projects`, com nome, descrição, preço, tipo gratuito/pago, URL, capa e mídia principal. A primeira conta criada pela API recebe a função `admin`; as demais recebem `user` e não conseguem publicar, excluir ou enviar arquivos.

A tabela de projetos permite leitura pública controlada por RLS para que a vitrine funcione sem login. A escrita continua restrita a administradores. O Storage também permite leitura pública somente dentro do bucket `hub-media`; gravação, alteração e exclusão são restritas a administradores. As políticas de Storage são necessárias quando se usa RLS. [3]

## 3. Configurar o Storage

O SQL já cria o bucket **`hub-media`** como público, com limite de **25 MiB** e os tipos `JPEG`, `PNG`, `WEBP`, `GIF`, `MP4`, `WebM` e `QuickTime`. No dashboard, confirme em **Storage → Buckets** que o bucket existe e está público.

A escolha de bucket público é intencional: o catálogo público precisa renderizar a capa e o vídeo sem uma sessão de usuário. Os endereços gerados seguem o formato público convencional do Supabase Storage, `https://PROJECT_REF.supabase.co/storage/v1/object/public/hub-media/...`. [4]

O upload não envia os bytes para a função serverless. A função verifica o cookie de administrador e emite uma URL de upload assinada; o navegador envia o arquivo diretamente ao Supabase Storage. Isso evita o limite de corpo de requisição da função da Vercel. O banco armazena somente a URL pública e o caminho do objeto.

## 4. Variáveis na Vercel

No projeto correto da Vercel, abra **Settings → Environment Variables** e adicione as variáveis abaixo para **Production**, **Preview** e **Development**. Os valores devem vir do projeto Supabase escolhido.

| Variável | Ambiente | Valor | Exposição |
|---|---|---|---|
| `SUPABASE_URL` | Server | Project URL | Somente servidor |
| `SUPABASE_ANON_KEY` | Server | anon/publishable key | Servidor; também pode ser pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | service_role secret key | **Somente servidor; obrigatória** |
| `VITE_SUPABASE_URL` | Browser | A mesma Project URL | Pública |
| `VITE_SUPABASE_ANON_KEY` | Browser | A mesma anon/publishable key | Pública |

Não adicione `SUPABASE_SERVICE_ROLE_KEY` com prefixo `VITE_`. Depois de salvar ou alterar variáveis, faça um novo deploy, pois o bundle e as funções precisam receber a configuração atualizada.

## 5. Configuração da Vercel

O `vercel.json` do projeto já deve manter o build Vite em `dist/public`, deixar `/api/*` para as funções locais e redirecionar apenas caminhos de SPA para `/index.html`. O código serverless esperado é:

| Arquivo | Função |
|---|---|
| `api/trpc/[...trpc].ts` | Auth, sessão, catálogo, criação e exclusão |
| `api/upload.ts` | Emissão autenticada da URL de upload assinada |
| `server/vercelRouter.ts` | Cliente Supabase server-side e contrato tRPC |
| `supabase/schema.sql` | Estrutura, bucket e políticas |

No GitHub, o repositório privado é [`liviob1213-hue/hub-seja-meu-socio`](https://github.com/liviob1213-hue/hub-seja-meu-socio). Na Vercel, confirme que o projeto está importado desse repositório e que o deploy usa a branch `main`. Não use rewrites para o domínio Manus.

## 6. Ordem de teste

Depois de executar o SQL e configurar as variáveis, abra a URL publicada e confirme que a home lista projetos. Acesse `/admin`, selecione **Criar conta**, registre a primeira conta e confirme que o painel mostra a função administrativa. Faça logout, entre novamente e confirme que a sessão persiste somente no cookie HTTP-only.

Em seguida, publique um projeto gratuito sem vídeo, publique um projeto pago com vídeo e exclua um projeto de teste. Confira os registros em **Table Editor → hub_profiles** e **Table Editor → hub_projects**, e os objetos em **Storage → hub-media → covers/videos**. Se algum fluxo falhar, consulte **Vercel → Logs** e **Supabase → Logs → API/Auth/Storage**.

### Referências

[1]: https://supabase.com/docs/guides/storage/security/access-control "Supabase Storage Access Control"
[2]: https://supabase.com/docs/guides/auth/passwords "Supabase Password-based Auth"
[3]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"
[4]: https://supabase.com/docs/guides/storage/serving/downloads "Supabase Serving assets from Storage"
