'use client'

import { useState } from 'react'
import { FlaskConical, Coffee } from 'lucide-react'

function RatioCalculator() {
  const [water, setWater] = useState(250)
  const [ratio, setRatio] = useState(16)
  const coffeeDose = (water / ratio).toFixed(1)

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-accent" />
        Brew Ratio Calculator
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Water (ml)
          </label>
          <input
            type="number"
            value={water}
            onChange={(e) => setWater(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Ratio (1:X)
          </label>
          <input
            type="number"
            value={ratio}
            onChange={(e) => setRatio(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="bg-latte rounded-lg p-4 text-center">
          <p className="text-sm text-text-muted">Coffee dose</p>
          <p className="text-3xl font-[family-name:var(--font-display)] text-espresso">{coffeeDose}g</p>
        </div>
      </div>
    </div>
  )
}

function BrewPresets() {
  const presets = [
    { method: 'Pour Over', ratio: '1:16', temp: '96°C', time: '3:30', grind: 'Medium-fine' },
    { method: 'French Press', ratio: '1:15', temp: '93°C', time: '4:00', grind: 'Coarse' },
    { method: 'AeroPress', ratio: '1:12', temp: '85°C', time: '2:00', grind: 'Fine' },
    { method: 'Espresso', ratio: '1:2', temp: '93°C', time: '0:28', grind: 'Extra-fine' },
    { method: 'Cold Brew', ratio: '1:8', temp: 'Room temp', time: '12:00:00', grind: 'Coarse' },
  ]

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Coffee className="h-5 w-5 text-accent" />
        Brew Presets
      </h3>
      <div className="space-y-3">
        {presets.map((p) => (
          <div key={p.method} className="flex items-center justify-between bg-background rounded-lg px-4 py-3">
            <span className="font-medium text-text-primary">{p.method}</span>
            <div className="flex gap-4 text-xs text-text-muted">
              <span title="Ratio">{p.ratio}</span>
              <span title="Temperature">{p.temp}</span>
              <span title="Time">{p.time}</span>
              <span title="Grind">{p.grind}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CalculatorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-[family-name:var(--font-display)] text-espresso mb-1">
          Brewing Calculator
        </h1>
        <p className="text-text-secondary text-sm">
          Dial in your brew with ratio calculators and preset recipes.
        </p>
      </div>
      <RatioCalculator />
      <BrewPresets />
    </div>
  )
}