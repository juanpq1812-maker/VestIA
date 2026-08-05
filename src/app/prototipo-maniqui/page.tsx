// Prototipo visual aislado — NO forma parte del flujo real de subida.
// Nada de lo que pasa acá se guarda ni se conecta a Vision ni a la base de
// datos. Es una maqueta clickeable para decidir si vale la pena construir
// un selector de prendas por maniquí. Ver /wardrobe/upload para el flujo real.

import MannequinPrototype from "./MannequinPrototype";

export const metadata = {
  title: "Prototipo — Selector por maniquí",
  robots: { index: false, follow: false },
};

export default function PrototipoManiquiPage() {
  return <MannequinPrototype />;
}
