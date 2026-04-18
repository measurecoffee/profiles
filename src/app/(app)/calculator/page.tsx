'use client'

import BrewRatio from '@/components/calculator/brew-ratio'
import ExtractionYield from '@/components/calculator/extraction-yield'
import TemperatureConverter from '@/components/calculator/temperature-converter'

export default function CalculatorPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-text-primary mb-1">
          Brewing Calculator
        </h1>
        <p className="text-text-secondary text-sm">
          Dial in your brew with live ratio, extraction, and temperature calculations.
        </p>
      </div>
      <BrewRatio />
      <ExtractionYield />
      <TemperatureConverter />
    </div>
  )
}