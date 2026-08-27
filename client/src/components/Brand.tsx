/** Vitrine de Impacto: identidade angular em vermelho e preto, com tipografia editorial condensada. */
import { Link } from "wouter";

type BrandProps = { compact?: boolean };

export function Brand({ compact = false }: BrandProps) {
  return (
    <Link href="/" className="brand" aria-label="Ir para o catálogo do Hub Seja Meu Sócio">
      <img className="brand__symbol" src="/manus-storage/hub-symbol_f235cc4c.png" alt="" />
      {!compact && (
        <span className="brand__wordmark" aria-label="Hub Seja Meu Sócio">
          <span>HUB</span>
          <strong>SEJA MEU SÓCIO</strong>
        </span>
      )}
    </Link>
  );
}
