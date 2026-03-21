import type { StepData } from '../types'

export function generateBriefMarkdown(stepData: StepData, projectName: string): string {
  const s1 = stepData.step1
  const s2 = stepData.step2
  const s3 = stepData.step3
  const s4 = stepData.step4
  const s5 = stepData.step5
  const s6 = stepData.step6
  const s7 = stepData.step7

  const date = s1?.date ? new Date(s1.date).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX')

  const lines: string[] = []

  lines.push(`# BRIEF TÉCNICO: ${projectName.toUpperCase()}`)
  lines.push('')
  lines.push(`**Cliente:** ${s1?.clientCompany ?? '—'}`)
  lines.push(`**Fecha:** ${date}`)
  lines.push(`**Arquitecto:** ${s1?.architectName ?? '—'}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // 1. Problema
  lines.push('## 1️⃣ PROBLEMA A RESOLVER')
  lines.push('')
  lines.push('### Descripción del Problema')
  lines.push('')
  lines.push(s2?.problemDescription ?? '—')
  lines.push('')
  if (s2?.impacts && s2.impacts.length > 0) {
    lines.push('### Impacto Negativo en el Negocio')
    lines.push('')
    s2.impacts.forEach((impact, i) => {
      if (impact.trim()) lines.push(`- **Impacto ${i + 1}:** ${impact}`)
    })
    lines.push('')
  }
  if (s2?.technicalConstraints) {
    lines.push('### Restricciones Técnicas Actuales')
    lines.push('')
    lines.push(s2.technicalConstraints)
    lines.push('')
  }

  // 2. ROI
  lines.push('## 2️⃣ OBJETIVO & ROI ESPERADO')
  lines.push('')
  if (s3?.currentKPIs && s3.currentKPIs.length > 0) {
    lines.push('### KPIs a Mejorar')
    lines.push('')
    lines.push('| KPI | Valor Actual | Valor Objetivo | Timeline |')
    lines.push('|-----|-------------|---------------|----------|')
    s3.currentKPIs.forEach((kpi, i) => {
      const target = s3.targetKPIs?.[i]
      lines.push(`| ${kpi.name} | ${kpi.current} | ${target?.target ?? '—'} | ${kpi.timeline} |`)
    })
    lines.push('')
  }
  lines.push('### Retorno de Inversión')
  lines.push('')
  lines.push(`- **Inversión Total:** ${s3?.totalInvestment ?? '—'}`)
  lines.push(`- **Ahorro Anual Estimado:** ${s3?.annualSavings ?? '—'}`)
  lines.push(`- **Timeline de Retorno:** ${s3?.returnTimeline ?? '—'}`)
  lines.push('')

  // 3. Funcionalidades
  lines.push('## 3️⃣ FUNCIONES Y CAPACIDADES')
  lines.push('')
  if (s4?.features && s4.features.length > 0) {
    lines.push('| # | Funcionalidad | Descripción | Prioridad |')
    lines.push('|---|--------------|-------------|-----------|')
    s4.features.forEach((f, i) => {
      lines.push(`| ${i + 1} | ${f.name} | ${f.description} | ${f.priority} |`)
    })
  } else {
    lines.push('—')
  }
  lines.push('')

  // 4. Integraciones
  lines.push('## 4️⃣ INTEGRACIONES TÉCNICAS')
  lines.push('')
  if (s5?.integrations && s5.integrations.length > 0) {
    s5.integrations.forEach((int, i) => {
      lines.push(`### Integración ${i + 1}: ${int.name}`)
      lines.push(`- **Tipo:** ${int.type === 'BD' ? 'Base de Datos' : int.type === 'API' ? 'API Externa' : 'Sistema Interno'}`)
      lines.push(`- **Descripción:** ${int.description}`)
      lines.push('')
    })
  } else {
    lines.push('—')
    lines.push('')
  }

  // 5. Presupuesto
  lines.push('## 5️⃣ PRESUPUESTO & RECURSOS')
  lines.push('')
  if (s6?.budget && s6.budget.length > 0) {
    const currency = s6.currency ?? 'USD'
    lines.push(`| Tipo | Especificación | Costo Mensual (${currency}) | Notas |`)
    lines.push('|------|--------------|--------------------------|-------|')
    let total = 0
    s6.budget.forEach((item) => {
      lines.push(`| ${item.type} | ${item.specification} | ${item.monthlyCost.toLocaleString()} | ${item.notes} |`)
      total += item.monthlyCost
    })
    lines.push(`| **TOTAL** | | **${total.toLocaleString()} ${currency}/mes** | |`)
    lines.push(`| **TOTAL ANUAL** | | **${(total * 12).toLocaleString()} ${currency}** | |`)
    lines.push('')
  } else {
    lines.push('—')
    lines.push('')
  }

  // 6. Solución Técnica
  lines.push('## 6️⃣ SOLUCIÓN TÉCNICA PROPUESTA')
  lines.push('')
  lines.push('### Descripción General')
  lines.push('')
  lines.push(s7?.architectureDescription ?? '—')
  lines.push('')
  lines.push('### Stack Tecnológico')
  lines.push('')
  if (s7?.stackBackend) lines.push(`**Backend:** ${s7.stackBackend}`)
  if (s7?.stackFrontend) lines.push(`**Frontend:** ${s7.stackFrontend}`)
  if (s7?.stackDatabase) lines.push(`**Base de Datos:** ${s7.stackDatabase}`)
  lines.push('')

  // 7. Fases
  if (s7?.phases && s7.phases.length > 0) {
    lines.push('## 7️⃣ FASES DE IMPLEMENTACIÓN')
    lines.push('')
    s7.phases.forEach((phase, i) => {
      lines.push(`### Fase ${i + 1}: ${phase.name}`)
      lines.push(`**Duración:** ${phase.duration}`)
      if (phase.dates) lines.push(`**Fechas:** ${phase.dates}`)
      lines.push('')
    })
  }

  // 8. Próximos Pasos
  lines.push('## 8️⃣ PRÓXIMOS PASOS')
  lines.push('')
  lines.push('- [ ] Aprobación del Brief Técnico por el cliente')
  lines.push('- [ ] Aprobación por stakeholders internos')
  lines.push('- [ ] Firma de contrato')
  lines.push('- [ ] Kick-off Meeting')
  lines.push(`- [ ] Inicio Fase 1${s7?.phases?.[0] ? ': ' + s7.phases[0].name : ''}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(`*Documento versión 1.0 — Generado el ${new Date().toLocaleDateString('es-MX')} — Estado: DRAFT*`)

  return lines.join('\n')
}
