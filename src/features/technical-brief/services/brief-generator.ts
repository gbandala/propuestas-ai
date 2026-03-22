import type { StepData } from '../types'

export function generateBriefMarkdown(stepData: StepData, projectName: string): string {
  const s1 = stepData.step1
  const s2 = stepData.step2
  const s3 = stepData.step3
  const s4 = stepData.step4
  const s5 = stepData.step5

  const date = s1?.date ? new Date(s1.date).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX')

  const lines: string[] = []

  lines.push(`# BRIEF TECNICO: ${projectName.toUpperCase()}`)
  lines.push('')
  lines.push(`**Cliente:** ${s1?.clientCompany ?? '—'}`)
  lines.push(`**Fecha:** ${date}`)
  lines.push(`**Arquitecto:** ${s1?.architectName ?? '—'}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // 1. Contexto del problema
  lines.push('## 1. CONTEXTO DEL PROBLEMA')
  lines.push('')
  lines.push('### Problema')
  lines.push('')
  lines.push(s2?.problem ?? '—')
  lines.push('')
  lines.push('### Objetivo')
  lines.push('')
  lines.push(s2?.objective ?? '—')
  lines.push('')
  lines.push('### Insumos')
  lines.push('')
  lines.push(s2?.inputs ?? '—')
  lines.push('')
  lines.push('### Producto o Resultado Esperado')
  lines.push('')
  lines.push(s2?.expectedOutput ?? '—')
  lines.push('')
  lines.push('---')
  lines.push('')

  // 2. Solucion tecnica
  lines.push('## 2. SOLUCION TECNICA')
  lines.push('')
  lines.push('### Que hace')
  lines.push('')
  lines.push(s3?.whatItDoes ?? '—')
  lines.push('')
  lines.push('### Que necesita para funcionar')
  lines.push('')
  lines.push(s3?.requirements ?? '—')
  lines.push('')
  lines.push('### Que produce')
  lines.push('')
  lines.push(s3?.outputs ?? '—')
  lines.push('')
  lines.push('### Como probarlo')
  lines.push('')
  lines.push(s3?.howToTest ?? '—')
  lines.push('')
  lines.push('### Que hacer en caso de falla')
  lines.push('')
  lines.push(s3?.failureHandling ?? '—')
  lines.push('')
  lines.push('### En que casos funciona')
  lines.push('')
  lines.push(s3?.validCases ?? '—')
  lines.push('')
  lines.push('---')
  lines.push('')

  // 3. Registro de decisiones
  lines.push('## 3. REGISTRO DE DECISIONES')
  lines.push('')
  lines.push('### Decisiones de arquitectura y sus razones')
  lines.push('')
  lines.push(s4?.architectureDecisions ?? '—')
  lines.push('')
  lines.push('### Que puede configurar el cliente sin solicitar ayuda')
  lines.push('')
  lines.push(s4?.selfServiceConfig ?? '—')
  lines.push('')
  lines.push('### En que casos si solicitar ayuda del arquitecto')
  lines.push('')
  lines.push(s4?.whenToEscalate ?? '—')
  lines.push('')
  lines.push('---')
  lines.push('')

  // 4. Entregables
  lines.push('## 4. ENTREGABLES DE LA SOLUCION')
  lines.push('')
  if (s5?.deliverables && s5.deliverables.length > 0) {
    lines.push('| # | Entregable | Formato | Criterio de Aceptacion |')
    lines.push('|---|-----------|---------|------------------------|')
    s5.deliverables.forEach((d, i) => {
      lines.push(`| ${i + 1} | ${d.name} | ${d.format} | ${d.acceptanceCriteria} |`)
    })
    lines.push('')
  } else {
    lines.push('—')
    lines.push('')
  }
  lines.push('### Criterio de Aceptacion Final')
  lines.push('')
  lines.push(s5?.finalAcceptanceCriteria ?? '—')
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(`*Documento version 1.0 — Generado el ${new Date().toLocaleDateString('es-MX')} — Estado: DRAFT*`)

  return lines.join('\n')
}
