/** Vitrine de Impacto: cartão tátil para projetos prontos, com mídia real e ação comercial em primeiro plano. */
import { ArrowUpRight, ExternalLink, Play } from "lucide-react";
import { formatCurrency, type CatalogProject } from "../lib/catalog";

export function ProductCard({ project, index = 0 }: { project: CatalogProject; index?: number }) {
  const mediaUrl = project.mediaKind === "video" ? project.videoUrl : project.mediaKind === "iframe" ? project.iframeUrl : project.coverUrl;
  return (
    <article className="product-card" style={{ "--stagger": `${index * 55}ms` } as React.CSSProperties}>
      <div className="product-card__media">
        {project.mediaKind === "video" && mediaUrl ? <video src={mediaUrl} poster={project.coverUrl} controls preload="metadata" /> : null}
        {project.mediaKind === "iframe" && mediaUrl ? <iframe src={mediaUrl} title={`Vídeo do projeto ${project.name}`} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : null}
        {project.mediaKind === "image" ? <img src={project.coverUrl} alt="" loading="lazy" /> : null}
        <span className={`product-card__badge product-card__badge--${project.kind}`}>{project.kind === "free" ? "GRATUITO" : "PAGO"}</span>
        {project.mediaKind !== "image" && <span className="product-card__play"><Play size={16} fill="currentColor" /></span>}
      </div>
      <div className="product-card__body">
        <div className="product-card__heading"><h3>{project.name}</h3><ArrowUpRight size={19} aria-hidden="true" /></div>
        <p>{project.description}</p>
        <div className="product-card__footer"><strong>{project.kind === "free" ? "R$ 0,00" : formatCurrency(project.price)}</strong><a href={project.projectUrl} target="_blank" rel="noreferrer" aria-label={`Abrir ${project.name}`}>Ver projeto <ExternalLink size={14} /></a></div>
      </div>
    </article>
  );
}
