'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

const BREW_TEMP_PRESETS_F = [195, 200, 205, 212]

function fToC(f: number): number {
  return (f - 32) * 5 / 9
}

function cToF(c: number): number {
  return c * 9 / 5 + 32
}

export default function TemperatureConverter() {
  const [fahrenheit, setFahrenheit] = useState(200)
  const [celsius, setCelsius] = useState(Number(fToC(200).toFixed(1)))
  const [lastEdited, setLastEdited] = useState<'F' | 'C'>('F')

  const handleFahrenheitChange = (value: string) => {
    if (value === '' || value === '.') {
      setFahrenheit(0 as unknown as number)
      setCelsius(fToC(0).toFixed(1) as unknown as number)
      setLastEdited('F')
      return
    }
    const num = parseFloat(value)
    if (!isNaN(num)) {
      setFahrenheit(num)
      setCelsius(Number(fToC(num).toFixed(1)))
      setLastEdited('F')
    }
  }

  const handleCelsiusChange = (value: string) => {
    if (value === '' || value === '.') {
      setCelsius(0 as unknown as number)
      setFahrenheit(cToF(0).toFixed(1) as unknown as number)
      setLastEdited('C')
      return
    }
    const num = parseFloat(value)
    if (!isNaN(num)) {
      setCelsius(num)
      setFahrenheit(Number(cToF(num).toFixed(1)))
      setLastEdited('C')
    }
  }

  const handlePresetSelect = (f: number) => {
    setFahrenheit(f)
    setCelsius(Number(fToC(f).toFixed(1)))
    setLastEdited('F')
  }

  const handleReset = () => {
    setFahrenheit(200)
    setCelsius(Number(fToC(200).toFixed(1)))
    setLastEdited('F')
  }

  return (
    <div className="relative bg-surface border border-border rounded-lg p-6">
      <button
        onClick={handleReset}
        className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
        aria-label="Reset temperature"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      <h2 className="font-[family-name:var(--font-display)] text-xl text-text-primary mb-6">
        Temperature Converter
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
            Fahrenheit (°F)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={lastEdited === 'F' ? fahrenheit : fahrenheit.toFixed(1)}
            onChange={(e) => handleFahrenheitChange(e.target.value)}
            className="w-full h-11 px-3 bg-surface border border-border rounded-md font-[family-name:var(--font-mono)] text-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
            Celsius (°C)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={lastEdited === 'C' ? celsius : celsius.toFixed(1)}
            onChange={(e) => handleCelsiusChange(e.target.value)}
            className="w-full h-11 px-3 bg-surface border border-border rounded-md font-[family-name:var(--font-mono)] text-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-text-muted mb-3">
          Common Brew Temps
        </div>
        <div className="flex flex-wrap gap-2">
          {BREW_TEMP_PRESETS_F.map((f) => (
            <button
              key={f}
              onClick={() => handlePresetSelect(f)}
              className="px-3 py-1.5 bg-surface-muted border border-border rounded-md font-[family-name:var(--font-mono)] text-sm text-text-primary hover:bg-latte hover:border-border-hover transition-colors"
            >
              {f}°F
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}