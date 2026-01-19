import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import "./App.css";

export default function App() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

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
      .filter((r) => r.status && r.status !== "SOLD")
      .filter((r) => {
        if (!qq) return true;
        return `${r.name} ${r.set} ${r.rarity}`.toLowerCase().includes(qq);
      })
      .sort((a, b) => a.price_bnd - b.price_bnd);
  }, [rows, q]);

  return (
    <div className="wrap">
      <header className="header">
        <h1>Poketwnz</h1>
        <p className="muted">Live inventory</p>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search card / set / rarity…"
          className="search"
        />

        {!CSV_URL && (
          <div className="error">
            Missing <b>VITE_INVENTORY_CSV_URL</b> in Netlify environment variables.
          </div>
        )}
      </header>

      <div className="meta muted">Showing {filtered.length} cards</div>

      <main className="grid">
        {filtered.map((r, i) => (
          <article className="card" key={i}>
            <div className="thumb">
              {r.image ? (
                <img src={r.image} alt={r.name} loading="lazy" />
              ) : (
                <div className="noimg">No image</div>
              )}
            </div>

            <div className="body">
              <div className="name">{r.name}</div>
              <div className="sub muted">
                {r.set} • #{r.number} • {r.rarity} • {r.condition}
              </div>
              <div className="price">BND {r.price_bnd}</div>
              {r.notes ? <div className="notes">{r.notes}</div> : null}
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
