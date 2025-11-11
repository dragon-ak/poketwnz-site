import React, { useEffect, useState, useMemo, useRef } from "react";

// 🟢 Replace this with your published Google Sheet CSV link
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=YOUR_GID";

// 🧠 Simple CSV parser
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
      if (c === "\r" && next === "\n") i++; // handle CRLF
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

// 🧮 Lightweight Virtual Grid (no dependencies)
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

  // 📦 Load CSV
  useEffect(() => {
    fetch(SHEET_CSV_URL)
      .then((r) => r.text())
      .then((t) => {
        const data = parseCSV(t);
        const [header, ...rows] = data;
        const objs = rows.map((r) => {
          const o = {};
          header.forEach((h, i) => (o[h.trim()] = r[i] || ""));
          return o;
        });
        setCards(objs);
        setFiltered(objs);
      })
      .catch((e) => console.error("Failed to load CSV", e));
  }, []);

  // 🔍 Filters
  useEffect(() => {
    const q = query.toLowerCase();
    const filtered = cards.filter((c) => {
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.set.toLowerCase().includes(q) ||
        c.rarity.toLowerCase().includes(q);
      const matchPrice = !priceFilter || c.price_bnd === priceFilter;
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchQuery && matchPrice && matchStatus;
    });
    setFiltered(filtered);
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
            alt={c.name}
            loading="lazy"
            className="rounded-lg w-full h-[160px] object-contain"
          />
        ) : (
          <div className="w-full h-[160px] flex items-center justify-center text-gray-400 text-sm border rounded-lg">
            No Image
          </div>
        )}
        <div className="mt-2 text-center">
          <p className="font-semibold text-sm">{c.name}</p>
          <p className="text-xs text-gray-500">{c.set}</p>
          <p className="text-xs text-gray-500">{c.rarity} | {c.condition}</p>
          <p className="font-bold text-sm mt-1">BND ${c.price_bnd}</p>
        </div>
      </div>
      <a
        href={`https://wa.me/?text=Hi! I'm interested in this card: ${c.name} (${c.set}) for BND ${c.price_bnd}.`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-md py-1 text-center"
      >
        WhatsApp
      </a>
    </div>
  );

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

      <VirtualGrid items={filtered} renderItem={renderCard} />
    </div>
  );
}
