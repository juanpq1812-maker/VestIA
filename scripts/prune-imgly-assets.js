// postinstall: poda lo que @imgly/background-removal-node y onnxruntime-node
// instalan de más para nuestro caso de uso, para no reventar el límite de
// 250MB (descomprimido) de las funciones serverless de Vercel.
//
// Corre en CADA `npm install` — tanto en tu máquina como en la build de
// Vercel — y poda según el entorno donde se ejecuta, nunca a ciegas:
//
// 1. Modelos de @imgly (dist/resources.json + los chunks .onnx, ~126MB):
//    nunca se leen del disco local — src/lib/ai/imageBackgroundRemoval.ts
//    siempre pasa `publicPath` apuntando a Supabase Storage. Se borran
//    siempre, en cualquier plataforma.
//
// 2. Binarios nativos de onnxruntime-node (~133MB para las 6 plataformas):
//    se conserva SOLO el par process.platform/process.arch de la máquina
//    que corre este script. En tu Mac (dev) sobrevive darwin/arm64; en el
//    build de Vercel (Linux) sobrevive linux/x64. Así nunca rompemos
//    `npm run dev` local podando el binario que tu propia máquina necesita.
//
// Si @imgly o onnxruntime-node cambian su estructura de carpetas en una
// futura versión, este script debe fallar en silencio (solo un warning) —
// nunca bloquear `npm install` completo por un cambio en una poda que es
// pura optimización de tamaño, no funcionalidad.

const fs = require("fs");
const path = require("path");

function safeRun(label, fn) {
  try {
    fn();
  } catch (err) {
    console.warn(`[prune-imgly-assets] ${label} — se omitió la poda: ${err.message}`);
  }
}

function pruneImglyModels() {
  const distDir = path.join(
    __dirname,
    "..",
    "node_modules",
    "@imgly",
    "background-removal-node",
    "dist"
  );
  const resourcesPath = path.join(distDir, "resources.json");
  if (!fs.existsSync(resourcesPath)) {
    console.warn("[prune-imgly-assets] @imgly no instalado o dist/resources.json no existe — nada que podar.");
    return;
  }

  const resources = JSON.parse(fs.readFileSync(resourcesPath, "utf8"));
  const hashes = new Set();
  for (const entry of Object.values(resources)) {
    for (const chunk of entry.chunks ?? []) {
      if (chunk.hash) hashes.add(chunk.hash);
    }
  }

  let bytesFreed = 0;
  let filesDeleted = 0;
  for (const hash of hashes) {
    const filePath = path.join(distDir, hash);
    if (fs.existsSync(filePath)) {
      bytesFreed += fs.statSync(filePath).size;
      fs.unlinkSync(filePath);
      filesDeleted++;
    }
  }
  // El manifest ya no sirve sin sus chunks — lo borramos también (nunca se
  // lee: siempre pasamos publicPath remoto).
  fs.unlinkSync(resourcesPath);

  console.log(
    `[prune-imgly-assets] @imgly: podados ${filesDeleted} archivos de modelo local (${(bytesFreed / 1024 / 1024).toFixed(1)}MB) — se sirven desde Supabase Storage en runtime.`
  );
}

function pruneOnnxruntimePlatforms() {
  const napiDir = path.join(__dirname, "..", "node_modules", "onnxruntime-node", "bin", "napi-v3");
  if (!fs.existsSync(napiDir)) {
    console.warn("[prune-imgly-assets] onnxruntime-node no instalado — nada que podar.");
    return;
  }

  const keepPlatform = process.platform; // 'darwin' | 'linux' | 'win32'
  const keepArch = process.arch; // 'arm64' | 'x64'

  let bytesFreed = 0;
  let dirsDeleted = 0;
  for (const platform of fs.readdirSync(napiDir)) {
    const platformDir = path.join(napiDir, platform);
    if (!fs.statSync(platformDir).isDirectory()) continue;

    for (const arch of fs.readdirSync(platformDir)) {
      const archDir = path.join(platformDir, arch);
      if (!fs.statSync(archDir).isDirectory()) continue;
      if (platform === keepPlatform && arch === keepArch) continue;

      bytesFreed += dirSize(archDir);
      fs.rmSync(archDir, { recursive: true, force: true });
      dirsDeleted++;
    }
  }

  console.log(
    `[prune-imgly-assets] onnxruntime-node: podadas ${dirsDeleted} plataformas no usadas (${(bytesFreed / 1024 / 1024).toFixed(1)}MB) — conservado solo ${keepPlatform}/${keepArch}.`
  );
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

safeRun("poda de modelos @imgly", pruneImglyModels);
safeRun("poda de plataformas onnxruntime-node", pruneOnnxruntimePlatforms);
