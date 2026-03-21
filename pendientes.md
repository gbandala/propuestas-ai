# PropuestasAI — Pendientes y Estado del Proyecto

> Ultima actualizacion: 2026-03-21
> App: Generador automatico de materiales de propuesta tecnica y comercial (infografias + presentaciones HTML)

---

## Premisa

El formulario de 8 pasos NO genera el discovery — lo **captura**. El arquitecto ya realizo el analisis previo con el cliente. La app toma esa informacion y produce los materiales visuales.

---

## Estado General

```
Fase Tecnica:
  [x] Auth + roles
  [x] Projects CRUD
  [x] Brand Identity (editor + plantilla base + upload)
  [x] Technical Brief (8 pasos + generacion MD)
  [x] Storyboard Draft (UI + actions + skill Claude)
  [x] Infographic Generation async (Realtime progress)
  [ ] Presentation Generation (HTML 10 slides)

Fase Comercial:
  [ ] Commercial Proposal (editor MD + tarifas + roadmap)
  [ ] Storyboard Comercial (flujo igual al tecnico)
  [ ] Infografias Comerciales (ROI x2 + Roadmap x2)
  [ ] Presentation Comercial (HTML 10 slides)

Finalizacion:
  [ ] Downloads (ZIP tecnico / comercial / completo)
  [ ] Testing E2E con Playwright
  [ ] Deploy en Vercel
```

---

## Completado

### Infraestructura
- [x] Supabase configurado (URL + keys en .env.local)
- [x] Tipos de base de datos actualizados (src/types/database.ts)
  - Nuevas tablas: `brand_identity`, `storyboards`
  - Removida tabla legacy `brand_specs`
- [x] Cliente Supabase (client, server, proxy)

### Auth (src/features/auth/)
- [x] Login / Signup / Forgot password / Update password
- [x] Google OAuth (callback route)
- [x] Roles: architect | commercial | admin
- [x] Proteccion de rutas por rol

### Feature: Projects (src/features/projects/)
- [x] Dashboard de proyectos (/dashboard)
- [x] Crear proyecto (nombre, cliente, descripcion)
- [x] Detalle del proyecto con flujo de 5 pasos (fase tecnica) + fase comercial
- [x] Navegacion con estado visual de cada paso (completado / pendiente / bloqueado)
- [x] Store Zustand

### Feature: Brand Identity (src/features/brand-identity/) — NUEVO
- [x] Editor Markdown con preview en tiempo real
- [x] Plantilla base precargada al crear proyecto
- [x] Upload de archivo .md personalizado
- [x] Boton "Plantilla base" para resetear
- [x] Actions: getBrandIdentity, saveBrandIdentity, initBrandIdentity
- [x] Ruta: /projects/[id]/brand
- [x] Solo accesible para architect y admin

### Feature: Technical Brief (src/features/technical-brief/)
- [x] Formulario multi-paso de 8 pasos completo
- [x] Generacion del brief tecnico en Markdown
- [x] Barra de progreso, preview, guardado progresivo

### Feature: Storyboard (src/features/storyboard/) — NUEVO
- [x] Generacion de storyboard textual (tecnico y comercial)
  - Tecnico: 3 infografias + 10 slides tecnicos descritos en detalle
  - Comercial: 4 infografias (ROI x2 + Roadmap x2) + 10 slides ejecutivos
- [x] Versionado: cada cambio crea version N+1
- [x] Iteracion por comentarios del usuario
- [x] Aprobacion con timestamp
- [x] UI: StoryboardReviewer con botones Aprobar / Pedir cambios
- [x] Actions: getStoryboard, generateStoryboard, approveStoryboard
- [x] Ruta: /projects/[id]/storyboard?type=technical|commercial

### Skill: storyboard-draft — NUEVO
- [x] .claude/skills/storyboard-draft/SKILL.md
- [x] Logica de generacion tecnica y comercial
- [x] Flujo de iteracion con comentarios
- [x] Instrucciones de estructura por pieza (infografias y slides)

### Feature: Infographic Generation (src/features/infographic-generation/)
- [x] Generacion async de 3 variantes tecnicas con IA (OpenRouter + Gemini)
- [x] Barra de progreso por variante (Supabase Realtime)
- [x] Seleccion de variante + retry
- [x] Persistencia en generation_jobs

