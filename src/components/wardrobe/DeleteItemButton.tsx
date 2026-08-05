// Botón para eliminar una prenda del armario, con confirmación en modal.
//
// El borrado va directo con el browser client bajo RLS (policy
// `clothing_items_delete_own`). Primero borramos la fila; luego, en
// best-effort, la imagen del Storage — si esa parte falla solo queda un
// archivo huérfano, nunca una fila apuntando a una imagen inexistente.
//
// `outfits.clothing_item_ids` es un array de UUID (no FK): borrar la prenda no
// rompe integridad; un id colgante simplemente no se hidrata al mostrar outfits.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { CLOTHING_IMAGES_BUCKET } from "@/lib/storage/clothingImages";

type Props = {
  itemId: string;
  imagePath: string | null;
  /** Miniatura de la grilla, si la prenda la tiene — se borra junto con la foto. */
  thumbnailPath?: string | null;
  itemName: string;
};

export default function DeleteItemButton({ itemId, imagePath, thumbnailPath, itemName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cierra con ESC (salvo mientras borra) y bloquea el scroll del body.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, deleting]);

  const onConfirm = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr || !user) {
        setError("Tu sesión expiró. Vuelve a iniciar sesión.");
        setDeleting(false);
        return;
      }

      const { error: delErr } = await supabase
        .from("clothing_items")
        .delete()
        .eq("id", itemId)
        .eq("user_id", user.id);

      if (delErr) {
        setError(`No pudimos eliminar la prenda: ${delErr.message}.`);
        setDeleting(false);
        return;
      }

      // Best-effort: la imagen del Storage y su miniatura. Un fallo aquí no es
      // crítico (quedan huérfanos, no rompen nada).
      const paths = [imagePath, thumbnailPath].filter(
        (p): p is string => Boolean(p)
      );
      if (paths.length > 0) {
        try {
          await supabase.storage.from(CLOTHING_IMAGES_BUCKET).remove(paths);
        } catch {
          /* archivos huérfanos, se ignoran */
        }
      }

      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
      setDeleting(false);
    }
  }, [itemId, imagePath, thumbnailPath, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Eliminar ${itemName}`}
        title="Eliminar prenda"
        className="absolute bottom-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-text-muted shadow-sm backdrop-blur transition-colors hover:bg-danger hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-text/40 p-4 sm:items-center"
          style={{ animation: "fadeIn 160ms ease-out" }}
          onClick={() => {
            if (!deleting) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-item-title"
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
            style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4">
              <h2
                id="delete-item-title"
                className="font-display text-xl font-semibold text-text"
              >
                ¿Eliminar prenda?
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                Vas a eliminar{" "}
                <span className="font-semibold text-text">«{itemName}»</span>.
                Esta acción no se puede deshacer.
              </p>
              {error ? (
                <p
                  role="alert"
                  className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
                >
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="inline-flex items-center justify-center rounded-full border border-border bg-transparent px-5 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={deleting}
                aria-busy={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-danger px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
              >
                {deleting ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                      aria-hidden="true"
                    />
                    Eliminando…
                  </>
                ) : (
                  "Eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
