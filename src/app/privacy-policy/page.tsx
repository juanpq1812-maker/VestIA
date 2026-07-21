// /privacy-policy — Política de Privacidad de StrandIA (página pública).
//
// Describe el tratamiento de datos que la app hace HOY (derechos de acceso,
// export y supresión ya son funcionales en /profile/privacy). NO es asesoría
// legal: revisar con abogado frente a la Ley 1581 de 2012 antes de un
// lanzamiento comercial.

import LegalShell, {
  LegalSection,
  LEGAL_CONTACT_EMAIL,
  LEGAL_RESPONSIBLE,
} from "@/components/legal/LegalShell";

export const metadata = {
  title: "Política de Privacidad — StrandIA",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Política de Privacidad"
      updatedAt="11 de julio de 2026"
    >
      <LegalSection titulo="1. Responsable del tratamiento">
        <p>
          {LEGAL_RESPONSIBLE} es el responsable del tratamiento de los datos
          personales que recolecta StrandIA. Para cualquier solicitud sobre tus
          datos escríbenos a {LEGAL_CONTACT_EMAIL}.
        </p>
      </LegalSection>

      <LegalSection titulo="2. Qué datos recolectamos">
        <p>Solo recolectamos lo necesario para que la app funcione:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-text">Cuenta:</strong> email, nombre y, si
            entras con Google, el identificador que Google nos comparte. Nunca
            vemos tu contraseña de Google.
          </li>
          <li>
            <strong className="text-text">Prendas:</strong> las fotos que subes
            y los atributos detectados (categoría, color, etiquetas).
          </li>
          <li>
            <strong className="text-text">Preferencias:</strong> estilos,
            ocasiones, tallas y medidas que ingresas en el onboarding o editas
            después.
          </li>
          <li>
            <strong className="text-text">Outfits y uso:</strong> los outfits
            generados o guardados y las fechas en que los usaste.
          </li>
          <li>
            <strong className="text-text">Calendario (opcional):</strong> si lo
            conectas, la URL ICS y los próximos eventos (título, fecha, lugar)
            para sugerirte outfits.
          </li>
          <li>
            <strong className="text-text">Soporte:</strong> los mensajes que
            escribes al asistente de ayuda.
          </li>
        </ul>
      </LegalSection>

      <LegalSection titulo="3. Para qué los usamos">
        <p>
          Exclusivamente para operar StrandIA: autenticarte, digitalizar tu
          armario, generar outfits personalizados con IA, sugerirte qué ponerte
          según tu clima y tus eventos, responder tus preguntas de soporte y
          aplicar los límites de uso del servicio. No vendemos tus datos ni los
          usamos para publicidad de terceros.
        </p>
      </LegalSection>

      <LegalSection titulo="4. Con quién los compartimos">
        <p>
          Usamos proveedores que procesan datos por encargo nuestro, solo para
          las finalidades descritas:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-text">Supabase</strong> — base de datos,
            autenticación y almacenamiento de fotos (bucket privado, accesible
            solo con enlaces firmados temporales).
          </li>
          <li>
            <strong className="text-text">Vercel</strong> — alojamiento de la
            aplicación.
          </li>
          <li>
            <strong className="text-text">Anthropic</strong> — análisis de
            fotos de prendas, generación de outfits y asistente de soporte con
            IA.
          </li>
          <li>
            <strong className="text-text">Google</strong> — reconstrucción y
            eliminación del fondo de las fotos de prendas al subirlas (Gemini),
            y opcionalmente si eliges iniciar sesión con Google o conectar
            Google Calendar.
          </li>
        </ul>
      </LegalSection>

      <LegalSection titulo="5. Seguridad">
        <p>
          Tus fotos viven en un bucket privado con políticas por usuario; los
          datos de la base están protegidos con seguridad a nivel de fila (solo
          tu sesión puede leer lo tuyo); las URLs de calendario se tratan como
          secretas y solo se muestran enmascaradas. Ningún sistema es 100%
          infalible, pero aplicamos prácticas razonables de seguridad.
        </p>
      </LegalSection>

      <LegalSection titulo="6. Tus derechos">
        <p>
          Conforme a la Ley 1581 de 2012 (habeas data) puedes conocer,
          actualizar, rectificar y suprimir tus datos, y revocar tu
          autorización. Dentro de la app ya puedes ejercer los principales
          desde Perfil → Configuración → Privacidad:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-text">Acceso y portabilidad:</strong>{" "}
            descarga todos tus datos en un archivo JSON.
          </li>
          <li>
            <strong className="text-text">Rectificación:</strong> edita tus
            preferencias, prendas y perfil en cualquier momento.
          </li>
          <li>
            <strong className="text-text">Supresión:</strong> borra tu cuenta y
            todos tus datos definitivamente, incluidas las fotos.
          </li>
        </ul>
        <p>
          Para cualquier otra solicitud, escríbenos a {LEGAL_CONTACT_EMAIL} y
          responderemos en los plazos que fija la ley.
        </p>
      </LegalSection>

      <LegalSection titulo="7. Retención">
        <p>
          Conservamos tus datos mientras tu cuenta exista. Al borrar tu cuenta
          se eliminan de inmediato de nuestros sistemas; pueden persistir por
          un periodo corto en copias de seguridad del proveedor antes de
          desaparecer por completo.
        </p>
      </LegalSection>

      <LegalSection titulo="8. Cookies">
        <p>
          Solo usamos cookies estrictamente necesarias para mantener tu sesión
          iniciada. No usamos cookies de publicidad ni de seguimiento de
          terceros.
        </p>
      </LegalSection>

      <LegalSection titulo="9. Menores de edad">
        <p>
          StrandIA no está dirigida a menores de 14 años. Si detectamos una
          cuenta de un menor sin autorización de su representante legal, la
          eliminaremos.
        </p>
      </LegalSection>

      <LegalSection titulo="10. Cambios">
        <p>
          Si cambiamos esta política de forma relevante, te lo notificaremos
          dentro de la app antes de que el cambio entre en vigencia. La versión
          vigente siempre estará en esta página.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
