# Bitácora de Lecciones Aprendidas — PropuestasAI

Decisiones no obvias, bugs difíciles, y patrones que emergieron durante el desarrollo.
Cada entrada tiene: **instrucción** + **por qué** + **cuándo aplicarla**.

---

## IA / Generación de Imágenes

### No instruir al AI sobre zonas reservadas para logos

**Instrucción:** No agregar frases como "leave top-right corner empty for logo" en prompts de Gemini/imagen.

**Por qué:** Gemini interpreta "dejar vacío" dibujando un rectángulo blanco/gris literal en esa zona. Probado el 2026-03-28 con la instrucción "LOGO ZONE: Keep the top-right corner empty — a logo will be composited there". El resultado fue un recuadro blanco visible en el slide generado.

**Cuándo aplica:** Cualquier vez que se quiera componer un elemento (logo, watermark, badge) sobre una imagen generada con IA. Manejar la posición exclusivamente en el compositing post-generación (sharp, canvas, PIL), nunca en el prompt.

---

### Flood fill desde bordes para remover fondos de logos

**Instrucción:** Usar flood fill iterativo desde los 4 bordes de la imagen para detectar y eliminar el fondo. No eliminar globalmente todos los píxeles grises/blancos.

**Por qué:** La eliminación global (`if saturation < 20 && value > 100`) afecta los píxeles de anti-aliasing en los bordes de letras e íconos (que también son grises). El resultado es texto con bordes roídos, "deformado". El flood fill solo elimina píxeles conectados al borde exterior — el fondo real — y nunca toca elementos interiores.

**Umbral correcto:** `saturation < 30 && value > 80` sin cota superior en `value` para capturar tanto fondos grises (value ~191) como fondos blancos (value ~254).

**Referencia:** `src/lib/image-utils.ts` — función `removeGrayBackground()`.

**Cuándo aplica:** Logos PNG con fondo baked (no transparente real). Logos exportados de generadores AI, Canva, PowerPoint, o escaneados.

---

### El logo procesado a medias no puede re-procesarse con flood fill

**Instrucción:** Si un logo ya fue procesado por el algoritmo anterior (eliminación global), no funciona re-procesarlo — los huecos transparentes rompen la conectividad del flood fill. Pedir al usuario que re-suba el archivo original.

**Por qué:** El flood fill expande desde el borde hacia adentro. Si ya hay píxeles transparentes en el fondo (del procesamiento anterior), estos interrumpen el camino conectado y el fill se detiene. El resultado es un fondo a medias (alternancia de transparente y blanco).

---

### El checkbox de transparencia es responsabilidad del usuario

**Instrucción:** El checkbox "Fondo transparente" en el upload de logo aplica la corrección solo si el usuario lo marca. No activarlo automáticamente.

**Por qué:** Aplicar la corrección siempre dañaría logos que legítimamente tienen fondos blancos como parte del diseño, o logos que ya tienen transparencia real (alpha=0 en el fondo). El usuario sabe si su logo tiene fondo falso o no.

---

### Logo en esquina inferior-derecha, no superior-derecha

**Instrucción:** Componer el logo en bottom-right (`top = mainH - logoH - 24`, `left = mainW - logoW - 24`).

**Por qué:** Los títulos generados por Gemini se extienden horizontalmente hasta el borde superior. En top-right, los títulos largos chocan con el logo. En bottom-right, el contenido es menos frecuente — y cuando coincide, la transparencia del logo permite convivir con el contenido de fondo.

**Referencia:** `src/app/api/infographics/generate/route.ts` — sección de compositing con sharp.

---

### No usar corchetes [] en nombres de clientes en prompts de storyboard

**Instrucción:** En el prompt del sistema del storyboard agregar: "NUNCA uses corchetes [] alrededor de nombres de clientes, empresas o placeholders."

**Por qué:** El AI por defecto escribe "[Nombre del Cliente]" o "[HR Capital]" cuando no está seguro del nombre. Esos corchetes aparecen visibles en los slides generados, lucen como texto de plantilla sin terminar. La instrucción explícita hace que el AI use el nombre directamente o texto descriptivo sin corchetes.

**Referencia:** `src/actions/storyboard.ts` — función `buildSystemPrompt()`.

