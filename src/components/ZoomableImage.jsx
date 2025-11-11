import { useState } from "react";
import { createPortal } from "react-dom";

export default function ZoomableImage({ src, alt = "", zoomSrc }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className="cursor-zoom-in rounded-lg w-full h-[160px] object-contain"
        onClick={() => {
          console.log("[ZoomableImage] thumb clicked");
          setOpen(true);
        }}
        loading="lazy"
      />

      {open && createPortal(
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center"
          style={{ zIndex: 999999 }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <img
            src={zoomSrc || src}
            alt={alt}
            className="max-w-[95vw] max-h-[90vh] rounded-lg"
          />
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded"
          >✕</button>
        </div>,
        document.body
      )}
    </>
  );
}
