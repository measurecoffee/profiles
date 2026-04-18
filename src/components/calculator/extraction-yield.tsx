'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

const DEFAULTS = {
  dose: 20,
  yieldWeight: 340,
  tds: 1.45,
}

function getExtractionZone(ey: number): { label: string; className: string } {
  if (ey < 18) return { label: 'Under-extracted', className: 'text-destructive' }
  if (ey <= 22) return { label: 'Ideal', className: 'text-success' }
  return { label: 'Over-extracted', className: 'text-accent' }
}

export default function ExtractionYield() {
  const [dose, setDose] = useState(DEFAULTS.dose)
  const [yieldWeight, setYieldWeight] = useState(DEFAULTS.yieldWeight)
  const [tds, setTds] = useState(DEFAULTS.tds)

  // Extraction Yield = (Yield × TDS%) / Dose × 100
  // TDS is entered as a percentage (e.g., 1.45 means 1.45%)
  const extractionYield = dose > 0 ? (yieldWeight * (tds / 100)) / dose * 100 : 0

  const zone = getExtractionZone(extractionYield)

  const handleReset = () => {
    setDose(DEFAULTS.dose)
    setYieldWeight(DEFAULTS.yieldWeight)
    setTds(DEFAULTS.tds)
  }

  return (
    <div className="relative bg-surface border border-border rounded-lg p-6">
      <button
        onClick={handleReset}
        className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
        aria-label="Reset extraction yield"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      <h2 className="font-[family-name:var(--font-display)] text-xl text-text-primary mb-6">
        Extraction Yield
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
            Dose (g)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={dose}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || val === '.') return setDose(0 as unknown as number)
              const num = parseFloat(val)
              if (!isNaN(num) && num >= 0) setDose(num)
            }}
            className="w-full h-11 px-3 bg-surface border border-border rounded-md font-[family-name:var(--font-mono)] text-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
            Yield (g)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={yieldWeight}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || val === '.') return setYieldWeight(0 as unknown as number)
              const num = parseFloat(val)
              if (!isNaN(num) && num >= 0) setYieldWeight(num)
            }}
            className="w-full h-11 px-3 bg-surface border border-border rounded-md font-[family-name:var(--font-mono)] text-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
            TDS (%)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={tds}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || val === '.') return setTds(0 as unknown as number)
              const num = parseFloat(val)
              if (!isNaN(num) && num >= 0) setTds(num)
            }}
            className="w-full h-11 px-3 bg-surface border border-border rounded-md font-[family-name:var(--font-mono)] text-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="bg-surface-muted rounded-md p-6 text-center mb-4">
        <div className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
          Extraction Yield
        </div>
        <div className={`font-[family-name:var(--font-mono)] text-4xl ${zone.className}`}>
          {dose > 0 ? extractionYield.toFixed(2) : '—'}%
        </div>
        <div className={`font-mono text-sm mt-1 ${zone.className}`}>
          {dose > 0 ? zone.label : ''}
        </div>
      </div>

      <div className="flex gap-3 text-xs font-mono">
        <div className="flex-1 bg-surface-muted rounded-md px-3 py-2 text-center">
          <span className="text-destructive">●</span>{' '}
          <span className="text-text-muted">Under &lt;18%</span>
        </div>
        <div className="flex-1 bg-surface-muted rounded-md px-3 py-2 text-center">
          <span className="text-success">●</span>{' '}
          <span className="text-text-muted">Ideal 18–22%</span>
        </div>
        <div className="flex-1 bg-surface-muted rounded-md px-3 py-2 text-center">
          <span className="text-accent">●</span>{' '}
          <span className="text-text-muted">Over &gt;22%</span>
        </div>
      </div>
    </div>
  )
}