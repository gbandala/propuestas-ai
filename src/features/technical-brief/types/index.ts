export interface Step1Data {
  projectName: string
  clientCompany: string
  date: string
  architectName: string
}

export interface Step2Data {
  problem: string
  objective: string
  inputs: string
  expectedOutput: string
}

export interface Step3Data {
  whatItDoes: string
  requirements: string
  outputs: string
  howToTest: string
  failureHandling: string
  validCases: string
}

export interface Step4Data {
  architectureDecisions: string
  selfServiceConfig: string
  whenToEscalate: string
}

export interface Deliverable {
  name: string
  format: string
  acceptanceCriteria: string
}

export interface Step5Data {
  deliverables: Deliverable[]
  finalAcceptanceCriteria: string
}

export interface StepData {
  step1?: Step1Data
  step2?: Step2Data
  step3?: Step3Data
  step4?: Step4Data
  step5?: Step5Data
  generatedBrief?: string
}
