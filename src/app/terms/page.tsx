// /terms — Términos y Condiciones de StrandIA (página pública).
//
// Redactados a la medida de lo que la app realmente hace hoy. NO es asesoría
// legal: antes de un lanzamiento comercial deben revisarse con un abogado
// (en Colombia, especialmente frente a la Ley 1581 de 2012 y el E-commerce).

import LegalShell, {
  LegalSection,
  LEGAL_CONTACT_EMAIL,
  LEGAL_RESPONSIBLE,
} from "@/components/legal/LegalShell";

export const metadata = {
  title: "Términos y Condiciones — StrandIA",
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Términos y Condiciones"
      updatedAt="11 de julio de 2026"
    >
      <LegalSection titulo="1. Quiénes somos">
        <p>
          StrandIA es una aplicación web de armario digital con inteligencia
          artificial operada por {LEGAL_RESPONSIBLE} (&ldquo;nosotros&rdquo;).
          Al crear una cuenta o usar StrandIA aceptas estos Términos y nuestra{" "}
          <a href="/privacy-policy" className="font-medium text-primary hover:underline">
            Política de Privacidad
          </a>
          . Si no estás de acuerdo, no uses el servicio.
        </p>
      </LegalSection>

      <LegalSection titulo="2. El servicio">
        <p>
          StrandIA te permite digitalizar tu armario subiendo fotos de tus
          prendas, recibir combinaciones de outfits generadas por IA según tus
          preferencias, registrar los días en que usas cada outfit y,
          opcionalmente, conectar tu calendario para recibir sugerencias según
          tus eventos.
        </p>
        <p>
          El servicio se ofrece &ldquo;tal cual&rdquo;. Hoy StrandIA opera con
          acceso por lista de espera y puede cambiar, suspenderse o
          descontinuarse; haremos lo razonable por avisarte con antelación si
          un cambio te afecta de forma importante.
        </p>
      </LegalSection>

      <LegalSection titulo="3. Tu cuenta">
        <p>
          Necesitas una cuenta (email y contraseña, o Google) para usar
          StrandIA. Eres responsable de mantener tus credenciales seguras y de
          la actividad que ocurra en tu cuenta. Debes tener al menos 14 años;
          si eres menor de 18, necesitas autorización de tu representante
          legal.
        </p>
      </LegalSection>

      <LegalSection titulo="4. Tu contenido">
        <p>
          Las fotos de tus prendas y los datos que ingresas son tuyos. Al
          subirlos nos das una licencia limitada para almacenarlos, procesarlos
          (incluido el análisis con IA para detectar categoría y color, y la
          eliminación de fondo) y mostrártelos dentro de la app. Esa licencia
          termina cuando borras el contenido o tu cuenta.
        </p>
        <p>
          Te comprometes a subir solo contenido tuyo o que tengas derecho a
          usar, y a no subir contenido ilegal, ofensivo o que incluya a
          terceros sin su consentimiento.
        </p>
      </LegalSection>

      <LegalSection titulo="5. Uso de la inteligencia artificial">
        <p>
          Las sugerencias de outfits, el análisis de prendas y el asistente de
          soporte se generan con modelos de IA. Son recomendaciones
          automatizadas que pueden contener errores — úsalas como inspiración,
          no como verdad absoluta. Las operaciones de IA tienen límites de uso
          por hora para mantener el servicio disponible para todos.
        </p>
      </LegalSection>

      <LegalSection titulo="6. Planes y pagos">
        <p>
          El plan Free es gratuito. Si en el futuro ofrecemos un plan Premium
          de pago, sus condiciones (precio, facturación y cancelación) se
          informarán claramente antes de cualquier cobro.
        </p>
      </LegalSection>

      <LegalSection titulo="7. Uso aceptable">
        <p>
          No puedes usar StrandIA para actividades ilegales, intentar acceder
          a datos de otros usuarios, sobrecargar o atacar el servicio, hacer
          ingeniería inversa, ni revender el acceso sin nuestra autorización.
        </p>
      </LegalSection>

      <LegalSection titulo="8. Propiedad intelectual">
        <p>
          El software, el diseño, la marca StrandIA y el contenido de la app
          (distinto de tu contenido) son de {LEGAL_RESPONSIBLE} o de sus
          licenciantes. Estos Términos no te transfieren ninguna propiedad
          sobre ellos.
        </p>
      </LegalSection>

      <LegalSection titulo="9. Terminación">
        <p>
          Puedes borrar tu cuenta cuando quieras desde Perfil → Configuración →
          Privacidad, lo que elimina definitivamente tus datos. Podemos
          suspender o cerrar cuentas que incumplan estos Términos, avisándote
          cuando sea razonable hacerlo.
        </p>
      </LegalSection>

      <LegalSection titulo="10. Responsabilidad">
        <p>
          En la medida permitida por la ley, StrandIA no será responsable por
          daños indirectos derivados del uso del servicio, ni por decisiones
          que tomes con base en las sugerencias de la IA. Nada en estos
          Términos limita derechos que la ley te otorgue como consumidor.
        </p>
      </LegalSection>

      <LegalSection titulo="11. Cambios y ley aplicable">
        <p>
          Podemos actualizar estos Términos; si el cambio es relevante te lo
          notificaremos dentro de la app. La versión vigente siempre estará en
          esta página. Estos Términos se rigen por las leyes de la República de
          Colombia.
        </p>
        <p>
          Contacto: {LEGAL_CONTACT_EMAIL}.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
