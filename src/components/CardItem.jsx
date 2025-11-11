import ZoomableImage from "./ZoomableImage";

export default function CardItem({ card }) {
  const name = card.name || "(no name)";
  const set  = card.set  || "";
  const price = card.price_bnd ? String(card.price_bnd) : "-";
  const alt = `${name} — ${set}`;
  const waLink = `https://wa.me/?text=${encodeURIComponent(
    `Hi! I'm interested in this card: ${name} (${set}) for BND ${price}`
  )}`;

console.log("[CardItem] rendering:", card?.name);

  return (
    <div className="bg-white shadow-md rounded-2xl p-2 flex flex-col justify-between border border-gray-200 hover:shadow-lg transition">
      <div className="flex flex-col items-center">
        {card.image_url ? (
          <ZoomableImage
            src={card.image_url}
            zoomSrc={card.image_large_url || card.image_url}
            alt={alt}
          />
        ) : (
          <div className="w-full h-[160px] flex items-center justify-center text-gray-400 text-sm border rounded-lg">
            No Image
          </div>
        )}

        <div className="mt-2 text-center">
          <p className="font-semibold text-sm">{name}</p>
          <p className="text-xs text-gray-500">{set}</p>
          <p className="text-xs text-gray-500">
            {(card.rarity || "").toUpperCase()} {card.condition ? `| ${card.condition}` : ""}
          </p>
          <p className="font-bold text-sm mt-1">BND ${price}</p>
        </div>
      </div>

      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-md py-1 text-center"
      >
        WhatsApp
      </a>
    </div>
  );
}

