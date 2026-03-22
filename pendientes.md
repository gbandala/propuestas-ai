# PropuestasAI — Pendientes y Estado del Proyecto

> Ultima actualizacion: 2026-03-22
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
  [x] Storyboard Draft (UI + actions + skill Claude) — bug fix aplicado 2026-03-22
  [x] Infographic Generation async (Realtime progress)
  [ ] Presentation Generation (HTML 10 slides) — SIGUIENTE

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
- [x] OPENROUTER_API_KEY configurada en .env.local
- [x] Tipos de base de datos actualizados (src/types/database.ts)
- [x] Cliente Supabase (client, server, proxy)

### Tablas en Supabase (verificado 2026-03-22)
- [x] profiles, projects, technical_briefs — existen y con RLS
- [x] brand_identity, storyboards — existen y con RLS
- [x] infographics, generation_jobs — existen
- [ ] presentations, commercial_proposals, downloads — NO existen (pendiente de migracion)

### Auth (src/features/auth/)
- [x] Login / Signup / Forgot password / Update password
- [x] Google OAuth (callback route)
- [x] Roles: architect | commercial | admin
- [x] Proteccion de rutas por rol

### Feature: Projects (src/features/projects/)
- [x] Dashboard de proyectos (/dashboard)
- [x] Crear proyecto (nombre, cliente, descripcion)
- [x] Detalle del proyecto con flujo de 4 pasos (fase tecnica) + fase comercial bloqueada
- [x] Navegacion con estado visual de cada paso (completado / pendiente / bloqueado)

### Feature: Brand Identity (src/features/brand-identity/)
- [x] Editor Markdown con preview en tiempo real (chips de colores)
- [x] Plantilla base precargada al crear proyecto
- [x] Upload de archivo .md personalizado
- [x] Boton "Plantilla base" para resetear
- [x] Ruta: /projects/[id]/brand

### Feature: Technical Brief (src/features/technical-brief/)
- [x] Formulario multi-paso de 8 pasos completo
- [x] Generacion del brief tecnico en Markdown
- [x] Barra de progreso, preview, guardado progresivo

### Feature: Storyboard (src/features/storyboard/)
- [x] Generacion de storyboard textual (tecnico y comercial)
- [x] Versionado: cada cambio crea version N+1
- [x] Iteracion por comentarios del usuario
- [x] Aprobacion con timestamp
- [x] UI: StoryboardReviewer con botones Aprobar / Pedir cambios
- [x] Bug fix 2026-03-22: Server Action handleApprove cerraba sobre objeto complejo (null)
      Fix: extraer storyboardId como primitivo antes del closure

### Feature: Infographic Generation (src/features/infographic-generation/)
- [x] Generacion async de 3 variantes tecnicas con IA (OpenRouter + Gemini)
- [x] Barra de progreso por variante (Supabase Realtime)
- [x] Seleccion de variante + retry
- [x] Persistencia en generation_jobs

---

## Pendiente

### QA Manual en curso (2026-03-22)
- [ ] Usuario hace prueba manual del flujo completo:
  - Brand Identity → guardar
  - Brief Tecnico → completar 8 pasos → generar brief MD
  - Storyboard → generar → aprobar
  - Infografias → verificar generacion con OPENROUTER_API_KEY real
- [ ] Ajustes de UX que surjan del QA manual antes de continuar

### Feature: Presentation Generation (src/features/presentation-generation/) — NO EXISTE
- [ ] Generar presentacion tecnica HTML (10 slides) con brand identity
  - Usar el storyboard aprobado como estructura exacta de cada slide
- [ ] Preview de slides antes de aprobar
- [ ] Persistir en tabla `presentations` (type: 'technical') — tabla pendiente de crear
- [ ] Ruta integrada en /projects/[id]/technical post-seleccion de infografia

### Feature: Commercial Proposal (src/features/commercial-proposal/) — NO EXISTE
- [ ] Ruta: /projects/[id]/commercial (el link ya existe pero la page no)
- [ ] Editor Markdown para descripcion ejecutiva
- [ ] Tabla de fases con costos (Discovery, Diseno, Implementacion, Rollout)
- [ ] Roadmap con actividades, fechas y equipos
- [ ] Generacion de propuesta-comercial.md
- [ ] Persistir en tabla `commercial_proposals` — tabla pendiente de crear
- [ ] Storyboard comercial (flujo identico al tecnico)
- [ ] Generacion de 4 infografias comerciales (2 ROI + 2 Roadmap)
- [ ] Generacion de presentacion comercial HTML (10 slides)

### Feature: Downloads (src/features/downloads/) — NO EXISTE
- [ ] ZIP tecnico: `{slug}-tecnica.zip`
- [ ] ZIP comercial: `{slug}-comercial.zip`
- [ ] ZIP completo: `{slug}-completo.zip`
- [ ] Registro de descargas en tabla `downloads` — tabla pendiente de crear

### Supabase: Migraciones pendientes
- [ ] Crear tabla `presentations` + RLS
- [ ] Crear tabla `commercial_proposals` + RLS
- [ ] Crear tabla `downloads` + RLS

### Deploy
- [ ] Configurar variables de entorno en Vercel (incluir OPENROUTER_API_KEY)
- [ ] Deploy en Vercel
- [ ] Actualizar Site URL en Supabase para produccion

---

## Flujo completo actualizado

```
Crear proyecto
    → Brand Identity (/brand)       COMPLETADO + QA verificado
    → Brief Tecnico (/technical)    COMPLETADO + QA verificado
    → Storyboard (/storyboard)      COMPLETADO + bug fix + QA verificado
    → Infografias (/technical)      COMPLETADO (pendiente QA manual con API key)
    → Presentacion (/technical)     PENDIENTE implementar
    → Descarga ZIP                  PENDIENTE implementar
    → [Fase Comercial] /commercial  PENDIENTE implementar
```

---

## Bugs corregidos

### 2026-03-22: Storyboard handleApprove crash con null
- **Archivo:** src/app/(main)/projects/[id]/storyboard/page.tsx
- **Error:** RuntimeTypeError — Cannot read properties of null (reading 'id')
- **Causa:** Server Action cerraba sobre `storyboardData` (objeto complejo/null); Next.js falla al serializar el closure
- **Fix:** Extraer `const storyboardId = storyboardData?.id ?? null` y usar el primitivo en el closure

---

## Notas Tecnicas

- El storyboard aprobado debe pasarse como contexto al prompt de generacion de imagenes (actualizar openrouter-image.ts)
- Los jobs de generacion se procesan en Server Actions — revisar timeout de Vercel (max 60s por funcion)
- OpenRouter usa `google/gemini-2.0-flash-exp` — confirmar disponibilidad del modelo en prueba real
- La tabla `brand_specs` fue reemplazada por `brand_identity` (campo unico markdown_content)
