'use client'

import { useState } from 'react'

const pad = (value: number) => String(value).padStart(2, '0')
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index)
const YEARS_BACK = 3

/**
 * Every date on the site, as lists of day, month and year.
 * A browser's own date box writes its digits in the browser's language. The value is "YYYY-MM-DD", or empty until it's complete.
 */
export default function DateInput({ value, onChange, className = '' }: { value: string; onChange: (value: string) => void; className?: string }) {
  const [unfinished, setUnfinished] = useState({ year: '', month: '', day: '' })
  const [savedYear = '', savedMonth = '', savedDay = ''] = value ? value.split('-') : []
  const parts = value ? { year: savedYear, month: savedMonth, day: savedDay } : unfinished

  const thisYear = new Date().getFullYear()
  const lastDay = parts.year && parts.month ? new Date(Number(parts.year), Number(parts.month), 0).getDate() : 31

  const change = (next: typeof parts) => {
    const fixed = next.day && Number(next.day) > (next.year && next.month ? new Date(Number(next.year), Number(next.month), 0).getDate() : 31) ? { ...next, day: '' } : next
    setUnfinished(fixed)
    onChange(fixed.year && fixed.month && fixed.day ? `${fixed.year}-${fixed.month}-${fixed.day}` : '')
  }

  const list = (label: string, current: string, options: string[], update: (option: string) => void) => (
    <select aria-label={label} value={current} onChange={event => update(event.target.value)} className={className}>
      <option value="">--</option>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  )

  return (
    <div dir="ltr" className="flex items-center gap-1">
      {list('اليوم', parts.day, range(1, lastDay).map(pad), day => change({ ...parts, day }))}
      {list('الشهر', parts.month, range(1, 12).map(pad), month => change({ ...parts, month }))}
      {list('السنة', parts.year, range(thisYear - YEARS_BACK, thisYear).map(String), year => change({ ...parts, year }))}
    </div>
  )
}
