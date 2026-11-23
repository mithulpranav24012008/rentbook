import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Payment, Tenant } from '../lib/types'
import type { Store } from '../lib/data'
import { buildingWindows, monthSummary } from '../lib/rent'
import {
  PAYMENT_METHODS,
  currentMonth,
  dateLabel,
  formatMoney,
  linkTarget,
  monthLabel,
  shiftMonth,
  today,
  whatsappLink,
} from '../lib/format'
import { Empty, ErrorNote, Field, Sheet } from '../components/ui'
import { BuildingView } from '../components/BuildingView'
import { houseName } from './TenantsPage'

type Filter = 'unpaid' | 'paid' | 'all'

const shortMonth = (m: string) => new Date(m + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long' })

export function RentPage({ store, goTo }: { store: Store; goTo: (tab: 'tenants' | 'buildings') => void }) {
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
  const summary = useMemo(() => monthSummary(store.tenants, payments, month), [store.tenants, payments, month])
  const windows = useMemo(
    () => buildingWindows(store.buildings, store.units, store.tenants, payments, month),
    [store.buildings, store.units, store.tenants, payments, month],
  )
  const unpaidCount = summary.due.length - summary.paidCount
  const partCount = summary.due.filter((t) => {
    const p = byTenant.get(t.id)
    return p && Number(p.amount) < Number(t.rent_amount)
  }).length
  const progress = summary.expected > 0 ? Math.min(100, Math.round((summary.collected / summary.expected) * 100)) : 0

  // Not paid first, then paid; each group in house order.
  const rows = summary.due
    .filter((t) => filter === 'all' || (filter === 'paid' ? byTenant.has(t.id) : !byTenant.has(t.id)))
    .sort((a, b) => Number(byTenant.has(a.id)) - Number(byTenant.has(b.id)) || houseName(store, a.unit_id).localeCompare(houseName(store, b.unit_id), 'en', { numeric: true }))

  async function toggle(t: Tenant) {
    const existing = byTenant.get(t.id)
    setError(null)
    if (existing) {
      if (!confirm(`${t.name} will be marked as NOT paid for ${monthLabel(month)}. Continue?`)) return
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

  const answer =
    summary.due.length === 0
      ? 'No tenants owe rent for this month.'
      : unpaidCount === 0 && partCount > 0
        ? `Everyone has paid, but ${partCount} only part. ${formatMoney(summary.stillToCollect)} still to collect.`
        : unpaidCount === 0
          ? `Everyone has paid. ${formatMoney(summary.collected)} collected.`
        : `${summary.paidCount} of ${summary.due.length} have paid${partCount ? ` (${partCount} only part paid)` : ''}. ${unpaidCount} still to pay.`

  return (
    <section className="page" aria-labelledby="rent-title">
      <div className="month-switch">
        <button className="btn prev" onClick={() => setMonth(shiftMonth(month, -1))}>
          ‹ {shortMonth(shiftMonth(month, -1))}
        </button>
        <h1 id="rent-title">{monthLabel(month)}</h1>
        <button className="btn next" onClick={() => setMonth(shiftMonth(month, 1))}>
          {shortMonth(shiftMonth(month, 1))} ›
        </button>
      </div>
      {month !== currentMonth() && (
        <button className="textbtn" onClick={() => setMonth(currentMonth())}>
          Go back to this month
        </button>
      )}

      {store.tenants.length === 0 ? (
        <Empty title="No tenants yet">
          <p>First add your apartment and its houses, then your tenants. Then you can tick them off here each month.</p>
          <button className="btn primary big" onClick={() => goTo(store.units.length ? 'tenants' : 'buildings')}>
            {store.units.length ? 'Add a tenant' : 'Add your apartment'}
          </button>
        </Empty>
      ) : (
        <>
          <div className="panel answer">
            <p className="answer-line">{answer}</p>
            <div className="answer-figures">
              <div className="figure data">
                <span className="label">Collected</span>
                <strong>{formatMoney(summary.collected)}</strong>
              </div>
              <div className="figure">
                <span className="label">Still to collect</span>
                <strong>{formatMoney(summary.stillToCollect)}</strong>
              </div>
            </div>
            <div className="meter" role="progressbar" aria-label="Rent collected" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${progress}%` }} />
            </div>
            <p className="label">
              {formatMoney(summary.collected)} of {formatMoney(summary.expected)} expected this month
            </p>
          </div>

          {windows.some((w) => w.windows.length > 0) && (
            <BuildingView
              data={windows}
              label={`Your apartment${windows.length > 1 ? 's' : ''}: ${summary.paidCount} houses paid, ${unpaidCount} not paid.`}
            />
          )}

          <h2>Tenants this month</h2>
          <div className="filter" role="group" aria-label="Show">
            {(['all', 'unpaid', 'paid'] as Filter[]).map((f) => (
              <button key={f} aria-pressed={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                {f === 'all' ? `All (${summary.due.length})` : f === 'unpaid' ? `Not paid (${unpaidCount})` : `Paid (${summary.paidCount})`}
              </button>
            ))}
          </div>

          <ErrorNote message={error} />

          {rows.length === 0 ? (
            <Empty title={filter === 'unpaid' ? 'Everyone has paid this month' : 'No one to show here'} />
          ) : (
            <ul className="register">
              {rows.map((t) => {
                const p = byTenant.get(t.id)
                const partial = p && Number(p.amount) < Number(t.rent_amount)
                return (
                  <li key={t.id} className={p ? 'reg-row paid' : 'reg-row'}>
                    <button className="reg-who" onClick={() => setEditing({ tenant: t, payment: p })}>
                      <span className="name">{t.name}</span>
                      <span className="where">{houseName(store, t.unit_id)}</span>
                    </button>
                    <span className="reg-amount">{formatMoney(t.rent_amount)}</span>
                    <div className="status">
                      {p ? (
                        <span className={partial ? 'tag part' : 'tag ok'}>
                          {partial ? `Part paid: ${formatMoney(p.amount)}` : 'Paid'} on {dateLabel(p.paid_on)}
                          {p.method ? ` · ${p.method}` : ''}
                        </span>
                      ) : (
                        <span className="tag due">Not paid{t.rent_due_day ? ` · due on the ${ordinal(t.rent_due_day)}` : ''}</span>
                      )}
                    </div>
                    <div className="reg-actions">
                      <button
                        className={p ? 'btn paid-toggle is-paid' : 'btn primary paid-toggle'}
                        disabled={busy === t.id}
                        aria-pressed={Boolean(p)}
                        onClick={() => toggle(t)}
                      >
                        {busy === t.id ? 'Saving…' : p ? 'Paid. Press to undo' : 'Mark as paid'}
                      </button>
                      {!p && t.phone ? (
                        <a
                          className="btn"
                          href={whatsappLink(
                            t.phone,
                            `Hi ${t.name}, a friendly reminder that rent of ${formatMoney(t.rent_amount)} for ${monthLabel(month)} is due. Thank you!`,
                          )}
                          target={linkTarget}
                          rel="noreferrer"
                        >
                          Remind on WhatsApp
                        </a>
                      ) : (
                        <button className="btn" onClick={() => setEditing({ tenant: t, payment: p })}>
                          {p ? 'Change amount or date' : 'Enter amount and date'}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
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
    if (!payment || !confirm(`${tenant.name} will be marked as NOT paid for ${monthLabel(month)}. Continue?`)) return
    setBusy(true)
    const { error } = await supabase.from('payments').delete().eq('id', payment.id)
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <Sheet
      title={`${tenant.name}: ${monthLabel(month)}`}
      onClose={onClose}
      footer={
        <>
          {payment && (
            <button className="btn danger" onClick={remove} disabled={busy}>
              Mark as not paid
            </button>
          )}
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : payment ? 'Save' : 'Save as paid'}
          </button>
        </>
      }
    >
      <p className="label" style={{ marginBottom: '1.25rem' }}>
        Monthly rent: <strong className="num">{formatMoney(tenant.rent_amount)}</strong>
      </p>
      <div className="grid">
        <Field label="Amount paid (₹)">
          <input inputMode="decimal" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Date paid">
          <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </Field>
        <Field label="Paid by" wide>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Note (optional)" wide>
          <input value={note} placeholder="For example: UPI number, balance next week" onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <ErrorNote message={error} />
    </Sheet>
  )
}
