import { describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

import { buildingWindows, columnsFor, monthSummary } from './rent'
import type { Building, Payment, Tenant, Unit } from './types'

const building: Building = { id: 'b1', name: 'Lakshmi Apartments', address: null, electrician_phone: null, eb_lineman_phone: null, notes: null }
const unit = (id: string, label: string): Unit => ({
  id, building_id: 'b1', label, unit_type: null, floor: null, eb_number: null, key_number: null, rent_amount: null, deposit: null, notes: null,
})
const tenant = (id: string, unitId: string, rent: number, moveIn: string | null, moveOut: string | null = null): Tenant => ({
  id, unit_id: unitId, name: id, phone: null, aadhaar_number: null, permanent_address: null,
  move_in_date: moveIn, move_out_date: moveOut, rent_amount: rent, deposit: null, rent_due_day: null, emergency_contact: null, notes: null,
})
const pay = (tenantId: string, month: string, amount: number): Payment => ({
  id: `p-${tenantId}-${month}`, tenant_id: tenantId, month, amount, paid_on: month, method: 'Cash', note: null,
})

const units = [unit('u10', '10'), unit('u2', '2'), unit('u1', '1')]
const tenants = [
  tenant('ravi', 'u1', 15000, '2025-04-01'),
  tenant('priya', 'u2', 11000, '2026-01-10', '2026-10-15'), // left in October
  tenant('arjun', 'u10', 9000, '2026-12-05'), // moves in December
]
const payments = [pay('ravi', '2026-11-01', 15000), pay('priya', '2026-10-01', 11000)]

describe('buildingWindows', () => {
  it('orders houses by number and lights only paid ones', () => {
    const [b] = buildingWindows([building], units, tenants, payments, '2026-11-01')
    expect(b.windows.map((w) => w.unit.label)).toEqual(['1', '2', '10'])
    expect(b.windows.map((w) => w.state)).toEqual(['paid', 'vacant', 'vacant'])
  })

  it('treats a tenant as due in the month they leave and the month they arrive', () => {
    const [oct] = buildingWindows([building], units, tenants, payments, '2026-10-01')
    expect(oct.windows.find((w) => w.unit.id === 'u2')?.state).toBe('paid')
    const [dec] = buildingWindows([building], units, tenants, payments, '2026-12-01')
    expect(dec.windows.find((w) => w.unit.id === 'u10')?.state).toBe('due')
  })

  it('stacks windows into floors', () => {
    const [b] = buildingWindows([building], units, tenants, payments, '2026-11-01')
    expect(b.columns).toBe(2)
    expect(b.floors).toBe(2)
  })
})

describe('columnsFor', () => {
  it('keeps small blocks narrow and big blocks wide', () => {
    expect([1, 2, 3, 6, 7, 12, 20].map(columnsFor)).toEqual([1, 2, 2, 2, 3, 3, 4])
  })
})

describe('monthSummary', () => {
  it('sums what is expected and collected from the tenants who owe rent', () => {
    const s = monthSummary(tenants, [...payments, pay('ravi', '2026-12-01', 10000)], '2026-12-01')
    expect(s.due.map((t) => t.id)).toEqual(['ravi', 'arjun'])
    expect(s.expected).toBe(24000)
    expect(s.collected).toBe(10000)
    expect(s.stillToCollect).toBe(14000)
    expect(s.paidCount).toBe(1)
  })
})
