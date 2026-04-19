'use client'

import BrewRatio from '@/components/calculator/brew-ratio'
import ExtractionYield from '@/components/calculator/extraction-yield'
import TemperatureConverter from '@/components/calculator/temperature-converter'

export default function CalculatorPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="tech-card tech-card-grid p-6 sm:p-7">
        <p className="tech-label">Brew lab</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[-0.05em] text-text-primary">
          Brewing calculators
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
          Dial in ratio, extraction, and temperature with structured outputs you can send
          directly into chat or save as your recurring targets.
        </p>
      </div>
      <BrewRatio />
      <ExtractionYield />
      <TemperatureConverter />
    </div>
  )
}
