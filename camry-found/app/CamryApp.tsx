"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ORIGIN_LABELS,
  type Fuel,
  type Listing,
  type Origin,
} from "@/src/data/listings";
import { estimateImportCost, formatEur, formatKm } from "@/src/lib/importCost";
import "./app.css";

type SortKey = "landed" | "price" | "year" | "mileage";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=2000&q=80";

type ApiResponse = {
  listings: Listing[];
  sourceTotal: number;
  fetchedAt: string | null;
  cached?: boolean;
  error?: string;
};

export default function CamryApp() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [sourceTotal, setSourceTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const [origin, setOrigin] = useState<"all" | Origin>("all");
  const [fuel, setFuel] = useState<"all" | Fuel>("all");
  const [maxPrice, setMaxPrice] = useState(45000);
  const [maxKm, setMaxKm] = useState(200000);
  const [minYear, setMinYear] = useState(2015);
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
  }, [enriched, origin, fuel, maxPrice, maxKm, minYear, sort]);

  const selected = filtered.find((r) => r.listing.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="app">
      <nav className="site-nav" aria-label="Principal">
        <div className="nav-brand">Camry Found</div>
        <a className="nav-link" href="#anuncios">
          Ver anúncios
        </a>
      </nav>

      <header className="hero">
        <div className="hero-media" aria-hidden="true">
          <img src={HERO_IMAGE} alt="" width={2000} height={1200} fetchPriority="high" />
        </div>
        <div className="hero-copy">
          <p className="hero-brand">Camry Found</p>
          <h1 className="hero-title">Toyota Camry reais para importar para Portugal</h1>
          <p className="hero-lead">
            Anúncios ao vivo do AutoScout24 na Europa, com estimativa de ISV, transporte e
            matrícula em solo português.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#anuncios">
              Explorar Camrys
            </a>
            <a className="btn btn-ghost" href="#como-funciona">
              Como funciona
            </a>
          </div>
        </div>
      </header>

      <section className="section" id="anuncios">
        <div className="section-head">
          <p className="section-kicker">AutoScout24 · Europa</p>
          <h2 className="section-title">Anúncios Camry com custo em Portugal</h2>
          <p className="section-lead">
            Resultados reais. Cada linha mostra o preço no anúncio e o valor estimado à porta
            em Portugal.
          </p>
        </div>

        <div className="sample-banner" role="status">
          Fonte: AutoScout24
          {sourceTotal ? ` · ${sourceTotal} Camrys obtidos` : ""}
          {fetchedAt
            ? ` · atualizado ${new Date(fetchedAt).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })} (Europe/Lisbon)`
            : ""}
          <button type="button" className="refresh-btn" onClick={() => void loadListings()} disabled={loading}>
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
              min={1000}
              max={80000}
              step={500}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="maxKm">Km máximos</label>
            <input
              id="maxKm"
              type="number"
              min={10000}
              max={400000}
              step={5000}
              value={maxKm}
              onChange={(e) => setMaxKm(Number(e.target.value) || 0)}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="minYear">Ano mínimo</label>
            <input
              id="minYear"
              type="number"
              min={1990}
              max={2026}
              value={minYear}
              onChange={(e) => setMinYear(Number(e.target.value) || 2015)}
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
              : `${filtered.length} ${filtered.length === 1 ? "Camry encontrado" : "Camrys encontrados"}`}
          </span>
          <span>Estimativa ISV orientativa · UE → Portugal</span>
        </div>

        {!loading && filtered.length === 0 && !error ? (
          <div className="empty">
            Nenhum Camry com estes filtros. Alarga o orçamento ou os quilómetros.
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
            Três passos claros para decidir se aquele Camry híbrido vale o importe.
          </p>
        </div>
        <div className="steps">
          <article className="step">
            <h3>Encontra o Camry</h3>
            <p>
              Comparamos anúncios reais no AutoScout24 na Alemanha, Países Baixos, Bélgica e
              outros mercados.
            </p>
          </article>
          <article className="step">
            <h3>Estima o ISV</h3>
            <p>
              Usa CO₂ estimado, cilindrada e idade para projetar impostos e despesas até à
              matrícula em Portugal.
            </p>
          </article>
          <article className="step">
            <h3>Abre o anúncio original</h3>
            <p>
              Confirma fotos, histórico e contacto no AutoScout24 e valida o cálculo oficial
              com um despachante.
            </p>
          </article>
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <strong>Camry Found</strong> — anúncios reais AutoScout24 para importar Camry para
          Portugal.
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
          <span className="tag">{listing.fuel}</span>
          <span className="tag">{listing.transmission}</span>
          <span className="tag">{listing.seller}</span>
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
