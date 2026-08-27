/** Vitrine de Impacto: catálogo assimétrico, vermelho como sinal de ação e superfícies grafite profundas. */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowDownRight, ArrowUpRight, ChevronRight, CircleHelp, Grid2X2, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Brand } from "../components/Brand";
import { ProductCard } from "../components/ProductCard";
import { getProducts, type ProductKind } from "../lib/catalog";

type Filter = "all" | ProductKind;

export default function Home() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const products = useMemo(() => getProducts(), []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) => {
      const hasType = filter === "all" || product.kind === filter;
      const hasSearch = !normalizedQuery || `${product.name} ${product.description}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
      return hasType && hasSearch;
    });
  }, [filter, products, query]);

  const paidCount = products.filter((product) => product.kind === "paid").length;
  const freeCount = products.filter((product) => product.kind === "free").length;

  return (
    <main className="site-shell">
      <header className="topbar">
        <Brand />
        <nav className="topbar__nav" aria-label="Navegação principal">
          <a href="#catalogo">Catálogo</a>
          <a href="#sobre">Como funciona</a>
          <Link className="topbar__admin-link" href="/admin">Área admin <ArrowUpRight size={15} /></Link>
        </nav>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="eyebrow"><Sparkles size={14} /> seleção para crescer</p>
          <h1 id="hero-title">O próximo movimento do seu negócio <em>começa aqui.</em></h1>
          <p className="hero__lead">Produtos, aulas e mapas de ação selecionados para você criar uma operação que ganha tração.</p>
          <a className="button button--primary" href="#catalogo">Explorar o hub <ArrowDownRight size={18} /></a>
        </div>
        <div className="hero__stage">
          <img src="/manus-storage/hub-hero-editorial_6ce57b86.jpg" alt="" />
          <div className="hero__stage-tag"><span>01</span> Recursos com direção</div>
        </div>
        <div className="hero__ticker" aria-hidden="true"><span>RECURSOS PARA QUEM FAZ ACONTECER</span><span>•</span><span>SEJA MEU SÓCIO</span><span>•</span><span>RECURSOS PARA QUEM FAZ ACONTECER</span></div>
      </section>

      <section className="catalog-section" id="catalogo" aria-labelledby="catalogo-title">
        <aside className="filter-panel">
          <p className="filter-panel__kicker"><SlidersHorizontal size={15} /> Encontrar no hub</p>
          <h2>Escolha seu próximo passo.</h2>
          <div className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque por tema" aria-label="Buscar produtos" />
          </div>
          <div className="filter-list" role="group" aria-label="Filtro de produtos">
            <button className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}><Grid2X2 size={17} /> Todos <span>{products.length}</span></button>
            <button className={filter === "free" ? "is-active" : ""} onClick={() => setFilter("free")}><Sparkles size={17} /> Gratuitos <span>{freeCount}</span></button>
            <button className={filter === "paid" ? "is-active" : ""} onClick={() => setFilter("paid")}><ChevronRight size={17} /> Pagos <span>{paidCount}</span></button>
          </div>
          <div className="filter-panel__note"><CircleHelp size={17} /><p>Todo produto abre em uma nova aba, direto para o conteúdo ou a oferta.</p></div>
        </aside>

        <div className="catalog-content">
          <div className="catalog-head">
            <div><p className="eyebrow">Catálogo em movimento</p><h2 id="catalogo-title">Feito para destravar.</h2></div>
            <p>{filteredProducts.length.toString().padStart(2, "0")} {filteredProducts.length === 1 ? "recurso encontrado" : "recursos encontrados"}</p>
          </div>
          {filteredProducts.length ? (
            <div className="product-grid">
              {filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
            </div>
          ) : (
            <div className="empty-state"><Search size={29} /><h3>Nada por aqui ainda.</h3><p>Tente outro termo ou altere o filtro para encontrar um recurso.</p><button className="button button--outline" onClick={() => { setFilter("all"); setQuery(""); }}>Limpar filtros</button></div>
          )}
        </div>
      </section>

      <section className="manifesto" id="sobre">
        <div className="manifesto__rule" />
        <div><p className="eyebrow">Não é uma prateleira qualquer</p><h2>Menos ruído.<br /><em>Mais direção.</em></h2></div>
        <div className="manifesto__copy"><p>O Hub Seja Meu Sócio reúne atalhos que ajudam você a sair do planejamento e entrar na execução. A seleção é simples: conteúdo aplicável, oferta clara e acesso sem complicação.</p><a href="#catalogo">Conhecer o catálogo <ArrowUpRight size={17} /></a></div>
      </section>

      <footer className="site-footer"><Brand /><p>Hub Seja Meu Sócio © 2026</p><Link href="/admin">Gerenciar produtos <ArrowUpRight size={14} /></Link></footer>
    </main>
  );
}
