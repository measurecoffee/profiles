'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import {
  queueCalculatorContext,
  type CalculatorContextPayload,
} from '@/lib/calculator/context'

const DEFAULTS = {
  coffeeDose: 20,
  ratio: 16,
  cups: 1,
}

export default function BrewRatio() {
  const router = useRouter()
  const [coffeeDose, setCoffeeDose] = useState(DEFAULTS.coffeeDose)
  const [ratio, setRatio] = useState(DEFAULTS.ratio)
  const [cups, setCups] = useState(DEFAULTS.cups)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const totalWater = coffeeDose * ratio
  const totalYield = totalWater
  const perCupYield = cups > 0 ? totalYield / cups : 0
  const coffeeDoseRounded = Number(coffeeDose.toFixed(2))
  const ratioRounded = Number(ratio.toFixed(2))
  const cupsRounded = Number(cups.toFixed(2))
  const totalWaterRounded = Number(totalWater.toFixed(2))
  const totalYieldRounded = Number(totalYield.toFixed(2))
  const perCupYieldRounded = Number(perCupYield.toFixed(2))

  const contextPayload: CalculatorContextPayload = {
    version: 1,
    calculator: 'brew_ratio',
    title: 'Brew Ratio',
    generatedAt: new Date().toISOString(),
    summary: `Targeting ${coffeeDoseRounded}g coffee at 1:${ratioRounded} for ${cupsRounded} cup(s), with ${totalWaterRounded}g water total.`,
    chatPrompt: `Use these calculator values for my next brew advice: ${coffeeDoseRounded}g coffee, ratio 1:${ratioRounded}, ${cupsRounded} cup(s), ${totalWaterRounded}g water total and ${perCupYieldRounded}ml per cup. Help me improve this recipe.`,
    inputs: {
      coffee_dose_g: coffeeDoseRounded,
      ratio: ratioRounded,
      cups: cupsRounded,
    },
    outputs: {
      total_water_g: totalWaterRounded,
      total_yield_ml: totalYieldRounded,
      per_cup_yield_ml: perCupYieldRounded,
    },
  }

  const handleReset = () => {
    setCoffeeDose(DEFAULTS.coffeeDose)
    setRatio(DEFAULTS.ratio)
    setCups(DEFAULTS.cups)
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
        aria-label="Reset brew ratio"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      <div className="mb-6 pr-12">
        <p className="tech-label">Ratio</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-[-0.04em] text-text-primary">
          Brew Ratio
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="tech-label mb-2 block">
            Coffee Dose (g)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={coffeeDose}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || val === '.') return setCoffeeDose(0 as unknown as number)
              const num = parseFloat(val)
              if (!isNaN(num) && num >= 0) setCoffeeDose(num)
            }}
            className="tech-input"
          />
        </div>

        <div>
          <label className="tech-label mb-2 block">
            Ratio (1:X)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={ratio}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || val === '.') return setRatio(0 as unknown as number)
              const num = parseFloat(val)
              if (!isNaN(num) && num >= 0) setRatio(num)
            }}
            className="tech-input"
          />
        </div>

        <div>
          <label className="tech-label mb-2 block">
            Cups (8oz each)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={cups}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || val === '.') return setCups(0 as unknown as number)
              const num = parseFloat(val)
              if (!isNaN(num) && num >= 0) setCups(num)
            }}
            className="tech-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="tech-data-block text-center">
          <div className="tech-label mb-1">
            Total Water
          </div>
          <div className="font-[family-name:var(--font-mono)] text-2xl text-text-primary">
            {totalWater.toLocaleString()}<span className="text-base text-text-muted ml-1">g</span>
          </div>
        </div>
        <div className="tech-data-block text-center">
          <div className="tech-label mb-1">
            Total Yield
          </div>
          <div className="font-[family-name:var(--font-mono)] text-2xl text-text-primary">
            {totalYield.toLocaleString()}<span className="text-base text-text-muted ml-1">ml</span>
          </div>
        </div>
        <div className="tech-data-block text-center">
          <div className="tech-label mb-1">
            Per Cup
          </div>
          <div className="font-[family-name:var(--font-mono)] text-2xl text-text-primary">
            {cups > 0 ? perCupYield.toFixed(0) : '—'}<span className="text-base text-text-muted ml-1">ml</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border mt-6 pt-4">
        <p className="text-xs text-text-muted mb-3">
          Send this ratio into chat as structured brew context, or save it as a recurring target.
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
          <p className="mt-2 text-xs text-success">Saved. These targets will inform future advice.</p>
        )}
        {saveState === 'error' && (
          <p className="mt-2 text-xs text-destructive">Couldn&apos;t save right now. Try again.</p>
        )}
      </div>
    </div>
  )
}
