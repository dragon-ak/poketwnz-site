import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import "./App.css";

/* ===============================
   TOGGLE COMING SOON HERE
   =============================== */
const COMING_SOON = false; // false = LIVE, true = Coming Soon

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

function qtyLabel(qty) {
  const q = Number(qty || 0);
  if (q <= 0) return "Out of stock";
  if (q === 1) return "Last 1 in stock";
  return `${q} in stock`;
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selected, setSelected] = useState(null);

  // ✅ Category tabs state
  const [activeCat, setActiveCat] = useState("All");

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
          category: (r.category || "Single").trim(), // ✅ NEW
          rarity: r.rarity || "",
          condition: r.condition || "",
          qty: Number(r.qty || 0),
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
     CATEGORY LIST (AUTO)
     =============================== */
  const categories = useMemo(() => {
    const set = new Set(
      rows.map((r) => (r.category || "Single").trim()).filter(Boolean)
    );
    return ["All", ...Array.from(set).sort()];
  }, [rows]);

  /* ===============================
     FILTER + SEARCH
     =============================== */
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return rows
      .filter((r) =>
        onlyAvailable
          ? r.status === "AVAILABLE" && Number(r.qty || 0) > 0
          : r.status !== "SOLD"
      )
      .filter((r) => {
        if (activeCat === "All") return true;
        return (r.category || "Single").trim() === activeCat;
      })
      .filter((r) => {
        if (!qq) return true;
        return `${r.name} ${r.set} ${r.rarity} ${r.category}`
          .toLowerCase()
          .includes(qq);
      })
      .sort((a, b) => a.price_bnd - b.price_bnd);
  }, [rows, q, onlyAvailable, activeCat]);

  /* ===============================
     WHATSAPP LINK
     =============================== */
  function buildWhatsAppLink(card) {
    if (!WHATSAPP_NUMBER) return "";

    const lines = [
      "Hi Poketwnz! I’m interested in this item:",
      `• ${card.name}${card.number ? ` (#${card.number})` : ""}`,
      `• Category: ${card.category || "-"}`,
      `• Set: ${card.set || "-"}`,
      `• Condition: ${card.condition || "-"}`,
      `• Price: BND ${formatBnd(card.price_bnd)}`,
      `• Qty shown: ${Number(card.qty || 0)}`,
      "",
      "Is it still available?",
    ];

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      lines.join("\n")
    )}`;
  }

  const selectedOut = selected ? Number(selected.qty || 0) <= 0 : false;

  return (
    <div>
      {/* ===============================
          COMING SOON OVERLAY
          =============================== */}
      {COMING_SOON && (
        <div className="coming-overlay">
          <div className="coming-card">
            <div className="coming-logo">Poketwnz</div>
            <div className="coming-tag">Pokémon cards. From Brunei.</div>

            <div className="coming-text">
              We’re setting things up.
              <br />
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
            <button
              className="pill"
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              type="button"
            >
              {onlyAvailable ? "Showing: AVAILABLE" : "Showing: ALL"}
            </button>
          </div>
        </div>
      </div>

      {/* ===============================
          CATEGORY TABS
          =============================== */}
      <div className="catbar">
        {categories.map((c) => (
          <button
            key={c}
            className={`catpill ${activeCat === c ? "active" : ""}`}
            onClick={() => setActiveCat(c)}
            type="button"
          >
            {c}
          </button>
        ))}
      </div>

      {/* ===============================
          CONTENT
          =============================== */}
      <div className="wrap">
        <div className="meta">
          <div>
            Showing <b>{filtered.length}</b> items
            {activeCat !== "All" ? (
              <>
                {" "}
                in <b>{activeCat}</b>
              </>
            ) : null}
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
            const out = Number(r.qty || 0) <= 0;

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
                    {r.category} • {r.set} • #{r.number} • {r.rarity} •{" "}
                    {r.condition}
                  </div>

                  <div
                    className={`qty ${
                      Number(r.qty || 0) === 1 ? "last" : ""
                    }`}
                  >
                    {qtyLabel(r.qty)}
                  </div>

                  <div className="price">BND {formatBnd(r.price_bnd)}</div>

                  <div
                    className="actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      className={`btn ${!wa || out ? "btn-disabled" : ""}`}
                      href={!out ? (wa || undefined) : undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={out}
                      onClick={(e) => {
                        if (out) e.preventDefault();
                      }}
                    >
                      {out ? "Out of stock" : "DM to buy (WhatsApp)"}
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
              <button
                className="iconbtn"
                onClick={() => setSelected(null)}
                type="button"
              >
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

                <div className="muted" style={{ marginTop: 6 }}>
                  {qtyLabel(selected.qty)}
                </div>

                <div className="kv">
                  <span>Category</span>
                  <b>{selected.category}</b>

                  <span>Set</span>
                  <b>{selected.set}</b>

                  <span>Number</span>
                  <b>{selected.number}</b>

                  <span>Rarity</span>
                  <b>{selected.rarity}</b>

                  <span>Condition</span>
                  <b>{selected.condition}</b>
                </div>

                {selected.notes && <div className="notes">{selected.notes}</div>}

                <a
                  className={`btn ${selectedOut ? "btn-disabled" : ""}`}
                  href={!selectedOut ? buildWhatsAppLink(selected) : undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={selectedOut}
                  onClick={(e) => {
                    if (selectedOut) e.preventDefault();
                  }}
                >
                  {selectedOut ? "Out of stock" : "DM to buy (WhatsApp)"}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
