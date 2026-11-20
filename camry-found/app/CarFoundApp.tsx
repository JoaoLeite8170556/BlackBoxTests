"use client";

import { FormEvent, useEffect, useMemo, useState, useDeferredValue } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BUDGET_MAX_EUR,
  BUDGET_MAX_KM,
  MAKE_LABELS,
  ORIGIN_LABELS,
  type Fuel,
  type Listing,
  type Make,
  type Origin,
} from "@/src/data/listings";
import { estimateImportCost, formatEur, formatKm } from "@/src/lib/importCost";
import "./app.css";

type SortKey = "landed" | "price" | "year" | "mileage";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=2000&q=80";

const QUICK_SEARCHES = ["Volvo XC40", "Audi A3", "BMW 118", "Mercedes A 180", "híbrido", "diesel"];

type ApiResponse = {
  listings: Listing[];
  sourceTotal: number;
  fetchedAt: string | null;
  cached?: boolean;
  error?: string;
};

function matchesQuery(listing: Listing, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    listing.title,
    listing.make,
    listing.fuel,
    listing.city,
    listing.transmission,
    listing.seller,
    ORIGIN_LABELS[listing.origin],
    String(listing.year),
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

export default function CarFoundApp() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [sourceTotal, setSourceTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [make, setMake] = useState<"all" | Make>("all");
  const [origin, setOrigin] = useState<"all" | Origin>("all");
  const [fuel, setFuel] = useState<"all" | Fuel>("all");
  const [maxPrice, setMaxPrice] = useState(BUDGET_MAX_EUR);
  const [maxKm, setMaxKm] = useState(BUDGET_MAX_KM);
  const [minYear, setMinYear] = useState(2016);
  const [sort, setSort] = useState<SortKey>("landed");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function loadListings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/listings", { cache: "no-store" });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(data.error || "Não foi possível carregar anúncios");
      setListings(data.listings || []);
      setSourceTotal(data.sourceTotal || data.listings?.length || 0);
      setFetchedAt(data.fetchedAt);
      setSelectedId((prev) => prev ?? data.listings?.[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadListings();
  }, []);

  const enriched = useMemo(
    () =>
      listings.map((listing) => ({
        listing,
        cost: estimateImportCost(listing),
      })),
    [listings],
  );

  const filtered = useMemo(() => {
    const rows = enriched.filter(({ listing }) => {
      if (!matchesQuery(listing, deferredQuery)) return false;
      if (make !== "all" && listing.make !== make) return false;
      if (origin !== "all" && listing.origin !== origin) return false;
      if (fuel !== "all" && listing.fuel !== fuel) return false;
      if (listing.priceEur > maxPrice) return false;
      if (listing.mileageKm > maxKm) return false;
      if (listing.year < minYear) return false;
      return true;
    });

    rows.sort((a, b) => {
      switch (sort) {
        case "price":
          return a.listing.priceEur - b.listing.priceEur;
        case "year":
          return b.listing.year - a.listing.year;
        case "mileage":
          return a.listing.mileageKm - b.listing.mileageKm;
        case "landed":
        default:
          return a.cost.totalLanded - b.cost.totalLanded;
      }
    });

    return rows;
  }, [enriched, deferredQuery, make, origin, fuel, maxPrice, maxKm, minYear, sort]);

  const selected = filtered.find((r) => r.listing.id === selectedId) ?? filtered[0] ?? null;

  function runSearch(nextQuery?: string) {
    if (typeof nextQuery === "string") setQuery(nextQuery);
    document.getElementById("anuncios")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
    runSearch();
  }

  return (
    <div className="app">
      <nav className="site-nav" aria-label="Principal">
        <div className="nav-brand">Car Found</div>
        <a className="nav-link" href="#pesquisar">
          Pesquisar
        </a>
      </nav>

      <header className="hero">
        <div className="hero-media" aria-hidden="true">
          <img src={HERO_IMAGE} alt="" width={2000} height={1200} fetchPriority="high" />
        </div>
        <div className="hero-copy">
          <p className="hero-brand">Car Found</p>
          <h1 className="hero-title">Pesquisa o teu próximo carro na Europa</h1>
          <p className="hero-lead">
            Mercedes, Audi, BMW e Volvo até 25 000 € e 100 000 km — com estimativa de importação
            para Portugal.
          </p>

          <form id="pesquisar" className="hero-search" onSubmit={onSearchSubmit} role="search">
            <label className="sr-only" htmlFor="hero-query">
              Pesquisar carro
            </label>
            <input
              id="hero-query"
              type="search"
              enterKeyHint="search"
              placeholder="Ex.: Volvo XC40, Audi A3, BMW 118…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary">
              Pesquisar
            </button>
          </form>

          <div className="search-suggestions" aria-label="Sugestões rápidas">
            {QUICK_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                className="suggestion-chip"
                onClick={() => runSearch(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="section" id="anuncios">
        <div className="section-head">
          <p className="section-kicker">Resultados · AutoScout24</p>
          <h2 className="section-title">Anúncios com custo em Portugal</h2>
          <p className="section-lead">
            Escreve marca ou modelo acima, ou afina aqui. Cada linha mostra o preço e o valor
            estimado à porta em Portugal.
          </p>
        </div>

        <form className="results-search" onSubmit={onSearchSubmit} role="search">
          <label htmlFor="results-query">A tua pesquisa</label>
          <div className="results-search-row">
            <input
              id="results-query"
              type="search"
              enterKeyHint="search"
              placeholder="Marca, modelo, cidade, combustível…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            {query ? (
              <button type="button" className="btn btn-ghost" onClick={() => setQuery("")}>
                Limpar
              </button>
            ) : null}
            <button type="submit" className="btn btn-primary">
              Pesquisar
            </button>
          </div>
        </form>

        <div className="sample-banner" role="status">
          Fonte: AutoScout24
          {sourceTotal ? ` · ${sourceTotal} carros no orçamento` : ""}
          {fetchedAt
            ? ` · atualizado ${new Date(fetchedAt).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })} (Europe/Lisbon)`
            : ""}
          <button
            type="button"
            className="refresh-btn"
            onClick={() => void loadListings()}
            disabled={loading}
          >
            {loading ? "A carregar…" : "Atualizar"}
          </button>
        </div>

        {error && (
          <div className="empty" role="alert">
            {error}. Tenta atualizar dentro de momentos.
          </div>
        )}

        <div className="filters">
          <div className="filter-field">
            <label htmlFor="make">Marca</label>
            <select
              id="make"
              value={make}
              onChange={(e) => setMake(e.target.value as "all" | Make)}
            >
              <option value="all">Todas (4 marcas)</option>
              {MAKE_LABELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="origin">Origem</label>
            <select
              id="origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value as "all" | Origin)}
            >
              <option value="all">Todos os países</option>
              {(Object.keys(ORIGIN_LABELS) as Origin[]).map((code) => (
                <option key={code} value={code}>
                  {ORIGIN_LABELS[code]}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="fuel">Combustível</label>
            <select
              id="fuel"
              value={fuel}
              onChange={(e) => setFuel(e.target.value as "all" | Fuel)}
            >
              <option value="all">Todos</option>
              <option value="híbrido">Híbrido</option>
              <option value="gasolina">Gasolina</option>
              <option value="diesel">Diesel</option>
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="maxPrice">Preço máx. (€)</label>
            <input
              id="maxPrice"
              type="number"
              min={5000}
              max={BUDGET_MAX_EUR}
              step={500}
              value={maxPrice}
              onChange={(e) =>
                setMaxPrice(Math.min(BUDGET_MAX_EUR, Number(e.target.value) || 0))
              }
            />
          </div>

          <div className="filter-field">
            <label htmlFor="maxKm">Km máximos</label>
            <input
              id="maxKm"
              type="number"
              min={10000}
              max={BUDGET_MAX_KM}
              step={5000}
              value={maxKm}
              onChange={(e) => setMaxKm(Math.min(BUDGET_MAX_KM, Number(e.target.value) || 0))}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="minYear">Ano mínimo</label>
            <input
              id="minYear"
              type="number"
              min={2010}
              max={2026}
              value={minYear}
              onChange={(e) => setMinYear(Number(e.target.value) || 2016)}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="sort">Ordenar por</label>
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="landed">Custo em PT (menor)</option>
              <option value="price">Preço anúncio</option>
              <option value="year">Mais recente</option>
              <option value="mileage">Menos km</option>
            </select>
          </div>
        </div>

        <div className="results-meta">
          <span>
            {loading
              ? "A obter anúncios reais…"
              : deferredQuery.trim()
                ? `${filtered.length} resultado${filtered.length === 1 ? "" : "s"} para “${deferredQuery.trim()}”`
                : `${filtered.length} ${filtered.length === 1 ? "carro encontrado" : "carros encontrados"}`}
          </span>
          <span>Estimativa ISV orientativa · UE → Portugal</span>
        </div>

        {!loading && filtered.length === 0 && !error ? (
          <div className="empty">
            Nada encontrado para esta pesquisa. Experimenta outro modelo ou limpa os filtros.
          </div>
        ) : (
          <div className="listing-grid" role="list">
            {filtered.map(({ listing, cost }) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                landed={cost.totalLanded}
                active={selected?.listing.id === listing.id}
                onSelect={() => setSelectedId(listing.id)}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.listing.id}
              className="detail-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="detail-visual">
                <img
                  src={selected.listing.image}
                  alt={selected.listing.title}
                  width={900}
                  height={600}
                />
                <div className="detail-visual-caption">
                  <h3>{selected.listing.title}</h3>
                  <p>
                    {selected.listing.year} · {formatKm(selected.listing.mileageKm)} ·{" "}
                    {ORIGIN_LABELS[selected.listing.origin]} · {selected.listing.city}
                  </p>
                  {selected.listing.sourceUrl && (
                    <a
                      className="source-link"
                      href={selected.listing.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver anúncio no AutoScout24
                    </a>
                  )}
                </div>
              </div>

              <div className="cost-box">
                <h4>Custo estimado em Portugal</h4>
                <div className="cost-rows">
                  <div className="cost-row">
                    <span>Preço do anúncio</span>
                    <span>{formatEur(selected.cost.purchase)}</span>
                  </div>
                  <div className="cost-row">
                    <span>Transporte até PT</span>
                    <span>{formatEur(selected.cost.transport)}</span>
                  </div>
                  <div className="cost-row">
                    <span>ISV (estimativa)</span>
                    <span>{formatEur(selected.cost.isvEstimate)}</span>
                  </div>
                  <div className="cost-row">
                    <span>Matrícula / IMT</span>
                    <span>{formatEur(selected.cost.registration)}</span>
                  </div>
                  <div className="cost-row">
                    <span>Inspeção de admissão</span>
                    <span>{formatEur(selected.cost.inspection)}</span>
                  </div>
                  <div className="cost-row">
                    <span>Despachante e docs</span>
                    <span>{formatEur(selected.cost.otherFees)}</span>
                  </div>
                </div>
                <div className="cost-total">
                  <span>Total à porta</span>
                  <strong>{formatEur(selected.cost.totalLanded)}</strong>
                </div>
                <ul className="cost-notes">
                  {selected.cost.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="section" id="como-funciona">
        <div className="section-head">
          <p className="section-kicker">Processo</p>
          <h2 className="section-title">Do anúncio europeu à matrícula portuguesa</h2>
          <p className="section-lead">
            Pesquisa, compara o custo em Portugal e abre o anúncio original no AutoScout24.
          </p>
        </div>
        <div className="steps">
          <article className="step">
            <h3>Pesquisa</h3>
            <p>
              Escreve marca ou modelo (XC40, A3, 118…) dentro do orçamento de 25 000 € e 100 000 km.
            </p>
          </article>
          <article className="step">
            <h3>Estima o ISV</h3>
            <p>
              Vê transporte, ISV e matrícula estimados antes de avançar para a importação.
            </p>
          </article>
          <article className="step">
            <h3>Abre o anúncio</h3>
            <p>
              Confirma fotos e contacto no AutoScout24 e valida o cálculo oficial com um
              despachante.
            </p>
          </article>
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <strong>Car Found</strong> — pesquisa Mercedes, Audi, BMW e Volvo no AutoScout24 para
          importar para Portugal.
        </div>
        <div>Estimativas não oficiais · confirma sempre com a AT / IMT.</div>
      </footer>
    </div>
  );
}

function ListingRow({
  listing,
  landed,
  active,
  onSelect,
}: {
  listing: Listing;
  landed: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`listing${active ? " is-active" : ""}`}
      onClick={onSelect}
      role="listitem"
      aria-pressed={active}
    >
      <div className="listing-image">
        <img src={listing.image} alt="" width={440} height={280} loading="lazy" />
      </div>
      <div className="listing-body">
        <h3>{listing.title}</h3>
        <p className="listing-meta">
          {listing.year} · {formatKm(listing.mileageKm)} · {listing.powerHp} cv ·{" "}
          {ORIGIN_LABELS[listing.origin]}
        </p>
        <div className="listing-tags">
          <span className="tag">{listing.make}</span>
          <span className="tag">{listing.fuel}</span>
          <span className="tag">{listing.transmission}</span>
          <span className="tag">AutoScout24</span>
        </div>
      </div>
      <div className="listing-price">
        <strong>{formatEur(listing.priceEur)}</strong>
        <span className="landed">≈ {formatEur(landed)} em PT</span>
      </div>
    </button>
  );
}
