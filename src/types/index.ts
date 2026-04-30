// Tipos compartidos del MVP de VestIA.
// Iremos completando estos tipos a medida que conectemos Supabase y la API de Anthropic.

import type { User } from "@supabase/supabase-js";

export type Usuario = {
  id: string;
  email: string;
  nombre?: string;
};

// Tipo de usuario tal como lo devuelve Supabase Auth. Lo re-exportamos para que el
// resto de la app no tenga que importar directamente desde `@supabase/supabase-js`.
export type UsuarioAuth = User;

export type Prenda = {
  id: string;
  usuarioId: string;
  nombre: string;
  categoria: string;
  imagenUrl: string;
  creadaEn: string;
};

export type Outfit = {
  id: string;
  usuarioId: string;
  prendas: Prenda[];
  ocasion: string;
  creadoEn: string;
};
