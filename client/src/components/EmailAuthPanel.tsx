/** Painel de acesso: autenticação direta por e-mail e senha para preservar a administração do hub. */
import { type FormEvent, useState } from "react";
import { ArrowLeft, Check, LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { Brand } from "./Brand";
import { trpc } from "../lib/trpc";

type Mode = "login" | "register";

export function EmailAuthPanel() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const isPending = loginMutation.isPending || registerMutation.isPending;

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "register" && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    try {
      await (mode === "register"
        ? await registerMutation.mutateAsync({ name: name.trim(), email: email.trim(), password })
        : await loginMutation.mutateAsync({ email: email.trim(), password }));
      await utils.auth.me.invalidate();
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Não foi possível concluir o acesso.";
      setError(message.includes("Unexpected token") || message.includes("not valid JSON")
        ? "A API de autenticação retornou uma resposta inválida. Faça um novo deploy e confirme as variáveis do Supabase na Vercel."
        : message);
    }
  }

  return <main className="auth-shell">
    <div className="auth-shell__brand"><Brand /></div>
    <section className="auth-panel" aria-labelledby="auth-title">
      <p className="eyebrow"><LockKeyhole size={14} /> Área de projetos</p>
      <h1 id="auth-title">{mode === "login" ? <>Entre para <em>gerenciar.</em></> : <>Crie sua conta de <em>admin.</em></>}</h1>
      <p className="auth-panel__lead">{mode === "login" ? "Acesse seus projetos, envie capas e vídeos e publique sua próxima ideia no hub." : "Cadastre seu acesso para organizar, publicar e escalar projetos Lovable com segurança."}</p>
      <div className="auth-tabs" role="tablist" aria-label="Opções de acesso"><button className={mode === "login" ? "is-active" : ""} type="button" role="tab" aria-selected={mode === "login"} onClick={() => switchMode("login")}>Entrar</button><button className={mode === "register" ? "is-active" : ""} type="button" role="tab" aria-selected={mode === "register"} onClick={() => switchMode("register")}>Criar conta</button></div>
      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "register" && <label className="field"><span>Seu nome</span><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos chamar você?" required /></label>}
        <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" required /></label>
        <label className="field"><span>Senha</span><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" minLength={8} required /></label>
        {mode === "register" && <label className="field"><span>Confirme sua senha</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repita a senha escolhida" minLength={8} required /></label>}
        {error && <p className="form-alert form-alert--error" role="alert">{error}</p>}
        <button className="button button--primary auth-form__submit" type="submit" disabled={isPending}>{isPending ? "Processando..." : mode === "login" ? "Entrar no painel" : "Criar conta e entrar"}{mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}</button>
      </form>
      <p className="auth-panel__switch">{mode === "login" ? "Ainda não possui acesso?" : "Já possui uma conta?"} <button type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Criar conta" : "Entrar"}</button></p>
      <p className="auth-panel__hint"><Check size={15} /> A primeira conta criada recebe permissões de administrador.</p>
      <Link href="/" className="auth-panel__back"><ArrowLeft size={16} /> Voltar aos projetos</Link>
    </section>
  </main>;
}
