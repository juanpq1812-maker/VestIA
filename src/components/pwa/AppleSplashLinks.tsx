// Imágenes de arranque de iOS (apple-touch-startup-image). Sin estos <link>,
// al abrir la PWA desde el home screen iOS muestra un frame negro antes de
// pintar el contenido web. Cada dispositivo necesita su propia imagen y media
// query exacta (device-width/height + pixel-ratio + orientación). Las imágenes
// (fondo #fcf9f6 + logo centrado) están en /public/splash y se generan con el
// script scratchpad/gen-splash.mjs.
//
// iPhones solo en portrait (la PWA se abre en vertical); iPads en ambas.

const SPLASH = [
  { m: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", h: "/splash/apple-splash-750x1334.png" },
  { m: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", h: "/splash/apple-splash-1242x2208.png" },
  { m: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", h: "/splash/apple-splash-1125x2436.png" },
  { m: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", h: "/splash/apple-splash-828x1792.png" },
  { m: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", h: "/splash/apple-splash-1242x2688.png" },
  { m: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", h: "/splash/apple-splash-1170x2532.png" },
  { m: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", h: "/splash/apple-splash-1284x2778.png" },
  { m: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", h: "/splash/apple-splash-1179x2556.png" },
  { m: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", h: "/splash/apple-splash-1290x2796.png" },
  { m: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", h: "/splash/apple-splash-1206x2622.png" },
  { m: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", h: "/splash/apple-splash-1320x2868.png" },
  { m: "(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", h: "/splash/apple-splash-1260x2736.png" }, // iPhone Air (2025)
  { m: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", h: "/splash/apple-splash-1536x2048.png" },
  { m: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", h: "/splash/apple-splash-2048x1536.png" },
  { m: "(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", h: "/splash/apple-splash-1620x2160.png" },
  { m: "(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", h: "/splash/apple-splash-2160x1620.png" },
  { m: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", h: "/splash/apple-splash-1640x2360.png" },
  { m: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", h: "/splash/apple-splash-2360x1640.png" },
  { m: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", h: "/splash/apple-splash-1668x2224.png" },
  { m: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", h: "/splash/apple-splash-2224x1668.png" },
  { m: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", h: "/splash/apple-splash-1668x2388.png" },
  { m: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", h: "/splash/apple-splash-2388x1668.png" },
  { m: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", h: "/splash/apple-splash-2048x2732.png" },
  { m: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", h: "/splash/apple-splash-2732x2048.png" },
];

export default function AppleSplashLinks() {
  return (
    <>
      {SPLASH.map((s) => (
        <link key={s.h} rel="apple-touch-startup-image" media={s.m} href={s.h} />
      ))}
    </>
  );
}
