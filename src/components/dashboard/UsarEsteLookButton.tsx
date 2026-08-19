// "Usar este look": registra que el usuario se puso hoy el outfit del hero.
//
// Hay dos casos y no son el mismo:
//
//   savedOutfit  El look ya existe en `outfits` (estado "look" del hero, que
//                sale de los guardados). Solo falta la fila en `outfit_uses`.
//
//   suggestion   La sugerencia por evento vive en `event_outfit_suggestions`,
//                que NO tiene fila en `outfits`. Y registerOutfitUseAction
//                exige un outfitId de esa tabla — verifica propiedad contra
//                ella. Así que primero hay que materializar el outfit.
//
// Se materializa AL USAR, no al sugerir: `outfits` solo recibe filas de looks
// que el usuario efectivamente se puso. Si cacheáramos cada sugerencia como
// outfit, la lista de guardados se llenaría de looks que nadie usó nunca.
//
// El UNIQUE (outfit_id, used_date) del esquema cubre el doble tap: el segundo
// vuelve con ALREADY_REGISTERED, que acá se trata como éxito — el usuario
// quería dejar constancia de que lo usó hoy, y eso ya está.

"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import {
  registerOutfitUseAction,
  saveAndUseOutfitTodayAction,
} from "@/app/outfits/actions";

type Props =
  | { modo: "savedOutfit"; outfitId: string }
  | {
      modo: "suggestion";
      name: string;
      occasion: string | null;
      clothingItemIds: string[];
    };

export default function UsarEsteLookButton(props: Props) {
  const [enCurso, setEnCurso] = useState(false);
  const [usado, setUsado] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    kind: "success" | "error";
  } | null>(null);

  async function usar() {
    setEnCurso(true);
    try {
      const res =
        props.modo === "savedOutfit"
          ? await registerOutfitUseAction({
              outfitId: props.outfitId,
              daysAgo: 0,
            })
          : await saveAndUseOutfitTodayAction({
              name: props.name,
              occasion: props.occasion,
              notes: null,
              clothing_item_ids: props.clothingItemIds,
            });

      if (res.ok === true) {
        setUsado(true);
        setToast({ msg: "Anotado: hoy usaste este look.", kind: "success" });
        return;
      }

      // El outfit quedó guardado pero el uso no: el usuario no perdió nada,
      // y decirle "error" a secas lo haría reintentar y duplicar el outfit.
      if (res.ok === "partial") {
        setUsado(true);
        setToast({
          msg: "Guardamos el look, pero no pudimos anotar el uso.",
          kind: "error",
        });
        return;
      }

      // Ya registrado hoy es lo que el usuario quería: no es un error suyo.
      if ("code" in res && res.code === "ALREADY_REGISTERED") {
        setUsado(true);
        setToast({ msg: "Ya lo tenías anotado para hoy.", kind: "success" });
        return;
      }

      setToast({ msg: res.error, kind: "error" });
    } catch {
      setToast({
        msg: "No pudimos anotar el uso. Intenta de nuevo.",
        kind: "error",
      });
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <>
      {usado ? (
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-light px-6 py-3 text-sm font-semibold text-primary">
          <IconoCheck />
          Lo usaste hoy
        </p>
      ) : (
        <Button
          size="lg"
          onClick={usar}
          isLoading={enCurso}
          loadingText="Anotando…"
        >
          Usar este look
        </Button>
      )}

      {toast && (
        <Toast
          message={toast.msg}
          kind={toast.kind}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

function IconoCheck() {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  );
}
