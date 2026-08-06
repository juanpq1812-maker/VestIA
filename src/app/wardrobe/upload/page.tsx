// Pantalla "Subir prenda" (/wardrobe/upload).
//
// El shell (header + saludo) se renderiza en el servidor para resolver el
// usuario y su display_name. La logica del formulario (file input, compresion,
// upload a Storage e insert en clothing_items) vive en `UploadForm`, un
// Client Component.
//
// La proteccion de la ruta y el gate del onboarding la hace el Proxy
// (`src/proxy.ts`); aqui solo leemos defensivamente.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import UploadForm from "@/components/wardrobe/UploadForm";
import BurstCapture from "@/components/wardrobe/BurstCapture";
import OutfitPhotoCapture from "@/components/wardrobe/OutfitPhotoCapture";
import UploadModeChooser from "@/components/wardrobe/UploadModeChooser";

// El pipeline de imagen (Gemini + @imgly/background-removal-node) puede
// tardar unos segundos, más si el contenedor está frío y @imgly tiene que
// descargar el modelo de Supabase Storage (~10-16s medido) — ver
// src/lib/ai/imageBackgroundRemoval.ts. Fluid Compute ya da 300s por
// default, esto es explícito para que quede documentado en el código.
//
// POR QUÉ 120 Y NO 60 (subido 2026-08-05):
// El camino de reconstrucción encadena Gemini (≤30s) y @imgly (≤25s) en la
// MISMA request. Con el techo en 60s quedaban ~4.7s para todo lo demás —
// base64 de ~1MB, encode PNG, red, serialización — y eso no alcanza. Medido
// sobre la tabla de auditoría: media 26.6s, max 42.8s, o sea 71% del
// presupuesto viejo consumido por una sola prenda.
//
// El techo de 60s era AUTOIMPUESTO, no de la plataforma. Subirlo no hace la
// subida más lenta (solo eleva el límite) y elimina la clase de fallo que
// causó la regresión de c32deab, en vez de repartir un presupuesto que ya iba
// justo. La alternativa era encoger los timeouts, que empeora el bug que
// estamos arreglando: menos tiempo para @imgly = más caídas al recorte por
// color, que es el que no recorta fondos no blancos.
//
// Contrapartida aceptada: Fluid factura por CPU, así que una request que
// antes moría a los 60s ahora puede consumir hasta 120.
export const maxDuration = 120;

type Props = {
  searchParams: Promise<{ modo?: string }>;
};

type Modo = "individual" | "outfit" | "burst";

const TITLES: Record<Modo, string> = {
  individual:
    "Sube una foto, dinos qué es y para qué ocasiones la usas. Va directo a tu armario y queda lista para que la IA la combine.",
  outfit:
    "Sube una foto de tu outfit completo y detectamos cada prenda por ti — revisa y confirma el lote al final.",
  burst:
    "Captura tus prendas una tras otra sin pausas — analizamos todo en segundo plano mientras sigues fotografiando.",
};

function parseModo(raw: string | undefined): Modo | null {
  return raw === "individual" || raw === "outfit" || raw === "burst" ? raw : null;
}

export default async function UploadPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const sp = await searchParams;
  const modo = parseModo(sp.modo);

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} displayName={profile?.display_name} hideNav />

      <main className="flex-1 pb-24 pt-10 sm:pb-14 sm:pt-14">
        <Container size="md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-text-muted">Armario digital</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-text sm:text-4xl">
                Subir prenda
              </h1>
              <p className="mt-2 max-w-xl text-base text-text-muted">
                {modo ? TITLES[modo] : "¿Cómo quieres subir tus prendas hoy? Elige la forma que más te convenga."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {modo ? (
                <Link href="/wardrobe/upload">
                  <Button variant="ghost">Cambiar forma de subir</Button>
                </Link>
              ) : null}
              <Link href="/wardrobe">
                <Button variant="ghost">Volver al armario</Button>
              </Link>
            </div>
          </div>

          <div className="mt-8">
            {modo === null ? <UploadModeChooser /> : null}
            {modo === "individual" ? <UploadForm /> : null}
            {modo === "outfit" ? <OutfitPhotoCapture /> : null}
            {modo === "burst" ? <BurstCapture /> : null}
          </div>
        </Container>
      </main>
    </div>
  );
}
