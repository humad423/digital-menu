'use client'

import { COUNTRY_CODES, joinPhone, splitPhone } from '@/utils/phone'

/** A phone number with its country code picked from a list, so nobody has to type the +. */
export default function PhoneInput({
  id,
  value,
  onChange,
  required = false,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  const { code, local } = splitPhone(value)
  const codes = COUNTRY_CODES.some(country => country.code === code)
    ? COUNTRY_CODES
    : [...COUNTRY_CODES, { code, name: 'أخرى' }]

  return (
    <div className="flex gap-2" dir="ltr">
      <select
        aria-label="رمز الدولة"
        value={code}
        onChange={event => onChange(joinPhone(event.target.value, local))}
        className="f-input !w-auto shrink-0"
      >
        {codes.map(country => (
          <option key={country.code} value={country.code}>{country.code} {country.name}</option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        required={required}
        placeholder="000 000 0000"
        value={local}
        onChange={event => onChange(joinPhone(code, event.target.value))}
        className="f-input min-w-0 flex-1 text-left"
      />
    </div>
  )
}
