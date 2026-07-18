// Formulario crear/editar de /admin/hilo. Client Component: sube imágenes
// directo a Storage (mismo patrón que UploadForm.tsx — compresión client-side
// con browser-image-compression), maneja el editor de bloques y llama al
// server action correspondiente.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LazyImage from "@/components/ui/LazyImage";
import EditorialPostBody from "@/components/editorial/EditorialPostBody";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import {
  EDITORIAL_IMAGES_BUCKET,
  buildEditorialImagePath,
  publicEditorialImageUrl,
} from "@/lib/storage/editorialImages";
import {
  ALLOWED_MIME_TYPES,
  COMPRESS_MAX_WIDTH_OR_HEIGHT,
  COMPRESS_QUALITY,
  MAX_COMPRESSED_BYTES,
} from "@/lib/wardrobe/constants";
import {
  BLOCK_TYPE_LABEL,
  emptyBlockOfType,
  type EditorialBlock,
} from "@/lib/editorial/blocks";
import { EDITORIAL_CATEGORY_LABEL, type EditorialCategory, type EditorialStatus } from "@/lib/editorial/types";
import {
  createEditorialPostAction,
  updateEditorialPostAction,
  type EditorialPostInput,
} from "@/app/admin/hilo/actions";

const CATEGORIES = Object.keys(EDITORIAL_CATEGORY_LABEL) as EditorialCategory[];
const BLOCK_TYPES = Object.keys(BLOCK_TYPE_LABEL) as EditorialBlock["type"][];

export type EditorialPostFormInitial = {
  id?: string;
  title: string;
  subtitle: string;
  category: EditorialCategory;
  brandName: string;
  brandUrl: string;
  authorName: string;
  coverImagePath: string;
  content: EditorialBlock[];
  status: EditorialStatus;
};

async function compressAndUpload(file: File): Promise<{ path: string } | { error: string }> {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { error: "Formato no soportado. Usa JPG, PNG o WEBP." };
  }

  let compressed: File;
  try {
    compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: COMPRESS_MAX_WIDTH_OR_HEIGHT,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: COMPRESS_QUALITY,
    });
  } catch {
    return { error: "No pudimos procesar la imagen. Prueba con otra foto." };
  }

  if (compressed.size > MAX_COMPRESSED_BYTES) {
    return { error: "La imagen comprimida sigue pesando demasiado. Prueba con otra foto." };
  }

  const supabase = createSupabaseBrowserClient();
  const uuid = crypto.randomUUID();
  const path = buildEditorialImagePath({ fileName: compressed.name, uuid });

  const { error } = await supabase.storage
    .from(EDITORIAL_IMAGES_BUCKET)
    .upload(path, compressed, { contentType: compressed.type, upsert: false });

  if (error) return { error: `No pudimos subir la imagen: ${error.message}` };

  return { path };
}

