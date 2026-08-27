/** Vitrine de Impacto: projetos Lovable prontos para ganhar identidade, mercado e escala. */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowDownRight, ArrowUpRight, ChevronRight, CircleHelp, Grid2X2, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Brand } from "../components/Brand";
import { ProductCard } from "../components/ProductCard";
import { type CatalogProject, type ProjectKind } from "../lib/catalog";
import { trpc } from "../lib/trpc";

type Filter = "all" | ProjectKind;

export default function Home() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const projectsQuery = trpc.projects.list.useQuery();
  const projects = (projectsQuery.data ?? []) as CatalogProject[];
  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return projects.filter((project) => (filter === "all" || project.kind === filter) && (!normalizedQuery || `${project.name} ${project.description}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery)));
  }, [filter, projects, query]);
  const paidCount = projects.filter((project) => project.kind === "paid").length;
  const freeCount = projects.filter((project) => project.kind === "free").length;

  if (projectsQuery.isError) return <main className="catalog-error"><Brand /><div><p className="eyebrow">Catálogo indisponível</p><h1>Não foi possível carregar os <em>projetos agora.</em></h1><p>Atualize a página em alguns instantes. Sua navegação e os dados publicados permanecem protegidos.</p><button className="button button--primary" onClick={() => projectsQuery.refetch()}>Tentar novamente</button></div></main>;

  return <main className="site-shell">
    <header className="topbar"><Brand /><nav className="topbar__nav" aria-label="Navegação principal"><a href="#projetos">Projetos</a><a href="#sobre">Como funciona</a></nav></header>
    <section className="hero" aria-labelledby="hero-title"><div className="hero__copy"><p className="eyebrow"><Sparkles size={14} /> projetos Lovable prontos</p><h1 id="hero-title">Modele.<br />Venda.<br /><em>Escale.</em></h1><p className="hero__lead">Projetos Lovable prontos para você adaptar ao seu nicho, colocar sua marca e transformar em produto sem começar do zero.</p><a className="button button--primary" href="#projetos">Explorar projetos <ArrowDownRight size={18} /></a></div><div className="hero__stage"><img src="/manus-storage/hub-hero-editorial_6ce57b86.jpg" alt="" /><div className="hero__stage-tag"><span>01</span> Base pronta. Sua visão.</div></div><div className="hero__ticker" aria-hidden="true"><span>PROJETOS PRONTOS PARA VIRAR NEGÓCIO</span><span>•</span><span>SEJA MEU SÓCIO</span><span>•</span><span>PROJETOS PRONTOS PARA VIRAR NEGÓCIO</span></div></section>
    <section className="catalog-section" id="projetos" aria-labelledby="projetos-title"><aside className="filter-panel"><p className="filter-panel__kicker"><SlidersHorizontal size={15} /> Encontrar projetos</p><h2>Seu próximo produto começa aqui.</h2><div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque por segmento" aria-label="Buscar projetos" /></div><div className="filter-list" role="group" aria-label="Filtro de projetos"><button className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}><Grid2X2 size={17} /> Todos <span>{projects.length}</span></button><button className={filter === "free" ? "is-active" : ""} onClick={() => setFilter("free")}><Sparkles size={17} /> Gratuitos <span>{freeCount}</span></button><button className={filter === "paid" ? "is-active" : ""} onClick={() => setFilter("paid")}><ChevronRight size={17} /> Pagos <span>{paidCount}</span></button></div><div className="filter-panel__note"><CircleHelp size={17} /><p>Cada projeto abre no link de acesso para você conhecer, adaptar e levar ao seu mercado.</p></div></aside><div className="catalog-content"><div className="catalog-head"><div><p className="eyebrow">Projetos em circulação</p><h2 id="projetos-title">Prontos para ganhar escala.</h2></div><p>{projectsQuery.isLoading ? "Carregando" : `${filteredProjects.length.toString().padStart(2, "0")} ${filteredProjects.length === 1 ? "projeto" : "projetos"}`}</p></div>{projectsQuery.isLoading ? <div className="catalog-loading">Carregando projetos selecionados...</div> : filteredProjects.length ? <div className="product-grid">{filteredProjects.map((project, index) => <ProductCard key={project.id} project={project} index={index} />)}</div> : <div className="empty-state"><Search size={29} /><h3>Nenhum projeto encontrado.</h3><p>Experimente outro segmento ou altere o filtro para explorar novas bases de negócio.</p><button className="button button--outline" onClick={() => { setFilter("all"); setQuery(""); }}>Limpar filtros</button></div>}</div></section>
    <section className="manifesto" id="sobre"><div className="manifesto__rule" /><div><p className="eyebrow">Projeto primeiro. Complexidade depois.</p><h2>Não comece<br /><em>do zero.</em></h2></div><div className="manifesto__copy"><p>Escolha uma base construída no Lovable, modele a experiência para o seu cliente e transforme sua adaptação em uma oferta. Você entra na parte que importa: posicionar, vender e escalar.</p><a href="#projetos">Ver projetos <ArrowUpRight size={17} /></a></div></section>
    <footer className="site-footer"><Brand /><p>Hub Seja Meu Sócio © 2026</p><p>Projetos prontos para modelar e vender.</p></footer>
  </main>;
}
