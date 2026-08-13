// Botón temporal SOLO para probar composeStyleJournalImage.ts durante Fase
// 4 — no forma parte del feature, se borra junto con el resto de
// dev-style-journal antes del PR.

"use client";

import { useState } from "react";
import { composeStyleJournalImage } from "@/lib/outfits/composeStyleJournalImage";
import type { ClothingItem } from "@/types/database";

export default function ExportTestButton({
  items,
  outfitName,
}: {
  items: ClothingItem[];
  outfitName: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Editable solo para probar casos límite (nombre largo) sin tocar código.
  const [name, setName] = useState(outfitName);

  async function onExport() {
    setLoading(true);
    setError(null);
    try {
      const blob = await composeStyleJournalImage(items, name);
      setUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-2 block w-[420px] rounded-md border border-border px-3 py-1.5 text-sm"
      />
      <button
        type="button"
        onClick={onExport}
        disabled={loading}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Componiendo..." : "Exportar Style Journal (test)"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {url && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Export de prueba" className="w-[300px] rounded-lg border border-border" />
          <a href={url} download="style-journal-test.jpg" className="mt-2 block text-sm text-primary underline">
            Descargar
          </a>
        </div>
      )}
    </div>
  );
}
