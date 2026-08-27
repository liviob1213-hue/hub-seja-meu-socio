/** Vitrine de Impacto: painel direto, com contraste forte e formulários organizados para execução rápida. */
import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Image, Link2, MonitorPlay, PackagePlus, Trash2 } from "lucide-react";
import { Brand } from "../components/Brand";
import { extractIframeUrl, formatCurrency, getProducts, saveProducts, type MediaKind, type Product, type ProductKind } from "../lib/catalog";

type FormData = {
  name: string;
  description: string;
  price: string;
  kind: ProductKind;
  productUrl: string;
  mediaUrl: string;
  mediaKind: MediaKind;
};

const emptyForm: FormData = { name: "", description: "", price: "", kind: "paid", productUrl: "", mediaUrl: "", mediaKind: "image" };

export default function Admin() {
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [form, setForm] = useState<FormData>(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const paidCount = useMemo(() => products.filter((product) => product.kind === "paid").length, [products]);

  function updateForm<Key extends keyof FormData>(key: Key, value: FormData[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedPrice = Number(form.price.replace(",", "."));
    if (!form.name.trim() || !form.description.trim() || !form.productUrl.trim() || !form.mediaUrl.trim()) {
      setError("Preencha nome, descrição, link do produto e mídia antes de publicar.");
      return;
    }
    if (form.kind === "paid" && (!form.price || Number.isNaN(parsedPrice) || parsedPrice <= 0)) {
      setError("Informe um valor maior que zero para produtos pagos.");
      return;
    }

    const newProduct: Product = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      description: form.description.trim(),
      price: form.kind === "free" ? 0 : parsedPrice,
      kind: form.kind,
      productUrl: form.productUrl.trim(),
      mediaUrl: form.mediaKind === "iframe" ? extractIframeUrl(form.mediaUrl) : form.mediaUrl.trim(),
      mediaKind: form.mediaKind,
      createdAt: new Date().toISOString(),
    };
    const nextProducts = [newProduct, ...products];
    setProducts(nextProducts);
    saveProducts(nextProducts);
    setForm(emptyForm);
    setMessage("Produto publicado no catálogo com sucesso.");
  }

  function deleteProduct(id: string) {
    const nextProducts = products.filter((product) => product.id !== id);
    setProducts(nextProducts);
    saveProducts(nextProducts);
    setMessage("Produto removido do catálogo.");
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Brand />
        <div className="admin-sidebar__marker"><span>PAINEL</span><strong>Gestão do hub</strong></div>
        <nav><a className="is-current" href="#novo-produto"><PackagePlus size={18} /> Novo produto</a><a href="#produtos-cadastrados"><MonitorPlay size={18} /> Produtos cadastrados</a></nav>
        <Link href="/" className="admin-sidebar__back"><ArrowLeft size={17} /> Ver catálogo</Link>
      </aside>

      <section className="admin-main">
        <header className="admin-top"><div><p className="eyebrow">Área administrativa</p><h1>Coloque boas oportunidades <em>em circulação.</em></h1></div><Link href="/" className="button button--outline">Ver hub <ArrowLeft size={16} /></Link></header>

        <div className="admin-stats"><div><span>NO CATÁLOGO</span><strong>{products.length.toString().padStart(2, "0")}</strong><small>produtos ativos</small></div><div><span>PRODUTOS PAGOS</span><strong>{paidCount.toString().padStart(2, "0")}</strong><small>com preço definido</small></div><div className="admin-stats__accent"><Check size={28} /><p>As alterações ficam salvas neste navegador.</p></div></div>

        <section className="editor-section" id="novo-produto">
          <div className="section-label"><span>01</span><div><p className="eyebrow">Cadastro</p><h2>Novo produto</h2></div></div>
          <form className="product-form" onSubmit={handleSubmit}>
            <label className="field field--wide"><span>Nome do produto</span><input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Ex.: Diagnóstico de Oferta" required /></label>
            <label className="field field--wide"><span>Descrição</span><textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="Explique, em poucas linhas, o que esta pessoa vai encontrar." rows={4} required /></label>
            <fieldset className="field fieldset"><legend>Tipo de acesso</legend><div className="choice-grid"><button type="button" className={form.kind === "paid" ? "choice is-selected" : "choice"} onClick={() => updateForm("kind", "paid")}><span className="choice__dot" /> Pago <small>Tem valor</small></button><button type="button" className={form.kind === "free" ? "choice is-selected" : "choice"} onClick={() => updateForm("kind", "free")}><span className="choice__dot" /> Gratuito <small>Sem custo</small></button></div></fieldset>
            <label className={`field ${form.kind === "free" ? "is-muted" : ""}`}><span>Valor (R$)</span><input value={form.kind === "free" ? "0,00" : form.price} onChange={(event) => updateForm("price", event.target.value)} placeholder="97,00" inputMode="decimal" disabled={form.kind === "free"} /></label>
            <label className="field field--wide"><span>Link do produto</span><div className="field__icon"><Link2 size={17} /><input type="url" value={form.productUrl} onChange={(event) => updateForm("productUrl", event.target.value)} placeholder="https://seusite.com/produto" required /></div></label>
            <fieldset className="field fieldset"><legend>Formato de mídia</legend><div className="choice-grid"><button type="button" className={form.mediaKind === "image" ? "choice is-selected" : "choice"} onClick={() => updateForm("mediaKind", "image")}><Image size={17} /> Imagem</button><button type="button" className={form.mediaKind === "iframe" ? "choice is-selected" : "choice"} onClick={() => updateForm("mediaKind", "iframe")}><MonitorPlay size={17} /> Vídeo / iframe</button></div></fieldset>
            <label className="field field--wide"><span>{form.mediaKind === "image" ? "URL da imagem" : "URL ou código de iframe"}</span><div className="field__icon">{form.mediaKind === "image" ? <Image size={17} /> : <MonitorPlay size={17} />}<input value={form.mediaUrl} onChange={(event) => updateForm("mediaUrl", event.target.value)} placeholder={form.mediaKind === "image" ? "https://.../capa.jpg" : "https://www.youtube.com/embed/..."} required /></div><small>{form.mediaKind === "iframe" ? "Cole o link embed ou o código completo do iframe." : "Use uma URL pública da imagem de capa."}</small></label>
            {error && <p className="form-alert form-alert--error" role="alert">{error}</p>}
            {message && <p className="form-alert" role="status"><Check size={16} /> {message}</p>}
            <button type="submit" className="button button--primary product-form__submit">Publicar no catálogo <ArrowLeft className="flip" size={17} /></button>
          </form>
        </section>

        <section className="registered-section" id="produtos-cadastrados">
          <div className="section-label"><span>02</span><div><p className="eyebrow">Curadoria atual</p><h2>Produtos cadastrados</h2></div></div>
          <div className="manage-list">
            {products.map((product) => <article className="manage-item" key={product.id}><div className="manage-item__media">{product.mediaKind === "image" ? <img src={product.mediaUrl} alt="" /> : <MonitorPlay size={21} />}</div><div className="manage-item__copy"><span className={`manage-item__tag manage-item__tag--${product.kind}`}>{product.kind === "free" ? "GRATUITO" : "PAGO"}</span><h3>{product.name}</h3><p>{product.kind === "free" ? "R$ 0,00" : formatCurrency(product.price)}</p></div><a className="manage-item__url" href={product.productUrl} target="_blank" rel="noreferrer">Abrir link <Link2 size={15} /></a><button className="manage-item__delete" onClick={() => deleteProduct(product.id)} aria-label={`Remover ${product.name}`}><Trash2 size={17} /></button></article>)}
          </div>
        </section>
      </section>
    </main>
  );
}
