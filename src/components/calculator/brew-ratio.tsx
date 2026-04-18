'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

const DEFAULTS = {
  coffeeDose: 20,
  ratio: 16,
  cups: 1,
}

export default function BrewRatio() {
  const [coffeeDose, setCoffeeDose] = useState(DEFAULTS.coffeeDose)
  const [ratio, setRatio] = useState(DEFAULTS.ratio)
  const [cups, setCups] = useState(DEFAULTS.cups)

  const totalWater = coffeeDose * ratio
  const totalYield = totalWater
  const perCupYield = cups > 0 ? totalYield / cups : 0

  const handleReset = () => {
    setCoffeeDose(DEFAULTS.coffeeDose)
    setRatio(DEFAULTS.ratio)
    setCups(DEFAULTS.cups)
  }

  return (
    <div className="relative bg-surface border border-border rounded-lg p-6">
      <button
        onClick={handleReset}
        className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
        aria-label="Reset brew ratio"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      <h2 className="font-[family-name:var(--font-display)] text-xl text-text-primary mb-6">
        Brew Ratio
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
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
            className="w-full h-11 px-3 bg-surface border border-border rounded-md font-[family-name:var(--font-mono)] text-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
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
            className="w-full h-11 px-3 bg-surface border border-border rounded-md font-[family-name:var(--font-mono)] text-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
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
            className="w-full h-11 px-3 bg-surface border border-border rounded-md font-[family-name:var(--font-mono)] text-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-muted rounded-md p-4 text-center">
          <div className="font-mono text-xs uppercase tracking-wider text-text-muted mb-1">
            Total Water
          </div>
          <div className="font-[family-name:var(--font-mono)] text-2xl text-text-primary">
            {totalWater.toLocaleString()}<span className="text-base text-text-muted ml-1">g</span>
          </div>
        </div>
        <div className="bg-surface-muted rounded-md p-4 text-center">
          <div className="font-mono text-xs uppercase tracking-wider text-text-muted mb-1">
            Total Yield
          </div>
          <div className="font-[family-name:var(--font-mono)] text-2xl text-text-primary">
            {totalYield.toLocaleString()}<span className="text-base text-text-muted ml-1">ml</span>
          </div>
        </div>
        <div className="bg-surface-muted rounded-md p-4 text-center">
          <div className="font-mono text-xs uppercase tracking-wider text-text-muted mb-1">
            Per Cup
          </div>
          <div className="font-[family-name:var(--font-mono)] text-2xl text-text-primary">
            {cups > 0 ? perCupYield.toFixed(0) : '—'}<span className="text-base text-text-muted ml-1">ml</span>
          </div>
        </div>
      </div>
    </div>
  )
}