export default function EditorialPostForm({ initial }: { initial: EditorialPostFormInitial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [category, setCategory] = useState<EditorialCategory>(initial.category);
  const [brandName, setBrandName] = useState(initial.brandName);
  const [brandUrl, setBrandUrl] = useState(initial.brandUrl);
  const [authorName, setAuthorName] = useState(initial.authorName);
  const [coverImagePath, setCoverImagePath] = useState(initial.coverImagePath);
  const [blocks, setBlocks] = useState<EditorialBlock[]>(initial.content);

  const [coverUploading, setCoverUploading] = useState(false);
  const [uploadingBlockIndex, setUploadingBlockIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleCategoryChange(next: EditorialCategory) {
    setCategory(next);
    if (next !== "drop") {
      setBrandName("");
      setBrandUrl("");
    }
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setCoverUploading(true);
    const result = await compressAndUpload(file);
    setCoverUploading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setCoverImagePath(result.path);
  }

  async function handleBlockImageChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploadingBlockIndex(index);
    const result = await compressAndUpload(file);
    setUploadingBlockIndex(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    updateBlock(index, { path: result.path });
  }

  function addBlock(type: EditorialBlock["type"]) {
    setBlocks((prev) => [...prev, emptyBlockOfType(type)]);
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateBlock(index: number, patch: Partial<EditorialBlock>) {
    setBlocks((prev) =>
      prev.map((b, i) => (i === index ? ({ ...b, ...patch } as EditorialBlock) : b))
    );
  }

  async function handleSubmit(status: EditorialStatus) {
    setError(null);

    if (!coverImagePath) {
      setError("Sube una portada antes de guardar.");
      return;
    }

    setSaving(true);

    const payload: EditorialPostInput = {
      title,
      subtitle,
      category,
      brandName,
      brandUrl,
      authorName,
      coverImagePath,
      content: blocks,
      status,
    };

    const res = initial.id
      ? await updateEditorialPostAction(initial.id, payload)
      : await createEditorialPostAction(payload);

    // Si el server action redirige (caso ok), esta línea no se alcanza.
    if (!res.ok) {
      setError(res.error);
      setSaving(false);
    }
  }

  if (showPreview) {
    return (
      <div className="mt-6">
        <Button type="button" variant="ghost" onClick={() => setShowPreview(false)}>
          ← Volver a editar
        </Button>
        <div className="mt-6">
          <EditorialPostBody
            title={title}
            subtitle={subtitle}
            authorName={authorName || "Equipo StrandIA"}
            category={category}
            brandName={brandName}
            brandUrl={brandUrl}
            coverImagePath={coverImagePath}
            publishedAt={null}
            blocks={blocks}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-5">
      <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Input
        label="Subtítulo (opcional)"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
      />

      <div>
        <label className="text-sm font-semibold text-text">Categoría</label>
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value as EditorialCategory)}
          className="mt-2 w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-text focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EDITORIAL_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      {category === "drop" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Marca"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Ej. Zara"
          />
          <Input
            label="URL de la marca"
            value={brandUrl}
            onChange={(e) => setBrandUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      ) : null}

      <Input
        label="Autor"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        placeholder="Equipo StrandIA"
      />

      <div>
        <label className="text-sm font-semibold text-text">Portada</label>
        <div className="mt-2 flex items-center gap-4">
          {coverImagePath ? (
            <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              <LazyImage
                src={publicEditorialImageUrl(coverImagePath)}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs text-text-muted">
              Sin portada
            </div>
          )}
          <label className="cursor-pointer rounded-full border border-border px-4 py-2 text-xs font-semibold text-text transition-colors hover:bg-surface-2">
            {coverUploading ? "Subiendo…" : coverImagePath ? "Cambiar" : "Subir portada"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={coverUploading}
              onChange={handleCoverChange}
            />
          </label>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-text">Contenido</label>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {blocks.map((block, i) => (
            <BlockEditorCard
              key={i}
              block={block}
              index={i}
              total={blocks.length}
              uploading={uploadingBlockIndex === i}
              onMove={moveBlock}
              onRemove={removeBlock}
              onUpdate={updateBlock}
              onImageChange={handleBlockImageChange}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {BLOCK_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addBlock(t)}
              className="rounded-full border border-dashed border-border px-4 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-primary-mid hover:text-text"
            >
              + {BLOCK_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          isLoading={saving}
          loadingText="Guardando…"
          onClick={() => handleSubmit("draft")}
        >
          Guardar borrador
        </Button>
        <Button type="button" isLoading={saving} loadingText="Publicando…" onClick={() => handleSubmit("published")}>
          Publicar
        </Button>
        <Button type="button" variant="ghost" onClick={() => setShowPreview(true)}>
          Vista previa
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/hilo")}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function BlockEditorCard({
  block,
  index,
  total,
  uploading,
  onMove,
  onRemove,
  onUpdate,
  onImageChange,
}: {
  block: EditorialBlock;
  index: number;
  total: number;
  uploading: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<EditorialBlock>) => void;
  onImageChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Card padding="sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {BLOCK_TYPE_LABEL[block.type]}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label="Subir bloque"
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            aria-label="Bajar bloque"
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label="Eliminar bloque"
            className="flex h-7 w-7 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger-light"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-3">
        {block.type === "paragraph" ? (
          <textarea
            value={block.text}
            onChange={(e) => onUpdate(index, { text: e.target.value })}
            rows={4}
            placeholder="Texto del párrafo"
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
          />
        ) : null}

        {block.type === "heading" ? (
          <input
            value={block.text}
            onChange={(e) => onUpdate(index, { text: e.target.value })}
            placeholder="Subtítulo dentro del artículo"
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
          />
        ) : null}

        {block.type === "quote" ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={block.text}
              onChange={(e) => onUpdate(index, { text: e.target.value })}
              rows={2}
              placeholder="Texto de la cita"
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
            <input
              value={block.attribution ?? ""}
              onChange={(e) => onUpdate(index, { attribution: e.target.value })}
              placeholder="Atribución (opcional)"
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        ) : null}

        {block.type === "image" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              {block.path ? (
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  <LazyImage
                    src={publicEditorialImageUrl(block.path)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[11px] text-text-muted">
                  Sin imagen
                </div>
              )}
              <label className="cursor-pointer rounded-full border border-border px-4 py-2 text-xs font-semibold text-text transition-colors hover:bg-surface-2">
                {uploading ? "Subiendo…" : block.path ? "Cambiar" : "Subir imagen"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => onImageChange(index, e)}
                />
              </label>
            </div>
            <input
              value={block.caption ?? ""}
              onChange={(e) => onUpdate(index, { caption: e.target.value })}
              placeholder="Pie de foto (opcional)"
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
