import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Payment, Tenant } from '../lib/types'
import type { Store } from '../lib/data'
import {
  PAYMENT_METHODS,
  currentMonth,
  dateLabel,
  formatMoney,
  linkTarget,
  monthLabel,
  owesRentFor,
  shiftMonth,
  today,
  whatsappLink,
} from '../lib/format'
import { Empty, ErrorNote, Field, Sheet } from '../components/ui'
import { houseName } from './TenantsPage'

type Filter = 'all' | 'unpaid' | 'paid'

export function RentPage({ store, goTo }: { store: Store; goTo: (tab: 'tenants') => void }) {
  const [month, setMonth] = useState(currentMonth())
  const [payments, setPayments] = useState<Payment[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ tenant: Tenant; payment?: Payment } | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('payments').select('*').eq('month', month)
    if (error) setError(error.message)
    else setPayments(data ?? [])
  }, [month])

  useEffect(() => {
    void load()
  }, [load])

  const byTenant = useMemo(() => new Map(payments.map((p) => [p.tenant_id, p])), [payments])

  const unitName = (t: Tenant) => houseName(store, t.unit_id)

  // Tenants who owe rent this month, based on their occupying and leaving dates.
  const due = store.tenants.filter((t) => owesRentFor(t, month))
  const paidCount = due.filter((t) => byTenant.has(t.id)).length
  const expected = due.reduce((sum, t) => sum + Number(t.rent_amount), 0)
  const collected = due.reduce((sum, t) => sum + Number(byTenant.get(t.id)?.amount ?? 0), 0)
  const progress = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0

  const rows = due.filter((t) => {
    const paid = byTenant.has(t.id)
    return filter === 'all' || (filter === 'paid' ? paid : !paid)
  })

  async function toggle(t: Tenant) {
    const existing = byTenant.get(t.id)
    setError(null)
    if (existing) {
      if (!confirm(`Mark ${t.name} as unpaid for ${monthLabel(month)}?`)) return
      setBusy(t.id)
      const { error } = await supabase.from('payments').delete().eq('id', existing.id)
      if (error) setError(error.message)
      else setPayments((ps) => ps.filter((p) => p.id !== existing.id))
    } else {
      setBusy(t.id)
      const { data, error } = await supabase
        .from('payments')
        .insert({ tenant_id: t.id, month, amount: t.rent_amount, paid_on: today(), method: 'Cash' })
        .select()
        .single()
      if (error) setError(error.message)
      else setPayments((ps) => [...ps, data])
    }
    setBusy(null)
  }

  const isCurrent = month === currentMonth()

  return (
    <section className="page">
      <div className="month-bar">
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
          ‹
        </button>
        <div className="month-title">
          <h1>{monthLabel(month)}</h1>
          {!isCurrent && (
            <button className="link small" onClick={() => setMonth(currentMonth())}>
              Back to this month
            </button>
          )}
        </div>
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="summary">
        <div>
          <span className="summary-label">Collected</span>
          <strong className="summary-value">{formatMoney(collected)}</strong>
          <span className="muted small">of {formatMoney(expected)}</span>
        </div>
        <div className="summary-right">
          <span className="summary-label">Paid</span>
          <strong className="summary-value">
            {paidCount}/{due.length}
          </strong>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="segmented" role="tablist" aria-label="Filter tenants">
        {(['all', 'unpaid', 'paid'] as Filter[]).map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
            {f === 'all' ? `All ${due.length}` : f === 'unpaid' ? `Unpaid ${due.length - paidCount}` : `Paid ${paidCount}`}
          </button>
        ))}
      </div>

      <ErrorNote message={error} />

      {store.tenants.length === 0 ? (
        <Empty title="No tenants yet">
          <p>Add your apartment, its houses and your tenants, then tick them off here each month.</p>
          <button className="btn primary" onClick={() => goTo('tenants')}>
            Add a tenant
          </button>
        </Empty>
      ) : rows.length === 0 ? (
        <Empty title={filter === 'unpaid' ? 'Everyone has paid 🎉' : 'Nothing to show'} />
      ) : (
        <ul className="list">
          {rows.map((t) => {
            const p = byTenant.get(t.id)
            const partial = p && Number(p.amount) < Number(t.rent_amount)
            return (
              <li key={t.id} className={p ? 'rent-row paid' : 'rent-row'}>
                <button
                  className="check"
                  role="checkbox"
                  aria-checked={Boolean(p)}
                  aria-label={`${t.name} paid`}
                  disabled={busy === t.id}
                  onClick={() => toggle(t)}
                >
                  {p ? '✓' : ''}
                </button>
                <button className="rent-main" onClick={() => setEditing({ tenant: t, payment: p })}>
                  <span className="rent-name">{t.name}</span>
                  <span className="muted small">{unitName(t)}</span>
                  <span className="small">
                    {p ? (
                      <span className={partial ? 'tag warn' : 'tag ok'}>
                        {partial ? 'Part paid' : 'Paid'} {formatMoney(p.amount)} · {p.method ?? '—'} · {dateLabel(p.paid_on)}
                      </span>
                    ) : (
                      <span className="tag due">
                        Due {formatMoney(t.rent_amount)}
                        {t.rent_due_day ? ` by the ${ordinal(t.rent_due_day)}` : ''}
                      </span>
                    )}
                  </span>
                </button>
                {!p && t.phone && (
                  <a
                    className="remind"
                    href={whatsappLink(
                      t.phone,
                      `Hi ${t.name}, a friendly reminder that rent of ${formatMoney(t.rent_amount)} for ${monthLabel(month)} is due. Thank you!`,
                    )}
                    target={linkTarget}
                    rel="noreferrer"
                  >
                    Remind
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <PaymentSheet
          month={month}
          tenant={editing.tenant}
          payment={editing.payment}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void load()
          }}
        />
      )}
    </section>
  )
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function PaymentSheet({
  month,
  tenant,
  payment,
  onClose,
  onSaved,
}: {
  month: string
  tenant: Tenant
  payment?: Payment
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState(String(payment?.amount ?? tenant.rent_amount))
  const [paidOn, setPaidOn] = useState(payment?.paid_on ?? today())
  const [method, setMethod] = useState(payment?.method ?? 'Cash')
  const [note, setNote] = useState(payment?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    const row = { tenant_id: tenant.id, month, amount: Number(amount || 0), paid_on: paidOn, method, note: note.trim() || null }
    const { error } = payment
      ? await supabase.from('payments').update(row).eq('id', payment.id)
      : await supabase.from('payments').insert(row)
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  async function remove() {
    if (!payment || !confirm('Remove this payment?')) return
    setBusy(true)
    const { error } = await supabase.from('payments').delete().eq('id', payment.id)
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <Sheet
      title={`${tenant.name} · ${monthLabel(month)}`}
      onClose={onClose}
      footer={
        <>
          {payment && (
            <button className="btn danger" onClick={remove} disabled={busy}>
              Mark unpaid
            </button>
          )}
          <button className="btn primary" onClick={save} disabled={busy}>
            {payment ? 'Save' : 'Mark as paid'}
          </button>
        </>
      }
    >
      <div className="grid">
        <Field label="Amount paid (₹)">
          <input inputMode="decimal" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Paid on">
          <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </Field>
        <Field label="Method" wide>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Note" wide>
          <input value={note} placeholder="e.g. UPI ref, balance next week" onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <p className="muted small">Monthly rent: {formatMoney(tenant.rent_amount)}</p>
      <ErrorNote message={error} />
    </Sheet>
  )
}
