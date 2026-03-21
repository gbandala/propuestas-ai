# PropuestasAI — Pendientes y Estado del Proyecto

> Ultima actualizacion: 2026-03-21
> App: Generador automatico de materiales de propuesta tecnica y comercial (infografias + presentaciones HTML)

---

## Estado General

El proyecto tiene completado el flujo de la **Fase Tecnica** (pasos 1-4 del happy path).
La **Fase Comercial** y los entregables finales (presentaciones + descarga) estan pendientes.

---

## Completado

### Infraestructura
- [x] Supabase configurado (URL + keys en .env.local)
- [x] Tipos de base de datos definidos (src/types/database.ts) — todas las tablas del BUSINESS_LOGIC
- [x] Cliente Supabase (client, server, proxy)
- [x] Estructura feature-first del proyecto

### Auth (src/features/auth/)
- [x] Login con email/password
- [x] Signup
- [x] Forgot password / Update password
- [x] Google OAuth (callback route)
- [x] Roles: architect | commercial | admin
- [x] Proteccion de rutas por rol (commercial bloqueado en /technical)

### Feature: Projects (src/features/projects/)
- [x] Dashboard de proyectos (/dashboard)
- [x] Crear proyecto (modal con nombre, cliente, descripcion)
- [x] Ver detalle del proyecto (/projects/[id])
- [x] Status badge (draft / in_progress / completed / archived)
- [x] Logica de acceso condicional: Fase Comercial bloqueada hasta que Fase Tecnica este completa
- [x] Store Zustand (projects.store.ts)

### Feature: Technical Brief (src/features/technical-brief/)
- [x] Formulario multi-paso de 8 pasos:
  - [x] Step 1: Datos del proyecto (nombre, empresa, arquitecto, fecha)
  - [x] Step 2: Problema (descripcion + impactos)
  - [x] Step 3: ROI esperado (KPIs actuales y objetivo)
  - [x] Step 4: Funcionalidades (tabla con prioridad Must/Should/Could)
  - [x] Step 5: Integraciones tecnicas
  - [x] Step 6: Presupuesto (tabla de recursos)
  - [x] Step 7: Solucion tecnica y stack
  - [x] Step 8: Marca (logo, colores)
- [x] Generacion del brief tecnico en Markdown
- [x] Barra de progreso por pasos
- [x] Preview del brief generado (BriefPreview)
- [x] Guardado progresivo (actions/technical-brief.ts)
- [x] Store Zustand (technical-brief.store.ts)

### Feature: Infographic Generation (src/features/infographic-generation/)
- [x] Generacion asincrona de 3 variantes tecnicas con IA (OpenRouter + Gemini)
  - Variante 1: Diagrama de Flujo de Datos
  - Variante 2: Arquitectura de Componentes estilo AWS/Azure
  - Variante 3: Timeline Tecnico de Fases
- [x] Barra de progreso por variante (Supabase Realtime)
- [x] Seleccion de variante preferida
- [x] Retry por variante fallida
- [x] Persistencia de jobs en generation_jobs
- [x] Hook useRealtimeJobProgress (suscripcion en tiempo real)
- [x] Prompt builder por variante (prompt-builder.ts)
- [x] Integracion OpenRouter (openrouter-image.ts)

---

## Pendiente

### FALTA: OPENROUTER_API_KEY en .env.local
- [ ] Agregar `OPENROUTER_API_KEY=sk-or-...` en .env.local
  - Sin esta key la generacion de infografias falla en silencio
  - Obtener en: https://openrouter.ai/keys

### Feature: Brand Identity
- [ ] Verificar si el Step 8 del brief ya guarda en tabla `brand_specs` o solo en `step_data`
- [ ] Si no: crear accion para persistir logo_url + colores en tabla brand_specs separada
- [ ] Validacion de contraste WCAG AA (ratio > 4.5:1) con alerta no bloqueante

### Feature: Presentation Generation (src/features/presentation-generation/) — NO EXISTE AUN
- [ ] Generar presentacion tecnica HTML (10 slides) con brand identity
- [ ] Preview de 2 slides antes de aprobar
- [ ] Persistir en tabla `presentations` (type: 'technical')
- [ ] Ruta: /projects/[id]/technical → boton "Generar presentacion" post-seleccion de infografia

### Feature: Commercial Proposal (src/features/commercial-proposal/) — NO EXISTE AUN
- [ ] Ruta: /projects/[id]/commercial (el link ya existe en /projects/[id] pero la page no)
- [ ] Editor Markdown para descripcion ejecutiva
- [ ] Tabla de fases con costos (Discovery, Diseno, Implementacion, Rollout)
- [ ] Roadmap con actividades, fechas y equipos
- [ ] Generacion de propuesta-comercial.md
- [ ] Persistir en tabla `commercial_proposals`
- [ ] Generacion de infografias comerciales (2 ROI + 2 Roadmap)
  - ROI Variante A: Timeline de retorno (zona roja/verde)
  - ROI Variante B: Comparativa Antes/Despues
  - Roadmap Variante A: Timeline horizontal de 4 fases
  - Roadmap Variante B: Gantt-style con actividades
- [ ] Generacion de presentacion comercial HTML (10 slides ejecutivos)

### Feature: Downloads (src/features/downloads/) — NO EXISTE AUN
- [ ] ZIP tecnico: `{slug}-tecnica.zip` con brief.md + infografias + presentacion.html
- [ ] ZIP comercial: `{slug}-comercial.zip` con propuesta.md + infografias + presentacion.html
- [ ] ZIP completo: `{slug}-completo.zip` con ambas carpetas
- [ ] Metadata JSON: `{slug}.json` incluido en cada ZIP
- [ ] Registro de descargas en tabla `downloads`
- [ ] Botones de descarga en /projects/[id] segun fase completada

### Testing
- [ ] Tests E2E con Playwright:
  - [ ] Flujo completo arquitecto (crear proyecto → brief → infografias → presentacion → descarga)
  - [ ] Flujo comercial (acceso condicional → propuesta → infografias → descarga)
  - [ ] Validar bloqueo de fase comercial sin fase tecnica

### Deploy
- [ ] Configurar variables de entorno en Vercel
- [ ] Deploy en Vercel
- [ ] Configurar dominio de produccion en Supabase (Site URL + OAuth redirects)

---

## Notas Tecnicas

- La ruta `/projects/[id]/commercial` esta referenciada en el detail page pero **la page.tsx no existe**
- Los jobs de generacion se procesan **en el Server Action** (no en Edge Functions) — esto puede tener timeout en Vercel (max 60s). Revisar si las 3 infografias se generan en tiempo
- OpenRouter usa `google/gemini-2.0-flash-exp` para imagenes — confirmar que el modelo sigue disponible
- Supabase Realtime ya esta configurado en `useRealtimeJobProgress` para ver progreso en vivo

---

## Siguiente Paso Recomendado

1. Agregar `OPENROUTER_API_KEY` en .env.local
2. Probar la generacion de infografias tecnicas end-to-end
3. Implementar `/projects/[id]/commercial` (la ruta ya esta linkeada)
4. Implementar feature downloads para poder cerrar el ciclo completo
