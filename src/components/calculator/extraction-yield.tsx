'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import {
  queueCalculatorContext,
  type CalculatorContextPayload,
} from '@/lib/calculator/context'

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
  const router = useRouter()
  const [dose, setDose] = useState(DEFAULTS.dose)
  const [yieldWeight, setYieldWeight] = useState(DEFAULTS.yieldWeight)
  const [tds, setTds] = useState(DEFAULTS.tds)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Extraction Yield = (Yield × TDS%) / Dose × 100
  // TDS is entered as a percentage (e.g., 1.45 means 1.45%)
  const extractionYield = dose > 0 ? (yieldWeight * (tds / 100)) / dose * 100 : 0

  const zone = getExtractionZone(extractionYield)
  const doseRounded = Number(dose.toFixed(2))
  const yieldRounded = Number(yieldWeight.toFixed(2))
  const tdsRounded = Number(tds.toFixed(2))
  const extractionYieldRounded = Number(extractionYield.toFixed(2))

  const contextPayload: CalculatorContextPayload = {
    version: 1,
    calculator: 'extraction_yield',
    title: 'Extraction Yield',
    generatedAt: new Date().toISOString(),
    summary: `Extraction yield is ${extractionYieldRounded}% (${zone.label.toLowerCase()}) from ${doseRounded}g dose, ${yieldRounded}g yield, ${tdsRounded}% TDS.`,
    chatPrompt: `Use these extraction calculator values for my next brew advice: ${doseRounded}g dose, ${yieldRounded}g yield, ${tdsRounded}% TDS, and ${extractionYieldRounded}% extraction (${zone.label.toLowerCase()}). Help me dial this into the ideal range.`,
    inputs: {
      dose_g: doseRounded,
      yield_g: yieldRounded,
      tds_percent: tdsRounded,
    },
    outputs: {
      extraction_yield_percent: extractionYieldRounded,
      extraction_zone: zone.label,
    },
  }

  const handleReset = () => {
    setDose(DEFAULTS.dose)
    setYieldWeight(DEFAULTS.yieldWeight)
    setTds(DEFAULTS.tds)
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
        aria-label="Reset extraction yield"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      <div className="mb-6 pr-12">
        <p className="tech-label">Extraction</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-[-0.04em] text-text-primary">
          Extraction Yield
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="tech-label mb-2 block">
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
            className="tech-input"
          />
        </div>

        <div>
          <label className="tech-label mb-2 block">
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
            className="tech-input"
          />
        </div>

        <div>
          <label className="tech-label mb-2 block">
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
            className="tech-input"
          />
        </div>
      </div>

      <div className="tech-card-muted mb-4 p-6 text-center">
        <div className="tech-label mb-2">
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
        <div className="tech-data-block flex-1 px-3 py-2 text-center">
          <span className="text-destructive">●</span>{' '}
          <span className="text-text-muted">Under &lt;18%</span>
        </div>
        <div className="tech-data-block flex-1 px-3 py-2 text-center">
          <span className="text-success">●</span>{' '}
          <span className="text-text-muted">Ideal 18–22%</span>
        </div>
        <div className="tech-data-block flex-1 px-3 py-2 text-center">
          <span className="text-accent">●</span>{' '}
          <span className="text-text-muted">Over &gt;22%</span>
        </div>
      </div>

      <div className="border-t border-border mt-6 pt-4">
        <p className="text-xs text-text-muted mb-3">
          Bring this extraction snapshot into chat, or save it as your target baseline.
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
          <p className="mt-2 text-xs text-success">Saved. Future advice can use this extraction target.</p>
        )}
        {saveState === 'error' && (
          <p className="mt-2 text-xs text-destructive">Couldn&apos;t save right now. Try again.</p>
        )}
      </div>
    </div>
  )
}
