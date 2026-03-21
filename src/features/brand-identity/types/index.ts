export interface BrandIdentityData {
  id: string
  project_id: string
  markdown_content: string
  created_at: string
  updated_at: string
}

export const BRAND_IDENTITY_TEMPLATE = `# Brand Identity — [Nombre del Proyecto]

## Colores
- Primario: #2563EB
- Secundario: #1E40AF
- Acento: #F59E0B
- Fondo: #F8FAFC
- Texto: #0F172A
- Texto claro: #64748B

## Tipografia
- Titulos: Inter Bold
- Subtitulos: Inter SemiBold
- Cuerpo: Inter Regular
- Monospace / Codigo: JetBrains Mono

## Tono Visual
- Estilo general: Profesional, moderno, limpio
- Sensacion: Confianza tecnica, precision, claridad
- Evitar: colores saturados, tipografias decorativas, fondos recargados

## Logo
- URL: (pegar URL publica del logo en PNG o SVG)
- Variante oscura (para fondos claros): (URL opcional)
- Variante clara (para fondos oscuros): (URL opcional)
- Posicion en materiales: esquina inferior derecha
- Tamano minimo: 60px de alto

## Texturas y Fondos
- Fondo principal de slides: gradiente suave de #F8FAFC a #EFF6FF
- Fondo de slides oscuros: #0F172A
- Patron o textura: ninguno (fondo limpio)

## Estilo de Graficas e Infografias
- Bordes: redondeados (border-radius: 8px)
- Sombras: suaves (box-shadow: 0 2px 8px rgba(0,0,0,0.08))
- Iconos: estilo lineal (outline), no rellenos
- Flechas y conectores: color acento, grosor 2px

## Notas Adicionales
- (Agregar aqui cualquier restriccion o preferencia especifica del cliente)
`
