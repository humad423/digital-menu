'use client'

const pad = (value: number) => String(value).padStart(2, '0')
const HOURS = Array.from({ length: 24 }, (_, hour) => pad(hour))
const MINUTES = Array.from({ length: 12 }, (_, step) => pad(step * 5))

const hourLabel = (hour: string) => `${pad(Number(hour) % 12 || 12)} ${Number(hour) < 12 ? 'ص' : 'م'}`

/**
 * Every time on the site, as a list of hours and minutes.
 * A browser's own time box writes its digits in the browser's language. The value is always "HH:MM".
 */
export default function TimeInput({
  id,
  value,
  onChange,
  className = 'field',
  allowEmpty = false,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  className?: string
  /** Offers a blank choice, for a time that can be left out. */
  allowEmpty?: boolean
}) {
  const [hour = '', minute = ''] = /^\d{1,2}:\d{2}/.test(value) ? value.split(':') : []
  const paddedHour = hour && hour.padStart(2, '0')
  const minutes = minute && !MINUTES.includes(minute) ? [...MINUTES, minute].sort() : MINUTES
  const box = `${className} min-w-0 flex-1 !px-2 text-center`

  return (
    <div dir="ltr" className="flex items-center gap-1">
      <select
        id={id}
        aria-label="الساعة"
        value={paddedHour}
        onChange={event => onChange(event.target.value ? `${event.target.value}:${minute || '00'}` : '')}
        className={box}
      >
        {(allowEmpty || !paddedHour) && <option value="">--</option>}
        {HOURS.map(option => <option key={option} value={option}>{hourLabel(option)}</option>)}
      </select>
      <span aria-hidden="true" className="font-black">:</span>
      <select
        aria-label="الدقيقة"
        value={minute}
        disabled={!paddedHour}
        onChange={event => onChange(`${paddedHour}:${event.target.value}`)}
        className={box}
      >
        {!minute && <option value="">--</option>}
        {minutes.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  )
}
