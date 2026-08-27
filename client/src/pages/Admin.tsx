/** Painel de projetos Lovable: cadastro protegido com upload de capa e vídeo em armazenamento persistente. */
import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Check,
  FileVideo,
  Image,
  Link2,
  LoaderCircle,
  LogOut,
  MonitorPlay,
  PackagePlus,
  Trash2,
} from "lucide-react";
import { Brand } from "../components/Brand";
import { EmailAuthPanel } from "../components/EmailAuthPanel";
import {
  extractIframeUrl,
  formatCurrency,
  type CatalogProject,
  type MediaKind,
  type ProjectKind,
} from "../lib/catalog";
import { trpc } from "../lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";

type FormData = {
  name: string;
  description: string;
  price: string;
  kind: ProjectKind;
  projectUrl: string;
  coverUrl: string;
  coverKey?: string;
  videoUrl?: string;
  videoKey?: string;
  iframeUrl?: string;
  mediaKind: MediaKind;
};

const emptyForm: FormData = {
  name: "",
  description: "",
  price: "",
  kind: "paid",
  projectUrl: "",
  coverUrl: "",
  mediaKind: "image",
};
const MAX_FILE_MB = 25;

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export default function Admin() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const projectsQuery = trpc.projects.list.useQuery(undefined, { enabled: isAuthenticated });
  const uploadMutation = trpc.projects.uploadMedia.useMutation();
  const createMutation = trpc.projects.create.useMutation({ onSuccess: () => utils.projects.list.invalidate() });
  const deleteMutation = trpc.projects.delete.useMutation({ onSuccess: () => utils.projects.list.invalidate() });
  const [form, setForm] = useState<FormData>(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<"cover" | "video" | null>(null);
  const projects = (projectsQuery.data ?? []) as CatalogProject[];
  const paidCount = useMemo(() => projects.filter((project) => project.kind === "paid").length, [projects]);

  function updateForm<Key extends keyof FormData>(key: Key, value: FormData[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setMessage("");
  }

  async function uploadFile(event: ChangeEvent<HTMLInputElement>, slot: "cover" | "video") {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`O arquivo ultrapassa o limite de ${MAX_FILE_MB} MB.`);
      return;
    }

    try {
      setUploading(slot);
      setError("");
      const result = await uploadMutation.mutateAsync({
        slot,
        filename: file.name,
        mimeType: file.type,
        base64: await readFileAsBase64(file),
      });
      if (slot === "cover") {
        updateForm("coverUrl", result.url);
        updateForm("coverKey", result.key);
      } else {
        updateForm("videoUrl", result.url);
        updateForm("videoKey", result.key);
      }
      setMessage(slot === "cover" ? "Capa enviada e pronta para o projeto." : "Vídeo enviado e pronto para publicação.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(null);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(form.price.replace(",", "."));
    if (!form.name.trim() || !form.description.trim() || !form.projectUrl.trim() || !form.coverUrl) {
      setError("Preencha os dados do projeto e envie uma imagem de capa antes de publicar.");
      return;
    }
    if (form.kind === "paid" && (!form.price || Number.isNaN(price) || price <= 0)) {
      setError("Informe um valor maior que zero para projetos pagos.");
      return;
    }
    if (form.mediaKind === "video" && !form.videoUrl) {
      setError("Envie o vídeo de apresentação antes de publicar.");
      return;
    }
    if (form.mediaKind === "iframe" && !form.iframeUrl?.trim()) {
      setError("Cole a URL incorporável do vídeo antes de publicar.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        projectUrl: form.projectUrl.trim(),
        price: form.kind === "free" ? 0 : price,
        iframeUrl: form.iframeUrl ? extractIframeUrl(form.iframeUrl) : undefined,
      });
      setForm(emptyForm);
      setMessage("Projeto publicado no catálogo com sucesso.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Não foi possível publicar o projeto.");
    }
  }

  if (loading) return <main className="admin-gate"><LoaderCircle className="spin" size={28} /><p>Carregando acesso administrativo...</p></main>;
  if (!isAuthenticated) return <EmailAuthPanel />;
  if (user?.role !== "admin") {
    return <main className="admin-gate"><Brand /><div><p className="eyebrow">Acesso restrito</p><h1>Esta área é exclusiva para <em>administradores.</em></h1><p>Use a conta proprietária do hub para cadastrar e gerenciar os projetos disponíveis.</p><Link href="/" className="button button--outline">Voltar ao hub <ArrowLeft size={16} /></Link></div></main>;
  }

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Brand />
      <div className="admin-sidebar__marker"><span>PAINEL</span><strong>Projetos Lovable</strong></div>
      <nav><a className="is-current" href="#novo-projeto"><PackagePlus size={18} /> Novo projeto</a><a href="#projetos-cadastrados"><MonitorPlay size={18} /> Projetos cadastrados</a></nav>
      <div className="admin-sidebar__account"><span>{user?.name ?? "Administrador"}</span><small>{user?.email ?? "Conta protegida"}</small><button type="button" onClick={() => { void logout(); }}><LogOut size={15} /> Sair da conta</button></div>
      <Link href="/" className="admin-sidebar__back"><ArrowLeft size={17} /> Ver hub</Link>
    </aside>
    <section className="admin-main">
      <header className="admin-top"><div><p className="eyebrow">Área administrativa</p><h1>Coloque projetos prontos <em>em circulação.</em></h1></div><Link href="/" className="button button--outline">Ver hub <ArrowLeft size={16} /></Link></header>
      <div className="admin-stats"><div><span>NO CATÁLOGO</span><strong>{projects.length.toString().padStart(2, "0")}</strong><small>projetos ativos</small></div><div><span>PROJETOS PAGOS</span><strong>{paidCount.toString().padStart(2, "0")}</strong><small>com preço definido</small></div><div className="admin-stats__accent"><Check size={28} /><p>Capas e vídeos ficam armazenados com segurança no hub.</p></div></div>
      <section className="editor-section" id="novo-projeto">
        <div className="section-label"><span>01</span><div><p className="eyebrow">Cadastro</p><h2>Novo projeto</h2></div></div>
        <form className="product-form" onSubmit={handleSubmit}>
          <label className="field field--wide"><span>Nome do projeto</span><input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Ex.: Dashboard SaaS para imobiliárias" required /></label>
          <label className="field field--wide"><span>Descrição</span><textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="Explique qual problema o projeto resolve e como pode ser modelado." rows={4} required /></label>
          <fieldset className="field fieldset"><legend>Tipo de acesso</legend><div className="choice-grid"><button type="button" className={form.kind === "paid" ? "choice is-selected" : "choice"} onClick={() => updateForm("kind", "paid")}><span className="choice__dot" /> Pago <small>Tem valor</small></button><button type="button" className={form.kind === "free" ? "choice is-selected" : "choice"} onClick={() => updateForm("kind", "free")}><span className="choice__dot" /> Gratuito <small>Sem custo</small></button></div></fieldset>
          <label className={`field ${form.kind === "free" ? "is-muted" : ""}`}><span>Valor (R$)</span><input value={form.kind === "free" ? "0,00" : form.price} onChange={(event) => updateForm("price", event.target.value)} placeholder="297,00" inputMode="decimal" disabled={form.kind === "free"} /></label>
          <label className="field field--wide"><span>Link do projeto</span><div className="field__icon"><Link2 size={17} /><input type="url" value={form.projectUrl} onChange={(event) => updateForm("projectUrl", event.target.value)} placeholder="https://lovable.dev/projects/..." required /></div><small>Insira o link de acesso, demo ou checkout do seu projeto.</small></label>
          <div className="field field--wide"><span>Imagem de capa</span><div className={`upload-box ${form.coverUrl ? "is-complete" : ""}`}><span className="upload-box__icon">{uploading === "cover" ? <LoaderCircle className="spin" size={20} /> : <Image size={20} />}</span><span><strong>{form.coverUrl ? "Capa enviada" : "Enviar imagem de capa"}</strong><small>PNG, JPG ou WEBP até 25 MB</small></span><input className="upload-box__file" aria-label="Selecionar imagem de capa" type="file" accept="image/*" onChange={(event) => uploadFile(event, "cover")} /></div>{form.coverUrl && <div className="media-preview"><img src={form.coverUrl} alt="Prévia da capa enviada" /><button type="button" onClick={() => { updateForm("coverUrl", ""); updateForm("coverKey", undefined); }}>Remover capa</button></div>}</div>
          <fieldset className="field fieldset"><legend>Formato de mídia principal</legend><div className="choice-grid choice-grid--triple"><button type="button" className={form.mediaKind === "image" ? "choice is-selected" : "choice"} onClick={() => updateForm("mediaKind", "image")}><Image size={17} /> Apenas capa</button><button type="button" className={form.mediaKind === "video" ? "choice is-selected" : "choice"} onClick={() => updateForm("mediaKind", "video")}><FileVideo size={17} /> Vídeo enviado</button><button type="button" className={form.mediaKind === "iframe" ? "choice is-selected" : "choice"} onClick={() => updateForm("mediaKind", "iframe")}><MonitorPlay size={17} /> Vídeo externo</button></div></fieldset>
          {form.mediaKind === "video" && <div className="field field--wide"><span>Vídeo de apresentação</span><div className={`upload-box ${form.videoUrl ? "is-complete" : ""}`}><span className="upload-box__icon">{uploading === "video" ? <LoaderCircle className="spin" size={20} /> : <FileVideo size={20} />}</span><span><strong>{form.videoUrl ? "Vídeo enviado" : "Enviar vídeo"}</strong><small>MP4, WebM ou MOV até 25 MB</small></span><input className="upload-box__file" aria-label="Selecionar vídeo de apresentação" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => uploadFile(event, "video")} /></div>{form.videoUrl && <div className="media-preview media-preview--video"><video src={form.videoUrl} controls /><button type="button" onClick={() => { updateForm("videoUrl", undefined); updateForm("videoKey", undefined); }}>Remover vídeo</button></div>}</div>}
          {form.mediaKind === "iframe" && <label className="field field--wide"><span>URL ou código de iframe</span><div className="field__icon"><MonitorPlay size={17} /><input value={form.iframeUrl ?? ""} onChange={(event) => updateForm("iframeUrl", event.target.value)} placeholder="https://www.youtube.com/embed/..." /></div><small>Cole a URL embed ou o código completo do iframe do vídeo.</small></label>}
          {error && <p className="form-alert form-alert--error" role="alert">{error}</p>}
          {message && <p className="form-alert" role="status"><Check size={16} /> {message}</p>}
          <button type="submit" className="button button--primary product-form__submit" disabled={createMutation.isPending || uploading !== null}>{createMutation.isPending ? "Publicando..." : "Publicar projeto"}<ArrowLeft className="flip" size={17} /></button>
        </form>
      </section>
      <section className="registered-section" id="projetos-cadastrados">
        <div className="section-label"><span>02</span><div><p className="eyebrow">Curadoria atual</p><h2>Projetos cadastrados</h2></div></div>
        {projectsQuery.isError ? <div className="manage-error"><p>Não foi possível carregar os projetos cadastrados.</p><button className="button button--outline" onClick={() => projectsQuery.refetch()}>Tentar novamente</button></div> : <div className="manage-list">{projects.map((project) => <article className="manage-item" key={project.id}><div className="manage-item__media">{project.mediaKind === "video" ? <FileVideo size={21} /> : <img src={project.coverUrl} alt="" />}</div><div className="manage-item__copy"><span className={`manage-item__tag manage-item__tag--${project.kind}`}>{project.kind === "free" ? "GRATUITO" : "PAGO"}</span><h3>{project.name}</h3><p>{project.kind === "free" ? "R$ 0,00" : formatCurrency(project.price)}</p></div><a className="manage-item__url" href={project.projectUrl} target="_blank" rel="noreferrer">Abrir projeto <Link2 size={15} /></a><button className="manage-item__delete" onClick={() => deleteMutation.mutate({ id: project.id })} aria-label={`Remover ${project.name}`} disabled={deleteMutation.isPending}><Trash2 size={17} /></button></article>)}</div>}
      </section>
    </section>
  </main>;
}
