// Plain rent logic, no React. Covered by rent.test.ts.
import type { Payment, Tenant } from './types'
import { owesRentFor } from './format'

export type MonthSummary = {
  due: Tenant[]
  paidCount: number
  expected: number
  collected: number
  stillToCollect: number
}

export function monthSummary(tenants: Tenant[], payments: Payment[], month: string): MonthSummary {
  const due = tenants.filter((t) => owesRentFor(t, month))
  const byTenant = new Map(payments.filter((p) => p.month === month).map((p) => [p.tenant_id, p]))
  const paidCount = due.filter((t) => byTenant.has(t.id)).length
  const expected = due.reduce((sum, t) => sum + Number(t.rent_amount), 0)
  const collected = due.reduce((sum, t) => sum + Number(byTenant.get(t.id)?.amount ?? 0), 0)
  return { due, paidCount, expected, collected, stillToCollect: Math.max(0, expected - collected) }
}
