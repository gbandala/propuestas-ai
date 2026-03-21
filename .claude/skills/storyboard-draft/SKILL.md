---
name: storyboard-draft
description: Genera un borrador textual (storyboard) de infografias y slides antes de la generacion real con IA. Permite al usuario revisar, iterar con comentarios y aprobar antes de gastar tokens en imagenes. Activar cuando el brief tecnico o comercial esta completo y se necesita planear visualmente los materiales.
argument-hint: "[technical|commercial] [project_id]"
user-invocable: true
allowed-tools: Read, Write, Bash
---

# Skill: storyboard-draft

## Que hace este skill

Genera un documento Markdown estructurado que describe **en texto** como se verá cada pieza visual (infografías y slides) antes de generarla con IA. El usuario puede:
1. Leer el storyboard y aprobarlo
2. Pedir cambios con comentarios ("la infografía 2 debería mostrar el timeline en vez de la arquitectura")
3. El skill regenera solo las piezas afectadas
4. Cuando el usuario aprueba, el storyboard queda guardado como contexto para la generación real

---

## Cuando activarlo

- El usuario dice: "genera el storyboard", "planea las infografias", "quiero ver el borrador de los slides", "como quedarían las infografias", "draft del storyboard"
- Después de completar el brief técnico y antes de generar infografías
- Después de completar la propuesta comercial y antes de generar infografías comerciales

---

## Inputs requeridos

Antes de generar, leer:
1. `technical_briefs.step_data` del proyecto — datos del discovery
2. `brand_identity.markdown_content` del proyecto — identidad visual
3. Si es comercial: `commercial_proposals.markdown_content` — propuesta y tarifas

---

## Estructura del storyboard generado

### Para tipo `technical`

Generar un documento con esta estructura:

```markdown
# Storyboard Técnico — [Nombre del Proyecto]
> Versión 1 | Generado: [fecha]
> Estado: PENDIENTE DE APROBACIÓN

---

## INFOGRAFÍAS TÉCNICAS (3 variantes)

### Infografía 1 — Diagrama de Flujo de Datos
**Objetivo:** [que quiere comunicar esta pieza en una oración]
**Audiencia:** Arquitectos y CTOs del cliente
**Layout:** Horizontal LEFT→RIGHT, [N] bloques conectados con flechas
**Dimensiones:** 800×600px

**Paleta de colores:**
- Fondo: [color HEX de brand identity]
- Bloques principales: [color primario]
- Flechas y conectores: [color acento]
- Texto: [color texto]

**Elementos visuales:**
- Bloque A: "[etiqueta corta]" — [descripcion del elemento]
- Bloque B: "[etiqueta corta]" — [descripcion del elemento]
- Flecha A→B: "[accion o dato que fluye]"
[... completar con los elementos del proyecto]

**Texto en imagen:** Solo etiquetas cortas (max 4 palabras por elemento)
**Logo:** Esquina inferior derecha, 60px de alto

---

### Infografía 2 — Arquitectura de Componentes
[... misma estructura]

---

### Infografía 3 — Timeline de Fases
[... misma estructura]

---

## PRESENTACIÓN TÉCNICA (10 slides)

### Slide 1 — Portada
**Tipo:** Cover
**Título:** "[nombre del proyecto o cliente]"
**Subtítulo:** "Propuesta Técnica"
**Fecha:** [fecha del brief]
**Fondo:** [descripción del fondo usando brand identity]
**Logo:** Centrado o esquina superior

### Slide 2 — El Problema
**Tipo:** Problema/Dolor
**Título:** "El Desafío"
**Contenido principal:** 3 bullets con los puntos de dolor del discovery
**Visual:** [ícono o imagen sugerida]
**Nota al pie:** [dato cuantificable del problema si existe]

[... slides 3 al 10 con la misma estructura]
```

### Para tipo `commercial`

Generar storyboard de:
- 2 infografías ROI (Variante A: Timeline de retorno / Variante B: Comparativa Antes-Después)
- 2 infografías Roadmap (Variante A: Timeline horizontal / Variante B: Gantt-style)
- 10 slides de presentación comercial ejecutiva

---

## Flujo de iteración

### Primera generación
1. Leer step_data y brand_identity del proyecto
2. Generar storyboard completo en Markdown
3. Guardar en tabla `storyboards` con `version: 1, approved_at: null`
4. Mostrar al usuario con instrucciones claras:

```
Storyboard listo. Puedes:
- Aprobar: "apruebo el storyboard" o "todo bien, procede"
- Pedir cambios: describe qué cambiar (ej: "la infografía 2 debería ser un pie chart")
- Cambiar piezas específicas: "regenera solo el slide 5 y la infografía 3"
```

### Cuando el usuario pide cambios
1. Identificar qué piezas cambiar (solo las mencionadas, no regenerar todo)
2. Actualizar esas secciones en el documento
3. Guardar nueva versión (`version: N+1`)
4. Mostrar solo las secciones modificadas con `[ACTUALIZADO]` al inicio
5. Preguntar si hay más cambios o si aprueba

### Cuando el usuario aprueba
1. Actualizar `storyboards.approved_at` con timestamp actual
2. Confirmar al usuario que puede proceder a generar las infografías

```
Storyboard aprobado. Ya puedes generar las infografías con:
"genera las infografías técnicas"
```

---

## Reglas de generación

**Para infografías:**
- Cada infografía debe tener un objetivo comunicacional claro y diferenciado de las otras
- Los elementos de texto en imagen deben ser CORTOS (max 4-5 palabras por elemento)
- Los colores deben venir del brand identity — nunca inventar colores
- Si no hay logo configurado, omitir watermark
- Especificar exactamente qué datos del step_data aparecen en cada elemento

**Para slides:**
- Slide 1: Portada (proyecto + cliente + fecha)
- Slide 2: El Problema (pain points del discovery)
- Slide 3: Nuestra Solución (propuesta en una oración + 3 beneficios clave)
- Slide 4: Arquitectura Técnica (referencia a la infografía de arquitectura)
- Slide 5: Funcionalidades MVP (tabla Must/Should/Could simplificada)
- Slide 6: Integraciones (sistemas externos conectados)
- Slide 7: Plan de Implementación (fases del proyecto)
- Slide 8: Inversión por Fase (tabla de presupuesto)
- Slide 9: ROI Esperado (KPIs antes/después)
- Slide 10: Próximos Pasos (CTA claro)

**Para slides comerciales:**
- Slide 1: Portada ejecutiva (solo logo + nombre del cliente + fecha)
- Slide 2: Resumen Ejecutivo (el problema en 2 oraciones + la solución)
- Slide 3: Propuesta de Valor (3 beneficios cuantificados)
- Slide 4: Nuestro Enfoque (metodología, no tecnología)
- Slide 5: Entregables (qué recibirán)
- Slide 6: Roadmap (referencia a infografía roadmap)
- Slide 7: Inversión (tabla de fases con costos)
- Slide 8: ROI Proyectado (referencia a infografía ROI)
- Slide 9: Por Qué Nosotros (diferenciadores)
- Slide 10: Siguiente Paso (CTA con fecha límite sugerida)

---

## Notas de implementación

- El storyboard aprobado se pasa como contexto al prompt de generación de imágenes
- Si el usuario pide cambios al storyboard DESPUÉS de haber generado infografías, advertir que necesitará regenerar esas imágenes
- Versionar siempre — nunca sobreescribir una versión aprobada
