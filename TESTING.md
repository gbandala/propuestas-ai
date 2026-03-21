# Guía de Pruebas — PropuestasAI

> Última actualización: 2026-03-21
> Servidor: `npm run dev` → http://localhost:3000

---

## Cuenta de prueba (ya existe, lista para usar)

| Campo | Valor |
|-------|-------|
| Email | `test@propuestasai.com` |
| Password | `Test1234!` |
| Rol | `architect` |

---

## Lo que ya está validado (probado con Playwright)

| Pantalla | Estado |
|----------|--------|
| Login con email/password | ✓ Funciona |
| Dashboard — lista de proyectos | ✓ Funciona |
| Modal "Crear proyecto" | ✓ Funciona |
| Detalle del proyecto — 4 pasos + fase comercial | ✓ Funciona |
| Brand Identity — editor Markdown + preview de colores + guardar | ✓ Funciona |
| Brief Técnico — Paso 1 (formulario carga correctamente) | ✓ Funciona |
| Storyboard bloqueado hasta completar brief | ✓ Comportamiento correcto |

---

## Tu checklist de validación

Haz las pruebas en orden. Cada paso depende del anterior.

### Paso 1 — Login
- [ ] Entrar a http://localhost:3000/login
- [ ] Iniciar sesión con `test@propuestasai.com` / `Test1234!`
- [ ] Debes llegar al dashboard con el proyecto "Sistema de Propuestas Demo"

---

### Paso 2 — Detalle del proyecto
- [ ] Hacer click en "Ver proyecto →" en la tarjeta
- [ ] Verificar que se ven los 4 pasos de la Fase Técnica:
  - Paso 1: Identidad de Marca — botón "Completar →"
  - Paso 2: Brief Técnico — botón "Completar →"
  - Paso 3: Storyboard Técnico — **bloqueado** (correcto)
  - Paso 4: Infografías y Presentación — **bloqueado** (correcto)
- [ ] Verificar que la Fase Comercial aparece como "Bloqueada"

---

### Paso 3 — Brand Identity
- [ ] Hacer click en "Completar →" del paso 1 (Identidad de Marca)
- [ ] Verificar que el editor Markdown tiene la plantilla base precargada
- [ ] Verificar que el Preview de la derecha muestra chips de colores
- [ ] Cambiar el color Primario a `#7C3AED` (morado) y ver que el chip cambia
- [ ] Hacer click en "Guardar" — debe mostrar "✓ Guardado"
- [ ] Hacer click en "Plantilla base" — debe preguntar confirmación y resetear

---

### Paso 4 — Brief Técnico (8 pasos)
- [ ] Volver al proyecto y hacer click en "Completar →" del paso 2
- [ ] Verificar que carga el Paso 1 de 8 con campos: Nombre del Proyecto, Empresa Cliente, Fecha, Arquitecto Responsable
- [ ] Llenar los 4 campos y hacer click en "Siguiente →"
- [ ] Verificar que avanza al Paso 2 (Problema)
- [ ] Navegar hasta el Paso 8 completando campos mínimos en cada paso
- [ ] Al terminar el Paso 8, buscar botón para generar el brief
- [ ] Verificar que se genera el brief en Markdown (debe aparecer un preview)

> **Nota:** No es necesario completar los 8 pasos completos. Basta con verificar que la navegación funciona y los campos guardan.

---

### Paso 5 — Storyboard (requiere brief completado)
- [ ] Una vez completado el brief, volver al detalle del proyecto
- [ ] Verificar que el Paso 3 (Storyboard) ya NO está bloqueado
- [ ] Hacer click en "Completar →" del Storyboard
- [ ] Hacer click en "Generar Storyboard Técnico"
- [ ] Verificar que aparece el texto del storyboard (puede tardar unos segundos)
- [ ] Leer el storyboard generado — debe describir 3 infografías + 10 slides
- [ ] Probar "Pedir cambios": escribir un comentario y generar nueva versión
- [ ] Verificar que muestra "v2" en la esquina
- [ ] Hacer click en "Aprobar storyboard"
- [ ] Verificar que aparece mensaje verde "Storyboard aprobado"
- [ ] Verificar que aparece botón "Continuar a generar infografías →"

---

### Paso 6 — Generación de Infografías (requiere OPENROUTER_API_KEY)
- [ ] Desde el brief técnico, buscar la sección "Infografías Técnicas"
- [ ] Hacer click en "Generar infografías"
- [ ] Verificar que aparecen 3 barras de progreso (puede tardar 30–90 seg)
- [ ] Verificar que las 3 infografías se generan como imágenes
- [ ] Hacer click en "Seleccionar" en una de las variantes
- [ ] Verificar que se marca como seleccionada

---

## Si encuentras un error

Anota:
1. En qué paso estás
2. Qué hiciste exactamente
3. Qué mensaje de error apareció (o qué esperabas ver vs qué viste)

Y dile a Claude: `"En el paso X encontré este error: [descripción]"` — con eso es suficiente.

---

## Cómo crear un usuario con otro rol para probar

Si quieres probar con el rol `commercial`:
1. Regístrate con un email diferente en http://localhost:3000/signup
2. Ve al dashboard de Supabase → tabla `profiles` → cambia `role` a `commercial`
3. Ese usuario solo verá la Fase Comercial (cuando esté habilitada)

Para rol `admin`: mismo proceso, cambiar `role` a `admin`.
