'use client'

import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { addOptions, orderOptions, toggleOption } from '@/utils/productOptions'

/** Choosing by tapping, for sizes and colors, with room to add one that isn't listed. */
export default function OptionPicker({
  label,
  addLabel,
  options,
  swatches,
  selected,
  onChange,
}: {
  label: string
  addLabel: string
  options: string[]
  swatches?: Record<string, string>
  selected: string[]
  onChange: (selected: string[]) => void
}) {
  const [typed, setTyped] = useState('')

  const shown = [...options, ...orderOptions(selected, options).filter(value => !options.includes(value))]

  const add = () => {
    onChange(addOptions(selected, typed, options))
    setTyped('')
  }

  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {shown.map(option => {
          const isSelected = orderOptions(selected, [option]).includes(option)
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(toggleOption(selected, option))}
              className="chip gap-2"
            >
              {isSelected && <Check size={16} className="shrink-0" />}
              {swatches?.[option] && (
                <span
                  aria-hidden="true"
                  className="w-4 h-4 rounded-full border border-slate-400 shrink-0"
                  style={{ backgroundColor: swatches[option] }}
                />
              )}
              <span>{option}</span>
            </button>
          )
        })}
      </div>
      <div className="flex gap-2 mt-3">
        <input
          aria-label={addLabel}
          placeholder={addLabel}
          value={typed}
          onChange={event => setTyped(event.target.value)}
          onKeyDown={event => {
            // Enter would otherwise save the whole product
            if (event.key === 'Enter') {
              event.preventDefault()
              add()
            }
          }}
          className="field min-w-0 flex-1"
        />
        <button type="button" onClick={add} disabled={!typed.trim()} className="btn btn-secondary shrink-0">
          <Plus size={18} />
          <span>إضافة</span>
        </button>
      </div>
    </fieldset>
  )
}
