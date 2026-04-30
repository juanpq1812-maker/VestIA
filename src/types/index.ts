// Tipos compartidos del MVP de VestIA.
// Iremos completando estos tipos a medida que conectemos Supabase y la API de Anthropic.

export type Usuario = {
  id: string;
  email: string;
  nombre?: string;
};

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
