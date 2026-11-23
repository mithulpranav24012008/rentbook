// Plain rent logic: no React, no Three.js. Covered by rent.test.ts.
import type { Building, Payment, Tenant, Unit } from './types'
import { owesRentFor } from './format'

export type WindowState = 'paid' | 'due' | 'vacant'

export type BuildingWindows = {
  building: Building
  /** One entry per house, in house-number order. */
  windows: { unit: Unit; state: WindowState; tenant?: Tenant }[]
  columns: number
  floors: number
}

export type MonthSummary = {
  due: Tenant[]
  paidCount: number
  expected: number
  collected: number
  stillToCollect: number
}

const byLabel = (a: Unit, b: Unit) => a.label.localeCompare(b.label, 'en', { numeric: true })

/** How many windows across a building's front: 2 for small blocks, up to 4 for big ones. */
export function columnsFor(houses: number) {
  if (houses <= 2) return Math.max(houses, 1)
  if (houses <= 6) return 2
  if (houses <= 12) return 3
  return 4
}

/** Each house becomes a window: lit when its tenant paid this month, dark when due, grey when empty. */
export function buildingWindows(
  buildings: Building[],
  units: Unit[],
  tenants: Tenant[],
  payments: Payment[],
  month: string,
): BuildingWindows[] {
  const paid = new Set(payments.filter((p) => p.month === month).map((p) => p.tenant_id))
  return buildings.map((building) => {
    const houses = units.filter((u) => u.building_id === building.id).sort(byLabel)
    const windows = houses.map((unit) => {
      const tenant = tenants.find((t) => t.unit_id === unit.id && owesRentFor(t, month))
      const state: WindowState = !tenant ? 'vacant' : paid.has(tenant.id) ? 'paid' : 'due'
      return { unit, state, tenant }
    })
    const columns = columnsFor(windows.length)
    return { building, windows, columns, floors: Math.max(1, Math.ceil(windows.length / columns)) }
  })
}

export function monthSummary(tenants: Tenant[], payments: Payment[], month: string): MonthSummary {
  const due = tenants.filter((t) => owesRentFor(t, month))
  const byTenant = new Map(payments.filter((p) => p.month === month).map((p) => [p.tenant_id, p]))
  const paidCount = due.filter((t) => byTenant.has(t.id)).length
  const expected = due.reduce((sum, t) => sum + Number(t.rent_amount), 0)
  const collected = due.reduce((sum, t) => sum + Number(byTenant.get(t.id)?.amount ?? 0), 0)
  return { due, paidCount, expected, collected, stillToCollect: Math.max(0, expected - collected) }
}
