'use client'

import { useEffect } from 'react'
import { latinDigits } from '@/utils/numbers'

const WRITTEN_TYPES = new Set(['text', 'search', 'tel', 'url', 'email'])

/** Rewrites Arabic digits in a text field as English ones. Returns true if anything changed. */
function fix(target: EventTarget | null): boolean {
  const isArea = target instanceof HTMLTextAreaElement
  if (!isArea && !(target instanceof HTMLInputElement && WRITTEN_TYPES.has(target.type))) return false
  const field = target as HTMLInputElement | HTMLTextAreaElement
  const fixed = latinDigits(field.value)
  if (fixed === field.value) return false

  const { selectionStart: start, selectionEnd: end } = field
  // Through the browser's own setter, so React still sees this as a change and hands the form the fixed text
  const prototype = isArea ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(field, fixed)
  if (start !== null) field.setSelectionRange(start, end)
  return true
}

/** Makes every text field on the site write English digits, however they were typed. */
export default function LatinDigits() {
  useEffect(() => {
    const onInput = (event: Event) => {
      if (!(event as InputEvent).isComposing) fix(event.target)
    }
    const onCompositionEnd = (event: Event) => {
      if (fix(event.target)) event.target!.dispatchEvent(new Event('input', { bubbles: true }))
    }
    window.addEventListener('input', onInput, true)
    window.addEventListener('compositionend', onCompositionEnd, true)
    return () => {
      window.removeEventListener('input', onInput, true)
      window.removeEventListener('compositionend', onCompositionEnd, true)
    }
  }, [])
  return null
}
