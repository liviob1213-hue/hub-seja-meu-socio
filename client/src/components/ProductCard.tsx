/** Vitrine de Impacto: cartão tátil com sombra dupla, etiqueta reta e foco comercial imediato. */
import { ArrowUpRight, ExternalLink, Play } from "lucide-react";
import { formatCurrency, type Product } from "../lib/catalog";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return (
    <article className="product-card" style={{ "--stagger": `${index * 55}ms` } as React.CSSProperties}>
      <div className="product-card__media">
        {product.mediaKind === "iframe" ? (
          <iframe
            src={product.mediaUrl}
            title={`Mídia de ${product.name}`}
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <img src={product.mediaUrl} alt="" loading="lazy" />
        )}
        <span className={`product-card__badge product-card__badge--${product.kind}`}>
          {product.kind === "free" ? "GRATUITO" : "PAGO"}
        </span>
        {product.mediaKind === "iframe" && <span className="product-card__play"><Play size={16} fill="currentColor" /></span>}
      </div>

      <div className="product-card__body">
        <div className="product-card__heading">
          <h3>{product.name}</h3>
          <ArrowUpRight size={19} aria-hidden="true" />
        </div>
        <p>{product.description}</p>
        <div className="product-card__footer">
          <strong>{product.kind === "free" ? "R$ 0,00" : formatCurrency(product.price)}</strong>
          <a href={product.productUrl} target="_blank" rel="noreferrer" aria-label={`Acessar ${product.name}`}>
            Acessar <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </article>
  );
}
