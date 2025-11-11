import React, { useEffect, useState, useRef } from "react";

// Use env var first, fallback to your published CSV
const SHEET_CSV_URL =
  import.meta.env?.VITE_SHEET_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR2TsKEzEGAwIY8jGpJ4xGvqjbR1aJPXUXb9V_baHzewmXP_L6qfpBDFdyioNKpzXbE5r1dqMTFtKjJ/pub?gid=1757018942&single=true&output=csv";

// --- CSV parser ---
function parseCSV(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (current || row.length > 0) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = "";
      }
      if (c === "\r" && next === "\n") i++; // CRLF
    } else {
      current += c;
    }
  }

  if (current || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
}

// --- Lightweight Virtual Grid (kept for big lists) ---
function VirtualGrid({ items, renderItem, rowHeight = 260, columnWidth = 200, gap = 12 }) {
  const containerRef = useRef(null);
  const [visible, setVisible] = useState({ start: 0, end: 0, width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const { scrollTop, clientHeight, clientWidth } = el;
      const columns = Math.max(1, Math.floor(clientWidth / (columnWidth + gap)));
      const totalRows = Math.ceil(items.length / columns);
      const visibleRows = Math.ceil(clientHeight / (rowHeight + gap));
      const startRow = Math.max(0, Math.floor(scrollTop / (rowHeight + gap)) - 1);
      const endRow = Math.min(totalRows, startRow + visibleRows + 2);
      setVisible({
        start: startRow * columns,
        end: endRow * columns,
        width: clientWidth,
        height: totalRows * (rowHeight + gap),
      });
    };

    update();
    el.addEventListener("scroll", update);
    const resizeObs = new ResizeObserver(update);
    resizeObs.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      resizeObs.disconnect();
    };
  }, [items, rowHeight, columnWidth, gap]);

  const slice = items.slice(visible.start, visible.end);
  const cols = Math.max(1, Math.floor((visible.width || 800) / (columnWidth + gap)));

  return (
    <div ref={containerRef} className="overflow-auto h-[80vh] relative">
      <div style={{ height: visible.height, position: "relative" }}>
        {slice.map((item, i) => {
          const index = i + visible.start;
          const row = Math.floor(index / cols);
          const col = index % cols;
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                top: row * (rowHeight + gap),
                left: col * (columnWidth + gap),
                width: columnWidth,
                height: rowHeight,
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [cards, setCards] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // --- Load CSV ---
  useEffect(() => {
    async function load() {
      try {
        if (!SHEET_CSV_URL) throw new Error("CSV URL is empty (check .env or Netlify env var)");
        const r = await fetch(SHEET_CSV_URL, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const t = await r.text();

        const data = parseCSV(t);
        if (!data.length) throw new Error("CSV appears empty");
        const [rawHeader, ...rows] = data;
        if (!rawHeader || !rawHeader.length) throw new Error("Header row missing");

        const header = rawHeader.map((h) => (h || "").trim().toLowerCase());

        const objs = rows
          .filter((r) => r.some((cell) => (cell || "").trim().length)) // drop fully empty rows
          .map((r) => {
            const o = {};
            header.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
            return o;
          });

        setCards(objs);
        setFiltered(objs);
      } catch (e) {
        console.error("Failed to load CSV:", e);
        alert("Inventory load failed: " + e.message);
        setCards([]);
        setFiltered([]);
      }
    }
    load();
  }, []);

  // --- Filters ---
  useEffect(() => {
    const q = query.toLowerCase();

    const withinBand = (price, band) => {
      const p = Number(price);
      if (!band) return true;
      if (isNaN(p)) return false;
      if (band === "1-3") return p > 0 && p <= 3;
      if (band === "4-5") return p >= 4 && p <= 5;
      if (band === "6-10") return p >= 6 && p <= 10;
      if (band === "11-25") return p >= 11 && p <= 25;
      if (band === "26-50") return p >= 26 && p <= 50;
      if (band === "50+") return p > 50;
      return true;
    };

    const next = cards.filter((c) => {
      const matchQuery =
        !q ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.set || "").toLowerCase().includes(q) ||
        (c.rarity || "").toLowerCase().includes(q);

      const matchPrice = withinBand(c.price_bnd, priceFilter);
      const matchStatus = !statusFilter || (c.status || "") === statusFilter;

      return matchQuery && matchPrice && matchStatus;
    });

    setFiltered(next);
  }, [query, priceFilter, statusFilter, cards]);

  const renderCard = (c, i) => (
    <div
      key={i}
      className="bg-white shadow-md rounded-2xl p-2 flex flex-col justify-between border border-gray-200 hover:shadow-lg transition"
    >
      <div className="flex flex-col items-center">
        {c.image_url ? (
          <img
            src={c.image_url}
            alt={c.name || "Card"}
            loading="lazy"
            className="rounded-lg w-full h-[160px] object-contain"
          />
        ) : (
          <div className="w-full h-[160px] flex items-center justify-center text-gray-400 text-sm border rounded-lg">
            No Image
          </div>
        )}
        <div className="mt-2 text-center">
          <p className="font-semibold text-sm">{c.name || "(no name)"}</p>
          <p className="text-xs text-gray-500">{c.set || ""}</p>
          <p className="text-xs text-gray-500">
            {(c.rarity || "").toUpperCase()} {c.condition ? `| ${c.condition}` : ""}
          </p>
          <p className="font-bold text-sm mt-1">BND ${c.price_bnd || "-"}</p>
        </div>
      </div>
      <a
        href={`https://wa.me/?text=Hi! I'm interested in this card: ${encodeURIComponent(
          `${c.name || "Unknown"} (${c.set || "Set"}) for BND ${c.price_bnd || "-"}`
        )}.`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-md py-1 text-center"
      >
        WhatsApp
      </a>
    </div>
  );

  const smallList = filtered.length <= 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 text-green-700">Poketwnz Storefront</h1>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Search cards..."
          className="border p-2 rounded-lg w-64"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="border p-2 rounded-lg"
          value={priceFilter}
          onChange={(e) => setPriceFilter(e.target.value)}
        >
          <option value="">All Prices</option>
          <option value="1-3">$1–$3</option>
          <option value="4-5">$4–$5</option>
          <option value="6-10">$6–$10</option>
          <option value="11-25">$11–$25</option>
          <option value="26-50">$26–$50</option>
          <option value="50+">$50+</option>
        </select>
        <select
          className="border p-2 rounded-lg"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="AVAILABLE">Available</option>
          <option value="HOLD">Hold</option>
          <option value="SOLD">Sold</option>
        </select>
      </div>

      

      {/* Fallback to simple grid for small lists */}
      {smallList ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full max-w-[1100px]">
          {filtered.map((c, i) => renderCard(c, i))}
        </div>
      ) : (
        <VirtualGrid items={filtered} renderItem={renderCard} />
      )}
    </div>
  );
}
