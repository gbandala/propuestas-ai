# Guia de Pruebas — PropuestasAI

> Ultima actualizacion: 2026-03-22
> Servidor: `npm run dev` → http://localhost:3000

---

## Cuenta de prueba (ya existe, lista para usar)

| Campo | Valor |
|-------|-------|
| Email | `test@propuestasai.com` |
| Password | `Test1234!` |
| Rol | `architect` |

---

## Lo que ya esta validado (QA automatizado 2026-03-22)

| Pantalla | Estado |
|----------|--------|
| Login con email/password | Funciona |
| Dashboard — lista de proyectos | Funciona (cards cargan con hydration) |
| Detalle del proyecto — 4 pasos + fase comercial bloqueada | Funciona |
| Brand Identity — editor Markdown + preview de colores + guardar | Funciona |
| Brief Tecnico — Paso 1 carga con 4 campos correctos | Funciona |
| Storyboard — pagina carga sin error (bug fix aplicado) | Funciona |

---

## Checklist de validacion manual

Haz las pruebas en orden. Cada paso depende del anterior.

### Paso 1 — Login
- [ ] Entrar a http://localhost:3000/login
- [ ] Iniciar sesion con `test@propuestasai.com` / `Test1234!`
- [ ] Debes llegar al dashboard con el proyecto "Sistema de Propuestas Demo"

---

### Paso 2 — Detalle del proyecto
- [ ] Hacer click en "Ver proyecto" en la tarjeta
- [ ] Verificar que se ven los 4 pasos de la Fase Tecnica:
  - Paso 1: Identidad de Marca — boton "Ver" (ya completado)
  - Paso 2: Brief Tecnico — boton "Completar"
  - Paso 3: Storyboard Tecnico — bloqueado (correcto)
  - Paso 4: Infografias y Presentacion — bloqueado (correcto)
- [ ] Verificar que la Fase Comercial aparece como "Bloqueada"

---

### Paso 3 — Brand Identity
- [ ] Hacer click en "Ver" del paso 1 (Identidad de Marca)
- [ ] Verificar que el editor Markdown tiene la plantilla base precargada
- [ ] Verificar que el Preview de la derecha muestra chips de colores
- [ ] Cambiar el color Primario a `#7C3AED` (morado) y ver que el chip cambia en el preview
- [ ] Hacer click en "Guardar" — debe mostrar confirmacion
- [ ] Hacer click en "Plantilla base" — debe preguntar confirmacion y resetear

---

### Paso 4 — Brief Tecnico (8 pasos)
- [ ] Volver al proyecto y hacer click en "Completar" del paso 2
- [ ] Verificar que carga el Paso 1 de 8 con 4 campos: Nombre del Proyecto, Empresa Cliente, Fecha, Arquitecto Responsable
- [ ] Llenar los 4 campos y hacer click en "Siguiente"
- [ ] Navegar los 8 pasos completando campos minimos en cada uno
- [ ] Al terminar el Paso 8, generar el brief
- [ ] Verificar que aparece el brief en Markdown (preview visible)
- [ ] Verificar que al volver al proyecto el Paso 3 (Storyboard) ya NO esta bloqueado

---

### Paso 5 — Storyboard (requiere brief completado)
- [ ] Hacer click en "Completar" del Storyboard
- [ ] Hacer click en "Generar Storyboard Tecnico"
- [ ] Verificar que aparece el texto del storyboard (puede tardar unos segundos — usa IA)
- [ ] Leer el storyboard generado — debe describir 3 infografias + 10 slides
- [ ] Probar "Pedir cambios": escribir un comentario y generar nueva version
- [ ] Verificar que muestra "v2" (versionado correcto)
- [ ] Hacer click en "Aprobar storyboard"
- [ ] Verificar que aparece confirmacion de aprobado
- [ ] Verificar que aparece boton "Continuar a generar infografias"

---

### Paso 6 — Generacion de Infografias (requiere OPENROUTER_API_KEY activa)
- [ ] Desde el brief tecnico, buscar la seccion "Infografias Tecnicas"
- [ ] Hacer click en "Generar infografias"
- [ ] Verificar que aparecen 3 barras de progreso (puede tardar 30-90 seg)
- [ ] Verificar que las 3 infografias se generan como imagenes
- [ ] Hacer click en "Seleccionar" en una de las variantes
- [ ] Verificar que se marca como seleccionada

---

## Si encuentras un error

Anota:
1. En que paso estas
2. Que hiciste exactamente
3. Que mensaje de error aparecio (o que esperabas ver vs que viste)

Y dile a Claude: `"En el paso X encontre este error: [descripcion]"` — con eso es suficiente.

---

## Como crear un usuario con otro rol

Si quieres probar con el rol `commercial`:
1. Registrate con un email diferente en http://localhost:3000/signup
2. Ve al dashboard de Supabase → tabla `profiles` → cambia `role` a `commercial`
3. Ese usuario solo vera la Fase Comercial (cuando este habilitada)

Para rol `admin`: mismo proceso, cambiar `role` a `admin`.
