// Helper para leer las variables de entorno de Supabase con un mensaje de error claro
// si alguien olvida configurarlas en `.env.local`. Centralizamos esto para no repetir
// la misma lectura/validacion en cada cliente.

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase. Copia `.env.local.example` a `.env.local` y pega tu Project URL y anon key."
    );
  }

  return { url, anonKey };
}
