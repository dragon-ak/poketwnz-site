import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import "./App.css";

/* ===============================
   TOGGLE COMING SOON HERE
   =============================== */
const COMING_SOON = true; // set to false when launching

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
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selected, setSelected] = useState(null);

  const CSV_URL = import.meta.env.VITE_INVENTORY_CSV_URL;
  const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";

  /* ===============================
     LOAD INVENTORY
     =============================== */
  useEffect(() => {
    if (!CSV_URL) return;

    fetch(CSV_URL, { cache: "no-store" })
      .then((r) => r.text())
      .then((text) => {
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        });

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

  /* ===============================
     CLOSE MODAL ON ESC
     =============================== */
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ===============================
     FILTER + SEARCH
     =============================== */
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows
      .filter((r) =>
        onlyAvailable ? r.status === "AVAILABLE" : r.status !== "SOLD"
      )
      .filter((r) => {
        if (!qq) return true;
        return `${r.name} ${r.set} ${r.rarity}`.toLowerCase().includes(qq);
      })
      .sort((a, b) => a.price_bnd - b.price_bnd);
  }, [rows, q, onlyAvailable]);

  /* ===============================
     WHATSAPP LINK
     =============================== */
  function buildWhatsAppLink(card) {
    if (!WHATSAPP_NUMBER) return "";

    const lines = [
      "Hi Poketwnz! I’m interested in this card:",
      `• ${card.name}${card.number ? ` (#${card.number})` : ""}`,
      `• Set: ${card.set || "-"}`,
      `• Condition: ${card.condition || "-"}`,
      `• Price: BND ${formatBnd(card.price_bnd)}`,
      "",
      "Is it still available?",
    ];

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      lines.join("\n")
    )}`;
  }

  return (
    <div>
      {/* ===============================
          COMING SOON OVERLAY
          =============================== */}
      {COMING_SOON && (
        <div className="coming-overlay">
          <div className="coming-card">
            <div className="coming-logo">Poketwnz</div>
            <div className="coming-tag">
              Pokémon cards. From Brunei.
            </div>

            <div className="coming-text">
              We’re setting things up.<br />
              Inventory and pricing coming soon.
            </div>

            <div className="coming-sub">
              Follow us on Instagram for updates.
            </div>
          </div>
        </div>
      )}

      {/* ===============================
          HEADER
          =============================== */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="logo">Poketwnz</div>
            <div className="tag">
              Cube-store finds. Collector-friendly prices.
            </div>
          </div>

          <div className="controls">
            <input
              className="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search card / set / rarity…"
            />
            <button className="pill" onClick={() => setOnlyAvailable(!onlyAvailable)}>
              {onlyAvailable ? "Showing: AVAILABLE" : "Showing: ALL"}
            </button>
          </div>
        </div>
      </div>

      {/* ===============================
          CONTENT
          =============================== */}
      <div className="wrap">
        <div className="meta">
          <div>
            Showing <b>{filtered.length}</b> cards
          </div>
          <div className="muted">
            {lastUpdated
              ? `Last updated: ${lastUpdated.toLocaleString()}`
              : "Loading…"}
          </div>
        </div>

        <main className="grid">
          {filtered.map((r, i) => {
            const band = priceBand(r.price_bnd);
            const wa = buildWhatsAppLink(r);

            return (
              <article
                key={i}
                className="card"
                onClick={() => setSelected(r)}
                style={{ cursor: "pointer" }}
              >
                <div className="thumb">
                  {r.image ? (
                    <img src={r.image} alt={r.name} />
                  ) : (
                    <div className="noimg">No image</div>
                  )}
                </div>

                <div className="body">
                  <div className="row">
                    <div className="name">{r.name}</div>
                    <div className={`badge ${band.cls}`}>{band.label}</div>
                  </div>

                  <div className="sub">
                    {r.set} • #{r.number} • {r.rarity} • {r.condition}
                  </div>

                  <div className="price">BND {formatBnd(r.price_bnd)}</div>

                  <div
                    className="actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      className={`btn ${!wa ? "btn-disabled" : ""}`}
                      href={wa || undefined}
                      target="_blank"
                      rel="noreferrer"
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

      {/* ===============================
          MODAL
          =============================== */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">
                {selected.name} {selected.number && `(#${selected.number})`}
              </div>
              <button className="iconbtn" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-media">
                {selected.image ? (
                  <img src={selected.image} alt={selected.name} />
                ) : (
                  <div className="noimg">No image</div>
                )}
              </div>

              <div className="modal-info">
                <div className="modal-price">
                  BND {formatBnd(selected.price_bnd)}
                </div>

                <div className="kv">
                  <span>Set</span><b>{selected.set}</b>
                  <span>Number</span><b>{selected.number}</b>
                  <span>Rarity</span><b>{selected.rarity}</b>
                  <span>Condition</span><b>{selected.condition}</b>
                </div>

                {selected.notes && (
                  <div className="notes">{selected.notes}</div>
                )}

                <a
                  className="btn"
                  href={buildWhatsAppLink(selected)}
                  target="_blank"
                  rel="noreferrer"
                >
                  DM to buy (WhatsApp)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
