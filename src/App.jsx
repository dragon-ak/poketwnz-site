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

export default function App() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [cubeMode, setCubeMode] = useState(false);

  const CSV_URL = import.meta.env.VITE_INVENTORY_CSV_URL;

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
      })
      .catch(console.error);
  }, [CSV_URL]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows
      .filter((r) => (onlyAvailable ? r.status === "AVAILABLE" : r.status && r.status !== "SOLD"))
      .filter((r) => {
        if (!qq) return true;
        return `${r.name} ${r.set} ${r.rarity}`.toLowerCase().includes(qq);
      })
      .sort((a, b) => a.price_bnd - b.price_bnd);
  }, [rows, q, onlyAvailable]);

  return (
    <div className={cubeMode ? "cubemode" : ""}>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <h1>Poketwnz</h1>
            <div className="tag">Live inventory • Brunei • Updated from sheet</div>
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

            <button className="pill" onClick={() => setCubeMode((v) => !v)}>
              {cubeMode ? "Cube Mode: ON" : "Cube Mode: OFF"}
            </button>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="meta">
          <div>Showing <b>{filtered.length}</b> cards</div>
          {!CSV_URL ? <div style={{ color: "#ff7aa2" }}>Missing VITE_INVENTORY_CSV_URL</div> : null}
        </div>

        <main className="grid">
          {filtered.map((r, i) => {
            const band = priceBand(r.price_bnd);

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

                  <div className="price">BND {r.price_bnd}</div>

                  <div className="badges">
                    <span className="badge">{r.status || "—"}</span>
                    {r.rarity ? <span className="badge">{r.rarity}</span> : null}
                    {r.condition ? <span className="badge">{r.condition}</span> : null}
                  </div>

                  {r.notes ? <div className="notes">{r.notes}</div> : null}
                </div>
              </article>
            );
          })}
        </main>
      </div>
    </div>
  );
}
