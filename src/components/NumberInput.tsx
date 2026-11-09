'use client'

import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { numberText } from '@/utils/numbers'

type Props = Omit<ComponentProps<'input'>, 'type' | 'step' | 'ref'> & {
  /** Lets the number start with a minus, for coordinates. */
  negative?: boolean
}

/**
 * Every number box on the site. A browser's own number box shows digits in the browser's language
 * and treats "٥1" as empty, so this one accepts both kinds of digit and always shows English ones.
 */
export default function NumberInput({ value, onChange, min, max, negative = false, inputMode = 'decimal', ...rest }: Props) {
  const field = useRef<HTMLInputElement>(null)
  // What's being typed, like "12." on the way to "12.5", while the form may only hold 12
  const [typing, setTyping] = useState<string | null>(null)
  const saved = String(value ?? '')
  const shown = typing !== null && (typing === '-' || Number(typing) === Number(saved)) ? typing : saved

  useEffect(() => {
    const amount = Number(saved)
    const tooLow = saved !== '' && min !== undefined && amount < Number(min)
    const tooHigh = saved !== '' && max !== undefined && amount > Number(max)
    field.current?.setCustomValidity(tooLow ? `أقل قيمة هي ${min}` : tooHigh ? `أعلى قيمة هي ${max}` : '')
  }, [saved, min, max])

  return (
    <input
      {...rest}
      ref={field}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      value={shown}
      onChange={event => {
        const clean = numberText(event.target.value, negative)
        event.target.value = clean
        setTyping(clean)
        onChange?.(event)
      }}
    />
  )
}
