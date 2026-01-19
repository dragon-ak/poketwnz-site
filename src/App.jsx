import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import "./App.css";

function priceBand(bnd) {
  if (!Number.isFinite(bnd)) return { label: "—", cls: "" };
  if (bnd <= 1) return { label: "$1 BIN", cls: "good" };
  if (bnd <= 3) return { label: "$3 BIN", cls: "good" };
  if (bnd <= 5) return { label: "$5 BIN", cls: "warn" };
  if (bnd >= 20) return { label: "Premium", cls: "prem" };
  return { label: "Standard", cls: "" };
}

function formatBnd(n) {
  if (!Number.isFinite(n)) return "";
  // Show as integer if whole number, else 2dp
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const CSV_URL = import.meta.env.VITE_INVENTORY_CSV_URL;
  const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || ""; // e.g. "6738XXXXXX"

  useEffect(() => {
    if (!CSV_URL) return;

    fetch(CSV_URL, { cache: "no-store" })
      .then((r) => r.text())
      .then((text) => {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

        const clean = (parsed.data || []).map((r) => ({
          set: r.set || "",
          number: r.number || "",
          name: r.name || "",
          rarity: r.rarity || "",
          condition: r.condition || "",
          price_bnd: Number(r.price_bnd || 0),
          status: (r.status || "").toUpperCase(),
          image: r.image_direct || r.image_url || "",
          notes: r.notes || "",
        }));

        setRows(clean);
        setLastUpdated(new Date());
      })
      .catch(console.error);
  }, [CSV_URL]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows
      .filter((r) =>
        onlyAvailable ? r.status === "AVAILABLE" : r.status && r.status !== "SOLD"
      )
      .filter((r) => {
        if (!qq) return true;
        return `${r.name} ${r.set} ${r.rarity}`.toLowerCase().includes(qq);
      })
      .sort((a, b) => a.price_bnd - b.price_bnd);
  }, [rows, q, onlyAvailable]);

  function buildWhatsAppLink(card) {
    if (!WHATSAPP_NUMBER) return "";

    const price = formatBnd(card.price_bnd);
    const lines = [
      "Hi Poketwnz! I want to buy this card:",
      `• ${card.name}${card.number ? ` (#${card.number})` : ""}`,
      `• Set: ${card.set || "-"}`,
      `• Condition: ${card.condition || "-"}`,
      `• Price: BND ${price || "-"}`,
      "",
      "Is it still available?",
    ];

    const text = encodeURIComponent(lines.join("\n"));
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="logo">Poketwnz</div>
            <div className="tag">Cube-store finds. Collector-friendly prices.</div>
          </div>

          <div className="controls">
            <input
              className="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search card / set / rarity…"
            />

            <button className="pill" onClick={() => setOnlyAvailable((v) => !v)}>
              {onlyAvailable ? "Showing: AVAILABLE" : "Showing: ALL (not SOLD)"}
            </button>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="meta">
          <div>
            Showing <b>{filtered.length}</b> cards
          </div>

          <div className="meta-right">
            {lastUpdated ? (
              <span className="muted">
                Last updated:{" "}
                <b>{lastUpdated.toLocaleString()}</b>
              </span>
            ) : (
              <span className="muted">Loading…</span>
            )}
          </div>
        </div>

        {!CSV_URL ? (
          <div className="error">
            Missing <b>VITE_INVENTORY_CSV_URL</b> in Netlify environment variables.
          </div>
        ) : null}

        {!WHATSAPP_NUMBER ? (
          <div className="warnbox">
            WhatsApp button is disabled because <b>VITE_WHATSAPP_NUMBER</b> isn’t set yet.
          </div>
        ) : null}

        <main className="grid">
          {filtered.map((r, i) => {
            const band = priceBand(r.price_bnd);
            const waLink = buildWhatsAppLink(r);

            return (
              <article className="card" key={i}>
                <div className="thumb">
                  {r.image ? (
                    <img src={r.image} alt={r.name} loading="lazy" />
                  ) : (
                    <div className="noimg">No image</div>
                  )}
                </div>

                <div className="body">
                  <div className="row">
                    <div className="name">{r.name || "(No name)"}</div>
                    <div className={`badge ${band.cls}`}>{band.label}</div>
                  </div>

                  <div className="sub">
                    {r.set} • #{r.number} • {r.rarity} • {r.condition}
                  </div>

                  <div className="price">BND {formatBnd(r.price_bnd)}</div>

                  {r.notes ? <div className="notes">{r.notes}</div> : null}

                  <div className="actions">
                    <a
                      className={`btn ${!waLink ? "btn-disabled" : ""}`}
                      href={waLink || undefined}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        if (!waLink) e.preventDefault();
                      }}
                      title={!waLink ? "Set VITE_WHATSAPP_NUMBER to enable" : "Chat on WhatsApp"}
                    >
                      DM to buy (WhatsApp)
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </main>
      </div>
    </div>
  );
}
