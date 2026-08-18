// Motor del volteo de página del cuaderno Premium — un solo camino de
// código para "usuario soltó el arrastre pasado el umbral" y "click en un
// dot", así ambos animan exactamente igual (ver PremiumJournalSpread.tsx).
//
// No usa `transition` de CSS para el giro: el overlay de sombra necesita
// una curva de opacidad NO lineal (sube hacia la mitad del recorrido, baja
// al final) perfectamente sincronizada con el ángulo interpolado en cada
// instante, y CSS no expone ese valor intermedio frame a frame sin parsear
// `getComputedStyle` (frágil, y con drift de punto flotante). Un solo
// `requestAnimationFrame` que escribe ángulo Y sombra en el mismo tick
// garantiza que nunca se desincronicen.

/** Evalúa un cubic-bezier(x1,y1,x2,y2) en el tiempo t (0-1) y devuelve el
 * progreso de la animación — Newton-Raphson sobre x(t), mismo algoritmo que
 * usan librerías como bezier-easing. Los mismos cuatro parámetros que
 * `transition: cubic-bezier(...)` usaría en CSS. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const A = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1;
  const B = (a1: number, a2: number) => 3 * a2 - 6 * a1;
  const C = (a1: number) => 3 * a1;

  const bezierX = (t: number) => ((A(x1, x2) * t + B(x1, x2)) * t + C(x1)) * t;
  const bezierY = (t: number) => ((A(y1, y2) * t + B(y1, y2)) * t + C(y1)) * t;
  const dBezierX = (t: number) => 3 * A(x1, x2) * t * t + 2 * B(x1, x2) * t + C(x1);

  function solveT(x: number): number {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = bezierX(t) - x;
      const d = dBezierX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    return Math.min(1, Math.max(0, t));
  }

  return (x: number) => bezierY(solveT(x));
}

// Un poco de peso, no un rebote — el mismo criterio que ya pedía el plan
// original: "algo con peso, no elástico".
const FLIP_EASING = cubicBezier(0.25, 0.8, 0.35, 1);
export const FLIP_DURATION_MS = 600;

/** Pico de opacidad de la sombra a mitad del volteo (canto perpendicular a
 * cámara — máximo volumen percibido). */
export const MAX_SHADOW_OPACITY = 0.35;

/** Opacidad del overlay de sombra en un ángulo dado (0 a -180): sube hacia
 * la mitad del recorrido (90°) y baja al llegar a cualquiera de los
 * extremos. Misma fórmula para ambas caras — cuál de las dos está
 * realmente visible en cada momento lo decide `backface-visibility`, no
 * esta función. */
export function shadowOpacityForAngle(angleDeg: number): number {
  const progress = Math.min(1, Math.abs(angleDeg) / 180);
  return MAX_SHADOW_OPACITY * Math.sin(progress * Math.PI);
}

type FlipTweenOptions = {
  from: number;
  to: number;
  duration?: number;
  onFrame: (angle: number) => void;
  onDone: () => void;
};

/** Corre el volteo completo con requestAnimationFrame, escribiendo
 * directo al DOM vía `onFrame` (el caller pasa un callback que muta
 * `ref.style`, sin pasar por React state hasta `onDone`) — así no hay
 * re-render de por medio mientras gira. Devuelve una función de
 * cancelación, para poder cortar en seco si el usuario arranca otro gesto
 * a mitad del tween. */
export function runFlipTween({
  from,
  to,
  duration = FLIP_DURATION_MS,
  onFrame,
  onDone,
}: FlipTweenOptions): () => void {
  let cancelled = false;
  const start = performance.now();

  function tick(now: number) {
    if (cancelled) return;
    const elapsed = now - start;
    const t = Math.min(1, duration <= 0 ? 1 : elapsed / duration);
    onFrame(from + (to - from) * FLIP_EASING(t));
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      onDone();
    }
  }

  requestAnimationFrame(tick);
  return () => {
    cancelled = true;
  };
}
