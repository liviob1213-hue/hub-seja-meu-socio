/** Vitrine de Impacto: identidade angular em vermelho e preto, com tipografia editorial condensada. */
import { Link } from "wouter";

type BrandProps = { compact?: boolean };

export function Brand({ compact = false }: BrandProps) {
  return (
    <Link href="/" className="brand" aria-label="Ir para o catálogo do Hub Seja Meu Sócio">
      <svg className="brand__symbol" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <path d="M20 2 35 10v7L22 24l13 7v7L20 40 5 32v-7l13-7L5 11V4l15 8 9-5-9-5Z" fill="currentColor" />
        <path d="m20 18 10 6-10 6-10-6 10-6Z" fill="var(--ink)" />
      </svg>
      {!compact && (
        <span className="brand__wordmark" aria-label="Hub Seja Meu Sócio">
          <span>HUB</span>
          <strong>SEJA MEU SÓCIO</strong>
        </span>
      )}
    </Link>
  );
}
