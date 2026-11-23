import { describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

import { monthSummary } from './rent'
import type { Payment, Tenant } from './types'

const tenant = (id: string, unitId: string, rent: number, moveIn: string | null, moveOut: string | null = null): Tenant => ({
  id, unit_id: unitId, name: id, phone: null, aadhaar_number: null, permanent_address: null,
  move_in_date: moveIn, move_out_date: moveOut, rent_amount: rent, deposit: null, rent_due_day: null, emergency_contact: null, notes: null,
})
const pay = (tenantId: string, month: string, amount: number): Payment => ({
  id: `p-${tenantId}-${month}`, tenant_id: tenantId, month, amount, paid_on: month, method: 'Cash', note: null,
})

const tenants = [
  tenant('ravi', 'u1', 15000, '2025-04-01'),
  tenant('priya', 'u2', 11000, '2026-01-10', '2026-10-15'), // left in October
  tenant('arjun', 'u10', 9000, '2026-12-05'), // moves in December
]
const payments = [pay('ravi', '2026-11-01', 15000), pay('priya', '2026-10-01', 11000)]

describe('monthSummary', () => {
  it('counts a tenant as owing rent in the month they leave, not the month after', () => {
    expect(monthSummary(tenants, payments, '2026-10-01').due.map((t) => t.id)).toEqual(['ravi', 'priya'])
    expect(monthSummary(tenants, payments, '2026-11-01').due.map((t) => t.id)).toEqual(['ravi'])
  })

  it('sums what is expected and collected from the tenants who owe rent', () => {
    const s = monthSummary(tenants, [...payments, pay('ravi', '2026-12-01', 10000)], '2026-12-01')
    expect(s.due.map((t) => t.id)).toEqual(['ravi', 'arjun'])
    expect(s.expected).toBe(24000)
    expect(s.collected).toBe(10000)
    expect(s.stillToCollect).toBe(14000)
    expect(s.paidCount).toBe(1)
  })
})
