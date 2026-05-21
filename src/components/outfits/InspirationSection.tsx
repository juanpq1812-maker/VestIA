"use client";

import { useState, useRef, useTransition, type ChangeEvent } from "react";
import Button from "@/components/ui/Button";
import {
  analyzeInspirationPhotoAction,
  type DetectedGarment,
} from "@/app/outfits/actions";
import { getTiendasParaCategoria, buildStoreUrl } from "@/lib/outfits/tiendas";

const CATEGORY_EMOJI: Record<string, string> = {
  top: "👕",
  bottom: "👖",
  dress: "👗",
  outerwear: "🧥",
  footwear: "👟",
  accessory: "🧢",
};

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

type Props = {
  onApplyInspiration: (description: string) => void;
};

export default function InspirationSection({ onApplyInspiration }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prendas, setPrendas] = useState<DetectedGarment[] | null>(null);
  const [estiloGeneral, setEstiloGeneral] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetState() {
    setPrendas(null);
    setEstiloGeneral("");
    setError(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Formato no soportado. Usa JPEG, PNG o WebP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("La imagen es muy grande. Máximo 3 MB.");
      return;
    }

    setError(null);
    setPrendas(null);
    setEstiloGeneral("");

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);

      const commaIdx = dataUrl.indexOf(",");
      if (commaIdx === -1) {
        setError("No se pudo leer el archivo. Intenta de nuevo.");
        return;
      }
      const base64 = dataUrl.slice(commaIdx + 1);
      const header = dataUrl.slice(0, commaIdx);
      const mimeType = header.match(/data:([^;]+)/)?.[1] ?? file.type;

      startTransition(async () => {
        const res = await analyzeInspirationPhotoAction({
          imageBase64: base64,
          mimeType,
        });
        if (res.ok) {
          setPrendas(res.prendas);
          setEstiloGeneral(res.estilo_general);
        } else {
          setError(res.error);
        }
      });
    };
    reader.onerror = () =>
      setError("No se pudo leer el archivo. Intenta de nuevo.");
    reader.readAsDataURL(file);

    e.target.value = "";
  }

  function handleGenerarSimilar() {
    if (!prendas || prendas.length === 0) return;
    const partes = prendas
      .map((p) => `${p.tipo} ${p.descripcion}`.trim())
      .join(", ");
    const desc = estiloGeneral ? `Estilo ${estiloGeneral}: ${partes}` : partes;
    onApplyInspiration(desc.slice(0, 200));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-text">
          📸 Inspírate
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Sube una foto de un look que te guste y te recomendamos dónde
          conseguirlo
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Subir foto de inspiración"
      />

      {!preview ? (
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface-2 p-8 text-center transition-colors hover:border-primary hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span aria-hidden="true" className="text-4xl">
              📷
            </span>
            <span className="font-semibold text-text">
              Subir foto de inspiración
            </span>
            <span className="text-xs text-text-muted">
              JPEG, PNG o WebP · Máx 3 MB
            </span>
          </button>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Foto de inspiración"
              className="max-h-72 w-full rounded-xl bg-surface-2 object-contain"
            />
            <button
              type="button"
              onClick={resetState}
              className="absolute right-2 top-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text shadow-sm hover:bg-surface-2"
            >
              Cambiar
            </button>
          </div>

          {isPending && (
            <div className="flex items-center gap-3 py-2 text-sm text-text-muted">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Analizando outfit con IA...
            </div>
          )}

          {!isPending && error && (
            <p className="rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          {!isPending && prendas && prendas.length > 0 && (
            <div className="space-y-5">
              {estiloGeneral && (
                <p className="rounded-lg bg-surface-2 px-4 py-3 text-sm">
                  <span className="font-semibold text-text">Identifico:</span>{" "}
                  <span className="text-text-muted">
                    {prendas
                      .map((p) => `${p.tipo} ${p.descripcion}`.trim())
                      .join(", ")}
                  </span>
                </p>
              )}

              <div className="space-y-4">
                {prendas.map((prenda, i) => {
                  const tiendas = getTiendasParaCategoria(
                    prenda.categoria,
                    prenda.genero
                  );
                  const emoji = CATEGORY_EMOJI[prenda.categoria] ?? "👔";
                  return (
                    <div key={i}>
                      <p className="mb-2 text-sm font-semibold text-text">
                        {emoji} {prenda.tipo}
                        {prenda.descripcion && (
                          <span className="ml-1 font-normal text-text-muted">
                            — {prenda.descripcion}
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tiendas.map((tienda) => (
                          <a
                            key={tienda.nombre}
                            href={buildStoreUrl(
                              tienda,
                              `${prenda.tipo} ${prenda.descripcion}`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-primary-light hover:text-primary"
                          >
                            {tienda.logo} {tienda.nombre}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button variant="primary" onClick={handleGenerarSimilar}>
                ✨ Generar outfit similar con mi armario
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
