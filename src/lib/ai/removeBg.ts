// Llama a la API de Remove.bg para eliminar el fondo de una imagen.
// Solo se debe usar desde Server Components o Server Actions.

const REMOVE_BG_ENDPOINT = "https://api.remove.bg/v1.0/removebg";

function getApiKey(): string {
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error("Falta REMOVE_BG_API_KEY en las variables de entorno.");
  }
  return key;
}

/**
 * Envía `imageBlob` a Remove.bg y devuelve un Blob PNG con el fondo eliminado.
 * Lanza un error si la API responde con un código no-2xx.
 */
export async function removeBackground(imageBlob: Blob): Promise<Blob> {
  const apiKey = getApiKey();

  const body = new FormData();
  body.append("image_file", imageBlob, "photo.jpg");
  body.append("size", "auto");

  const response = await fetch(REMOVE_BG_ENDPOINT, {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(
      `[removeBg] Remove.bg respondió HTTP ${response.status}`,
      text.slice(0, 300),
    );
    throw new Error(`Remove.bg HTTP ${response.status}`);
  }

  return response.blob();
}
