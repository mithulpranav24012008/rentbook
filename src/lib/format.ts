import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export const formatMoney = (n: number | null | undefined) => money.format(Number(n ?? 0))

const pad = (n: number) => String(n).padStart(2, '0') // taste-skill-ignore: dates

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** First day of the current month, e.g. "2026-11-01". */
export const currentMonth = () => today().slice(0, 8) + '01' // taste-skill-ignore: dates

export const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
}

/** Last possible day string for comparisons, e.g. "2026-11-31". */
export const monthEnd = (month: string) => month.slice(0, 8) + '31'

export const monthLabel = (month: string) =>
  new Date(month + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

export const dateLabel = (date: string | null) =>
  date ? new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

/** Empty string → null, otherwise a number. */
export const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v))
export const strOrNull = (v: string) => (v.trim() === '' ? null : v.trim())

/** WhatsApp link with a 91 country code added to 10-digit Indian numbers. */
export const whatsappLink = (phone: string, text: string) => {
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 10) digits = '91' + digits
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export const linkTarget = isNative ? undefined : '_blank'

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank transfer', 'Cheque', 'Other']

type Dated = { move_in_date: string | null; move_out_date: string | null }

/** Still living there today (no leaving date, or it is in the future). */
export const isCurrent = (t: Dated) => !t.move_out_date || t.move_out_date >= today()

/** Owes rent for this month: moved in by the month's end and not left before it started. */
export const owesRentFor = (t: Dated, month: string) =>
  (!t.move_in_date || t.move_in_date <= monthEnd(month)) && (!t.move_out_date || t.move_out_date >= month)

/** Aadhaar shown as 1234 5678 9012. */
export const formatAadhaar = (v: string | null) => (v ? v.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') : '')
