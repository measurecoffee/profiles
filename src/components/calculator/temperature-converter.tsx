'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import {
  queueCalculatorContext,
  type CalculatorContextPayload,
} from '@/lib/calculator/context'

const BREW_TEMP_PRESETS_F = [195, 200, 205, 212]

function fToC(f: number): number {
  return (f - 32) * 5 / 9
}

function cToF(c: number): number {
  return c * 9 / 5 + 32
}

export default function TemperatureConverter() {
  const router = useRouter()
  const [fahrenheit, setFahrenheit] = useState(200)
  const [celsius, setCelsius] = useState(Number(fToC(200).toFixed(1)))
  const [lastEdited, setLastEdited] = useState<'F' | 'C'>('F')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const fahrenheitRounded = Number(fahrenheit.toFixed(2))
  const celsiusRounded = Number(celsius.toFixed(2))

  const contextPayload: CalculatorContextPayload = {
    version: 1,
    calculator: 'temperature_converter',
    title: 'Temperature Converter',
    generatedAt: new Date().toISOString(),
    summary: `Target brew temperature is ${fahrenheitRounded}°F (${celsiusRounded}°C).`,
    chatPrompt: `Use this brew temperature in my next advice: ${fahrenheitRounded}°F (${celsiusRounded}°C). Help me adjust extraction and taste around this target.`,
    inputs: {
      fahrenheit: fahrenheitRounded,
      celsius: celsiusRounded,
    },
    outputs: {
      fahrenheit: fahrenheitRounded,
      celsius: celsiusRounded,
    },
  }

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
    setSaveState('idle')
  }

  const handleUseInChat = () => {
    queueCalculatorContext(contextPayload)
    router.push('/chat?from=calculator')
  }

  const handleSaveTargets = async () => {
    if (saveState === 'saving') return
    setSaveState('saving')

    try {
      const res = await fetch('/api/calculator/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: contextPayload }),
      })

      if (!res.ok) {
        setSaveState('error')
        return
      }

      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  return (
    <div className="tech-card p-6">
      <button
        onClick={handleReset}
        className="tech-icon-button absolute right-4 top-4"
        aria-label="Reset temperature"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      <div className="mb-6 pr-12">
        <p className="tech-label">Temperature</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-[-0.04em] text-text-primary">
          Temperature Converter
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="tech-label mb-2 block">
            Fahrenheit (°F)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={lastEdited === 'F' ? fahrenheit : fahrenheit.toFixed(1)}
            onChange={(e) => handleFahrenheitChange(e.target.value)}
            className="tech-input"
          />
        </div>

        <div>
          <label className="tech-label mb-2 block">
            Celsius (°C)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={lastEdited === 'C' ? celsius : celsius.toFixed(1)}
            onChange={(e) => handleCelsiusChange(e.target.value)}
            className="tech-input"
          />
        </div>
      </div>

      <div>
        <div className="tech-label mb-3">
          Common Brew Temps
        </div>
        <div className="flex flex-wrap gap-2">
          {BREW_TEMP_PRESETS_F.map((f) => (
            <button
              key={f}
              onClick={() => handlePresetSelect(f)}
              className="tech-chip-button"
            >
              {f}°F
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border mt-6 pt-4">
        <p className="text-xs text-text-muted mb-3">
          Carry this temperature into chat as session context, or save it as your recurring target.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleUseInChat}
            className="tech-button-primary flex-1 px-4 text-sm"
          >
            Use in Next Brew Advice
          </button>
          <button
            onClick={handleSaveTargets}
            disabled={saveState === 'saving'}
            className="tech-button-secondary flex-1 px-4 text-sm"
          >
            {saveState === 'saving' ? 'Saving...' : 'Save These Targets'}
          </button>
        </div>
        {saveState === 'saved' && (
          <p className="mt-2 text-xs text-success">Saved. Temperature preferences are now in your profile.</p>
        )}
        {saveState === 'error' && (
          <p className="mt-2 text-xs text-destructive">Couldn&apos;t save right now. Try again.</p>
        )}
      </div>
    </div>
  )
}