---

## Pendiente

### URGENTE: OPENROUTER_API_KEY en .env.local
- [ ] Agregar `OPENROUTER_API_KEY=sk-or-...` en .env.local
  - Sin esta key la generacion de infografias falla

### Feature: Presentation Generation (src/features/presentation-generation/) — NO EXISTE
- [ ] Generar presentacion tecnica HTML (10 slides) con brand identity
  - Usar el storyboard aprobado como estructura exacta de cada slide
- [ ] Preview de slides antes de aprobar
- [ ] Persistir en tabla `presentations` (type: 'technical')
- [ ] Ruta integrada en /projects/[id]/technical post-seleccion de infografia

### Feature: Commercial Proposal (src/features/commercial-proposal/) — NO EXISTE
- [ ] Ruta: /projects/[id]/commercial (el link ya existe pero la page no)
- [ ] Editor Markdown para descripcion ejecutiva
- [ ] Tabla de fases con costos (Discovery, Diseno, Implementacion, Rollout)
- [ ] Roadmap con actividades, fechas y equipos
- [ ] Generacion de propuesta-comercial.md
- [ ] Persistir en tabla `commercial_proposals`
- [ ] Storyboard comercial (flujo identico al tecnico)
- [ ] Generacion de 4 infografias comerciales (2 ROI + 2 Roadmap)
- [ ] Generacion de presentacion comercial HTML (10 slides)

### Feature: Downloads (src/features/downloads/) — NO EXISTE
- [ ] ZIP tecnico: `{slug}-tecnica.zip`
  - brief-tecnico.md + storyboard-tecnico.md + infografias + presentacion.html + brand-identity.md
- [ ] ZIP comercial: `{slug}-comercial.zip`
  - propuesta-comercial.md + storyboard-comercial.md + infografias + presentacion.html
- [ ] ZIP completo: `{slug}-completo.zip` con ambas carpetas + {slug}.json
- [ ] Registro de descargas en tabla `downloads`
- [ ] Botones de descarga en /projects/[id]

### Supabase: Migraciones pendientes
- [ ] Crear tabla `brand_identity` (project_id, markdown_content)
- [ ] Crear tabla `storyboards` (project_id, type, content_md, version, approved_at)
- [ ] Aplicar RLS a ambas tablas

### Testing
- [ ] Tests E2E: flujo completo arquitecto (brand → brief → storyboard → infografias → presentacion → descarga)
- [ ] Tests E2E: flujo comercial con acceso condicional

### Deploy
- [ ] Configurar variables de entorno en Vercel (incluir OPENROUTER_API_KEY)
- [ ] Deploy en Vercel
- [ ] Actualizar Site URL en Supabase para produccion

---

## Flujo completo actualizado

```
Crear proyecto
    → Brand Identity (/brand)       ← NUEVO, completado en codigo
    → Brief Tecnico (/technical)    ← COMPLETADO
    → Storyboard (/storyboard)      ← NUEVO, completado en codigo
    → Infografias (/technical)      ← COMPLETADO (pendiente OPENROUTER_API_KEY)
    → Presentacion (/technical)     ← PENDIENTE implementar
    → Descarga ZIP                  ← PENDIENTE implementar
    → [Fase Comercial] /commercial  ← PENDIENTE implementar
```

---

## Notas Tecnicas

- El storyboard aprobado debe pasarse como contexto al prompt de generacion de imagenes (actualizar openrouter-image.ts)
- La tabla `brand_specs` fue reemplazada por `brand_identity` (campo unico markdown_content en vez de campos separados)
- Los jobs de generacion se procesan en Server Actions — revisar timeout de Vercel (max 60s por funcion)
- OpenRouter usa `google/gemini-2.0-flash-exp` — confirmar disponibilidad del modelo

---

## Siguiente Paso Recomendado

1. Ejecutar migraciones en Supabase (brand_identity + storyboards + RLS)
2. Agregar OPENROUTER_API_KEY en .env.local
3. Probar flujo completo: brand → brief → storyboard → infografias
4. Implementar feature commercial-proposal
5. Implementar feature downloads
