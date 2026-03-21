export interface KPI {
  name: string
  current: string
  target: string
  timeline: string
}

export interface Feature {
  name: string
  description: string
  priority: 'Must' | 'Should' | 'Could'
}

export interface Integration {
  name: string
  type: 'BD' | 'API' | 'internal'
  description: string
}

export interface BudgetItem {
  type: 'VPS' | 'Storage' | 'License' | 'Other'
  specification: string
  monthlyCost: number
  notes: string
}

export interface Phase {
  name: string
  duration: string
  dates: string
}

export interface Step1Data {
  projectName: string
  clientCompany: string
  date: string
  architectName: string
}

export interface Step2Data {
  problemDescription: string
  impacts: string[]
  technicalConstraints: string
}

export interface Step3Data {
  currentKPIs: KPI[]
  targetKPIs: KPI[]
  returnTimeline: string
  totalInvestment: string
  annualSavings: string
}

export interface Step4Data {
  features: Feature[]
}

export interface Step5Data {
  integrations: Integration[]
}

export interface Step6Data {
  budget: BudgetItem[]
  currency: 'USD' | 'MXN' | 'EUR'
}

export interface Step7Data {
  architectureDescription: string
  stackBackend: string
  stackFrontend: string
  stackDatabase: string
  phases: Phase[]
}

export interface Step8Data {
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
}

export interface StepData {
  step1?: Step1Data
  step2?: Step2Data
  step3?: Step3Data
  step4?: Step4Data
  step5?: Step5Data
  step6?: Step6Data
  step7?: Step7Data
  step8?: Step8Data
  generatedBrief?: string
}
