/** Vitrine de Impacto: cartão tátil para projetos prontos, com mídia real e ação comercial em primeiro plano. */
import { ArrowUpRight, ExternalLink, Play } from "lucide-react";
import { formatCurrency, type CatalogProject } from "../lib/catalog";

export function ProductCard({ project, index = 0 }: { project: CatalogProject; index?: number }) {
  const mediaUrl = project.mediaKind === "video" ? project.videoUrl : project.mediaKind === "iframe" ? project.iframeUrl : project.coverUrl;
  const isComingSoon = project.status === "coming_soon";
  const isFeatured = project.status === "featured";
  
  const handleCardClick = (e: React.MouseEvent) => {
    if (isComingSoon) return;
    const target = e.target as HTMLElement;
    // Don't trigger card click if user is interacting with video, iframe, or the footer link
    if (target.tagName === 'VIDEO' || target.tagName === 'IFRAME' || target.tagName === 'A' || target.closest('a')) {
      return;
    }
    window.open(project.projectUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <article 
      className={`product-card ${isComingSoon ? 'product-card--coming-soon' : ''} ${isFeatured ? 'product-card--featured' : ''}`}
      style={{ "--stagger": `${index * 55}ms`, cursor: isComingSoon ? "default" : "pointer", pointerEvents: isComingSoon ? "none" : "auto" } as React.CSSProperties}
      onClick={handleCardClick}
    >
      <div className="product-card__media">
        {project.mediaKind === "video" && mediaUrl ? <video src={mediaUrl} poster={project.coverUrl} controls={!isComingSoon} preload="metadata" /> : null}
        {project.mediaKind === "iframe" && mediaUrl ? <iframe src={mediaUrl} title={`Vídeo do projeto ${project.name}`} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen={!isComingSoon} style={isComingSoon ? { pointerEvents: 'none' } : {}} /> : null}
        {project.mediaKind === "image" && project.coverUrl ? <img src={project.coverUrl} alt="" loading="lazy" /> : null}
        {project.mediaKind === "image" && !project.coverUrl ? <div className="product-card__fallback" aria-hidden="true" /> : null}
        <div style={{ position: "absolute", top: "14px", left: "0", zIndex: 2, display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
          <span className={`product-card__badge product-card__badge--${project.kind}`}>{project.kind === "free" ? "GRATUITO" : "PAGO"}</span>
          {isFeatured && <span className="product-card__badge product-card__badge--featured" style={{ position: 'relative', top: 0, left: 0 }}>DESTAQUE</span>}
        </div>
        {project.mediaKind !== "image" && !isComingSoon && <span className="product-card__play"><Play size={16} fill="currentColor" /></span>}
      </div>
      <div className="product-card__body">
        <div className="product-card__heading"><h3>{project.name}</h3>{!isComingSoon && <ArrowUpRight size={19} aria-hidden="true" />}</div>
        <p>{project.description}</p>
        <div className="product-card__footer">
          {isComingSoon ? (
            <>
              <strong>Lançamento em breve</strong>
              <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>Aguarde</span>
            </>
          ) : (
            <>
              <strong>{project.kind === "free" ? "R$ 0,00" : formatCurrency(project.price)}</strong>
              <a href={project.projectUrl} target="_blank" rel="noreferrer" aria-label={`Abrir ${project.name}`}>Ver projeto <ExternalLink size={14} /></a>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
