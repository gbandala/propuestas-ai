const STEPS = [
  'Datos',
  'Problema',
  'ROI',
  'Funcionalidades',
  'Integraciones',
  'Presupuesto',
  'Solución',
  'Marca',
]

export function StepProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Paso {currentStep} de {STEPS.length}
        </span>
        <span className="text-sm text-gray-500">{STEPS[currentStep - 1]}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
        />
      </div>
      <div className="mt-3 hidden gap-1 sm:flex">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`flex-1 text-center text-xs ${
              i + 1 === currentStep
                ? 'font-semibold text-blue-600'
                : i + 1 < currentStep
                ? 'text-green-600'
                : 'text-gray-400'
            }`}
          >
            {i + 1 < currentStep ? '✓' : i + 1 === currentStep ? '●' : '○'}
          </div>
        ))}
      </div>
    </div>
  )
}