---

## Polling y Estado Async

### `intervalRef.current = null` es obligatorio en cleanup de useEffect

**Instrucción:** Después de `clearInterval(intervalRef.current)` en el cleanup de un useEffect, siempre agregar `intervalRef.current = null`.

**Por qué:** Sin el `null`, el guard `if (!intervalRef.current)` en el arranque del siguiente ciclo siempre evalúa como `false` (la ref tiene el ID del intervalo anterior). El efecto: el polling se detiene tras el primer update y los jobs aparecen "stuck" aunque completen en el servidor.

**Código correcto:**
```typescript
return () => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current)
    intervalRef.current = null  // ← CRÍTICO
  }
}
```

**Referencia:** `src/features/infographic-generation/hooks/useProposalJobProgress.ts`

---

## Uploads y Storage

### Cache de browser con Supabase Storage al re-subir mismo path

**Instrucción:** Nunca usar un path fijo (ej: `brand/logo.png`) para archivos que el usuario puede reemplazar. Siempre incluir `Date.now()` en el nombre de archivo.

**Por qué:** Supabase Storage con `upsert: true` reemplaza el archivo pero la URL pública es idéntica. El browser cachea la URL → muestra la imagen anterior aunque el archivo nuevo ya esté en storage.

**Fix:** `brand/logo-${Date.now()}.png` → URL única por upload → no hay caché. Borrar el archivo anterior del bucket para evitar huérfanos.

**Referencia:** `src/actions/brand-identity.ts` — función `uploadBrandImage()`.

---

## Generación de Propuestas

### `fetchImageAsBase64` debe inferir mime-type para `application/octet-stream`

**Instrucción:** Cuando Supabase Storage devuelve `Content-Type: application/octet-stream` para archivos PNG/JPG, inferir el mime-type correcto desde la extensión del URL antes de construir el data URI.

**Por qué:** Supabase a veces devuelve `octet-stream` para imágenes. Si se usa ese Content-Type en el data URI (`data:application/octet-stream;base64,...`), Gemini no puede interpretar la imagen y falla la generación con fondo. El background image se pasa como blank.

**Referencia:** `src/lib/ai-client.ts` — función `fetchImageAsBase64()`.

---

### Pre-fetch del background una sola vez en el API route

**Instrucción:** Descargar el background image una sola vez al inicio del route, verificar si es accesible, y pasar el buffer a `generateImage()`. No descargarlo dos veces ni confiar en que la URL sea accesible desde el modelo.

**Por qué:** Si el background URL no es accesible (URL expirada, storage privado), descubrirlo tarde genera un slide sin fondo sin aviso. Pre-fetchearlo al inicio permite detectar el problema y advertir en logs, continuando sin fondo en lugar de fallar el job completo.

---

## UX Patterns

### Overlay + spinner durante operaciones async en storyboard

**Instrucción:** Cualquier operación que regenera o modifica storyboard debe: (1) mostrar overlay semitransparente, (2) spinner centrado, (3) deshabilitar todos los botones, (4) al resolver, hacer resync de estado completo.

**Por qué:** Sin overlay, el usuario puede hacer clic en regenerar mientras ya está generando, disparando requests duplicados. Sin resync, el estado de React puede quedar desincronizado del servidor tras revalidatePath.

---

## Context Management

### Playwright MCP screenshot consume tokens masivamente

**Instrucción:** Preferir `browser_snapshot` (YAML texto, 2-5k tokens) sobre `browser_take_screenshot` (imagen base64, 50-800k tokens) para verificar estado de UI. Usar screenshots solo para validación visual final.

**Por qué:** Cada `browser_take_screenshot` inyecta la imagen inline en el contexto de la conversación y permanece ahí. En una sesión de QA con 10 screenshots se pueden acumular 2-5M tokens, forzando compacts prematuros o perdida de contexto.

**Patrón recomendado:**
```
navigate → snapshot (verificar) → click/fill → snapshot (confirmar) → screenshot (resultado final)
```

**Para QA automatizado multi-paso:** Usar Playwright CLI (`npx playwright screenshot --output archivo.png`) que guarda a disco sin inyectar al contexto.
