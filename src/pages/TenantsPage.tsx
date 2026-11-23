import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Payment, Tenant } from '../lib/types'
import { deleteRow, saveRow, type Store } from '../lib/data'
import { dateLabel, formatMoney, linkTarget, monthLabel, numOrNull, strOrNull, today, whatsappLink } from '../lib/format'
import { Empty, ErrorNote, Field, Sheet } from '../components/ui'

export function TenantsPage({ store }: { store: Store }) {
  const [query, setQuery] = useState('')
  const [showPast, setShowPast] = useState(false)
  const [editing, setEditing] = useState<Tenant | 'new' | null>(null)

  const unitName = (t: Tenant) => {
    const unit = store.units.find((u) => u.id === t.unit_id)
    if (!unit) return 'No unit assigned'
    const building = store.buildings.find((b) => b.id === unit.building_id)
    return building ? `${unit.label} · ${building.name}` : unit.label
  }

  const q = query.trim().toLowerCase()
  const list = store.tenants.filter(
    (t) =>
      (showPast || t.active) &&
      (!q || t.name.toLowerCase().includes(q) || (t.phone ?? '').includes(q) || unitName(t).toLowerCase().includes(q)),
  )
  const pastCount = store.tenants.filter((t) => !t.active).length

  return (
    <section className="page">
      <div className="page-head">
        <h1>Tenants</h1>
        <button className="btn primary" onClick={() => setEditing('new')}>
          + Add tenant
        </button>
      </div>

      {store.tenants.length > 0 && (
        <input
          className="search"
          type="search"
          placeholder="Search name, phone or flat"
          aria-label="Search tenants"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {store.tenants.length === 0 ? (
        <Empty title="No tenants yet">
          <p>Add each tenant with their phone, ID proof, rent and the flat they live in.</p>
        </Empty>
      ) : list.length === 0 ? (
        <Empty title="No matches" />
      ) : (
        <ul className="list">
          {list.map((t) => (
            <li key={t.id}>
              <button className="card-row" onClick={() => setEditing(t)}>
                <span className="avatar" aria-hidden="true">
                  {t.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="card-main">
                  <span className="rent-name">
                    {t.name} {!t.active && <span className="tag">Moved out</span>}
                  </span>
                  <span className="muted small">{unitName(t)}</span>
                  {t.phone && <span className="muted small">{t.phone}</span>}
                </span>
                <span className="card-amount">{formatMoney(t.rent_amount)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pastCount > 0 && (
        <label className="toggle">
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
          Show {pastCount} moved-out tenant{pastCount === 1 ? '' : 's'}
        </label>
      )}

      {editing && (
        <TenantSheet
          store={store}
          tenant={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void store.reload()
          }}
        />
      )}
    </section>
  )
}

function TenantSheet({
  store,
  tenant,
  onClose,
  onSaved,
}: {
  store: Store
  tenant?: Tenant
  onClose: () => void
  onSaved: () => void
}) {
  const s = (v: string | number | null | undefined) => (v == null ? '' : String(v))
  const [f, setF] = useState({
    name: s(tenant?.name),
    phone: s(tenant?.phone),
    email: s(tenant?.email),
    unit_id: s(tenant?.unit_id),
    move_in_date: s(tenant?.move_in_date) || (tenant ? '' : today()),
    rent_amount: s(tenant?.rent_amount),
    deposit: s(tenant?.deposit),
    rent_due_day: s(tenant?.rent_due_day),
    id_proof_type: s(tenant?.id_proof_type) || 'Aadhaar',
    id_proof_number: s(tenant?.id_proof_number),
    emergency_contact: s(tenant?.emergency_contact),
    notes: s(tenant?.notes),
    active: tenant?.active ?? true,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Payment[] | null>(null)

  useEffect(() => {
    if (!tenant) return
    supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('month', { ascending: false })
      .limit(12)
      .then(({ data }) => setHistory(data ?? []))
  }, [tenant])

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  function pickUnit(unitId: string) {
    const unit = store.units.find((u) => u.id === unitId)
    setF({
      ...f,
      unit_id: unitId,
      rent_amount: f.rent_amount || s(unit?.rent_amount),
      deposit: f.deposit || s(unit?.deposit),
    })
  }

  async function save() {
    if (!f.name.trim()) return setError('Please enter the tenant’s name.')
    setBusy(true)
    const err = await saveRow(
      'tenants',
      {
        name: f.name.trim(),
        phone: strOrNull(f.phone),
        email: strOrNull(f.email),
        unit_id: f.unit_id || null,
        move_in_date: f.move_in_date || null,
        rent_amount: numOrNull(f.rent_amount) ?? 0,
        deposit: numOrNull(f.deposit),
        rent_due_day: numOrNull(f.rent_due_day),
        id_proof_type: strOrNull(f.id_proof_type),
        id_proof_number: strOrNull(f.id_proof_number),
        emergency_contact: strOrNull(f.emergency_contact),
        notes: strOrNull(f.notes),
        active: f.active,
      },
      tenant?.id,
    )
    setBusy(false)
    if (err) setError(err)
    else onSaved()
  }

  async function remove() {
    if (!tenant || !confirm(`Delete ${tenant.name} and all their payment records? This can't be undone.`)) return
    setBusy(true)
    const err = await deleteRow('tenants', tenant.id)
    setBusy(false)
    if (err) setError(err)
    else onSaved()
  }

  return (
    <Sheet
      title={tenant ? tenant.name : 'New tenant'}
      onClose={onClose}
      footer={
        <>
          {tenant && (
            <button className="btn danger" onClick={remove} disabled={busy}>
              Delete
            </button>
          )}
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {tenant?.phone && (
        <div className="quick-actions">
          <a className="btn" href={`tel:${tenant.phone}`}>
            Call
          </a>
          <a className="btn" href={whatsappLink(tenant.phone, `Hi ${tenant.name}, `)} target={linkTarget} rel="noreferrer">
            WhatsApp
          </a>
        </div>
      )}

      <h3 className="section-title">Personal details</h3>
      <div className="grid">
        <Field label="Full name *" wide>
          <input value={f.name} onChange={set('name')} autoComplete="off" />
        </Field>
        <Field label="Phone">
          <input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} />
        </Field>
        <Field label="Email">
          <input type="email" value={f.email} onChange={set('email')} />
        </Field>
        <Field label="ID proof">
          <select value={f.id_proof_type} onChange={set('id_proof_type')}>
            {['Aadhaar', 'PAN', 'Passport', 'Driving licence', 'Voter ID', 'Other'].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field label="ID number">
          <input value={f.id_proof_number} onChange={set('id_proof_number')} />
        </Field>
        <Field label="Emergency contact" wide>
          <input value={f.emergency_contact} placeholder="Name and phone" onChange={set('emergency_contact')} />
        </Field>
      </div>

      <h3 className="section-title">Tenancy</h3>
      <div className="grid">
        <Field label="Flat / unit" wide>
          <select value={f.unit_id} onChange={(e) => pickUnit(e.target.value)}>
            <option value="">— Not assigned —</option>
            {store.buildings.map((b) => (
              <optgroup key={b.id} label={b.name}>
                {store.units
                  .filter((u) => u.building_id === b.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                      {u.unit_type ? ` (${u.unit_type})` : ''}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
        {store.units.length === 0 && (
          <p className="muted small wide">Add a building and its flats in the Buildings tab to assign one here.</p>
        )}
        <Field label="Monthly rent (₹)">
          <input type="number" inputMode="decimal" min="0" value={f.rent_amount} onChange={set('rent_amount')} />
        </Field>
        <Field label="Deposit (₹)">
          <input type="number" inputMode="decimal" min="0" value={f.deposit} onChange={set('deposit')} />
        </Field>
        <Field label="Move-in date">
          <input type="date" value={f.move_in_date} onChange={set('move_in_date')} />
        </Field>
        <Field label="Rent due day">
          <input type="number" inputMode="numeric" min="1" max="31" placeholder="e.g. 5" value={f.rent_due_day} onChange={set('rent_due_day')} />
        </Field>
        <Field label="Notes" wide>
          <textarea rows={3} value={f.notes} onChange={set('notes')} />
        </Field>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={!f.active} onChange={(e) => setF({ ...f, active: !e.target.checked })} />
        Moved out (stops showing in the rent checklist)
      </label>

      {tenant && (
        <>
          <h3 className="section-title">Recent payments</h3>
          {history === null ? (
            <p className="muted small">Loading…</p>
          ) : history.length === 0 ? (
            <p className="muted small">No payments recorded yet.</p>
          ) : (
            <ul className="history">
              {history.map((p) => (
                <li key={p.id}>
                  <span>{monthLabel(p.month)}</span>
                  <span className="muted small">
                    {p.method ?? ''} · {dateLabel(p.paid_on)}
                  </span>
                  <strong>{formatMoney(p.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <ErrorNote message={error} />
    </Sheet>
  )
}
