import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Payment, Tenant } from '../lib/types'
import { deleteRow, saveRow, type Store } from '../lib/data'
import {
  dateLabel,
  formatAadhaar,
  formatMoney,
  isCurrent,
  linkTarget,
  monthLabel,
  numOrNull,
  strOrNull,
  today,
  whatsappLink,
} from '../lib/format'
import { Empty, ErrorNote, Field, Sheet } from '../components/ui'

export function houseName(store: Store, unitId: string | null) {
  const unit = store.units.find((u) => u.id === unitId)
  if (!unit) return 'No house assigned'
  const building = store.buildings.find((b) => b.id === unit.building_id)
  return building ? `House ${unit.label} · ${building.name}` : `House ${unit.label}`
}

export function TenantsPage({ store }: { store: Store }) {
  const [query, setQuery] = useState('')
  const [showPast, setShowPast] = useState(false)
  const [editing, setEditing] = useState<Tenant | 'new' | null>(null)

  const q = query.trim().toLowerCase()
  const list = store.tenants.filter(
    (t) =>
      (showPast || isCurrent(t)) &&
      (!q ||
        t.name.toLowerCase().includes(q) ||
        (t.phone ?? '').includes(q) ||
        houseName(store, t.unit_id).toLowerCase().includes(q)),
  )
  const pastCount = store.tenants.filter((t) => !isCurrent(t)).length

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
          placeholder="Search name, phone or house"
          aria-label="Search tenants"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {store.tenants.length === 0 ? (
        <Empty title="No tenants yet">
          <p>Add each tenant with their house, Aadhaar, rent, advance and dates.</p>
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
                    {t.name} {!isCurrent(t) && <span className="tag">Left {dateLabel(t.move_out_date)}</span>}
                  </span>
                  <span className="muted small">{houseName(store, t.unit_id)}</span>
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
          Show {pastCount} tenant{pastCount === 1 ? '' : 's'} who left
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
    aadhaar_number: s(tenant?.aadhaar_number),
    permanent_address: s(tenant?.permanent_address),
    unit_id: s(tenant?.unit_id),
    move_in_date: s(tenant?.move_in_date) || (tenant ? '' : today()),
    move_out_date: s(tenant?.move_out_date),
    rent_due_day: s(tenant?.rent_due_day),
    rent_amount: s(tenant?.rent_amount),
    deposit: s(tenant?.deposit),
    emergency_contact: s(tenant?.emergency_contact),
    notes: s(tenant?.notes),
  })
  const initialUnit = store.units.find((u) => u.id === tenant?.unit_id)
  const [house, setHouse] = useState({ eb_number: s(initialUnit?.eb_number), key_number: s(initialUnit?.key_number) })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Payment[] | null>(null)

  const unit = store.units.find((u) => u.id === f.unit_id)
  const building = store.buildings.find((b) => b.id === unit?.building_id)
  const houseCount = building ? store.units.filter((u) => u.building_id === building.id).length : 0

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
    const u = store.units.find((x) => x.id === unitId)
    setF({
      ...f,
      unit_id: unitId,
      rent_amount: f.rent_amount || s(u?.rent_amount),
      deposit: f.deposit || s(u?.deposit),
    })
    setHouse({ eb_number: s(u?.eb_number), key_number: s(u?.key_number) })
  }

  async function save() {
    if (!f.name.trim()) return setError('Please enter the tenant’s name.')
    if (f.move_out_date && f.move_in_date && f.move_out_date < f.move_in_date)
      return setError('Leaving date can’t be before the occupying date.')
    setBusy(true)
    let err = await saveRow(
      'tenants',
      {
        name: f.name.trim(),
        phone: strOrNull(f.phone),
        aadhaar_number: strOrNull(f.aadhaar_number.replace(/\s/g, '')),
        permanent_address: strOrNull(f.permanent_address),
        unit_id: f.unit_id || null,
        move_in_date: f.move_in_date || null,
        move_out_date: f.move_out_date || null,
        rent_due_day: numOrNull(f.rent_due_day),
        rent_amount: numOrNull(f.rent_amount) ?? 0,
        deposit: numOrNull(f.deposit),
        emergency_contact: strOrNull(f.emergency_contact),
        notes: strOrNull(f.notes),
      },
      tenant?.id,
    )
    // EB bill and key numbers belong to the house, so save them there.
    if (!err && unit && (house.eb_number !== s(unit.eb_number) || house.key_number !== s(unit.key_number))) {
      err = await saveRow('units', { eb_number: strOrNull(house.eb_number), key_number: strOrNull(house.key_number) }, unit.id)
    }
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

      <h3 className="section-title">Apartment and house</h3>
      <div className="grid">
        <Field label="House" wide>
          <select value={f.unit_id} onChange={(e) => pickUnit(e.target.value)}>
            <option value="">— Choose a house —</option>
            {store.buildings.map((b) => (
              <optgroup key={b.id} label={b.name}>
                {store.units
                  .filter((u) => u.building_id === b.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      House {u.label}
                      {u.unit_type ? ` (${u.unit_type})` : ''}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
        {store.units.length === 0 && (
          <p className="muted small wide">First add the apartment and its houses in the Apartments tab.</p>
        )}
        {unit && building && (
          <>
            <dl className="facts wide">
              <div>
                <dt>Apartment</dt>
                <dd>{building.name}</dd>
              </div>
              <div>
                <dt>No. of houses</dt>
                <dd>{houseCount}</dd>
              </div>
              <div>
                <dt>House number</dt>
                <dd>{unit.label}</dd>
              </div>
            </dl>
            <Field label="EB bill number">
              <input value={house.eb_number} onChange={(e) => setHouse({ ...house, eb_number: e.target.value })} />
            </Field>
            <Field label="House key number">
              <input value={house.key_number} onChange={(e) => setHouse({ ...house, key_number: e.target.value })} />
            </Field>
            <div className="contacts wide">
              <PhoneFact label="Electrician" phone={building.electrician_phone} />
              <PhoneFact label="EB line man" phone={building.eb_lineman_phone} />
            </div>
          </>
        )}
      </div>

      <h3 className="section-title">Tenant</h3>
      <div className="grid">
        <Field label="Tenant name *" wide>
          <input value={f.name} onChange={set('name')} autoComplete="off" />
        </Field>
        <Field label="Phone">
          <input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} />
        </Field>
        <Field label="Aadhaar number">
          <input
            inputMode="numeric"
            maxLength={14}
            placeholder="1234 5678 9012"
            value={formatAadhaar(f.aadhaar_number)}
            onChange={(e) => setF({ ...f, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
          />
        </Field>
        <Field label="Address (as on Aadhaar)" wide>
          <textarea rows={2} value={f.permanent_address} onChange={set('permanent_address')} />
        </Field>
      </div>

      <h3 className="section-title">Dates</h3>
      <div className="grid">
        <Field label="Occupying date">
          <input type="date" value={f.move_in_date} onChange={set('move_in_date')} />
        </Field>
        <Field label="Monthly rent date">
          <input type="number" inputMode="numeric" min="1" max="31" placeholder="e.g. 5" value={f.rent_due_day} onChange={set('rent_due_day')} />
        </Field>
        <Field label="Leaving date">
          <input type="date" value={f.move_out_date} onChange={set('move_out_date')} />
        </Field>
      </div>

      <h3 className="section-title">Rent and advance</h3>
      <div className="grid">
        <Field label="Rent (₹ per month)">
          <input type="number" inputMode="decimal" min="0" value={f.rent_amount} onChange={set('rent_amount')} />
        </Field>
        <Field label="Advance (₹)">
          <input type="number" inputMode="decimal" min="0" value={f.deposit} onChange={set('deposit')} />
        </Field>
        <Field label="Emergency contact" wide>
          <input value={f.emergency_contact} placeholder="Name and phone" onChange={set('emergency_contact')} />
        </Field>
        <Field label="Notes" wide>
          <textarea rows={2} value={f.notes} onChange={set('notes')} />
        </Field>
      </div>

      {tenant && (
        <>
          <h3 className="section-title">Rent paid dates</h3>
          {history === null ? (
            <p className="muted small">Loading…</p>
          ) : history.length === 0 ? (
            <p className="muted small">No payments recorded yet. Tick the tenant on the Rent tab when they pay.</p>
          ) : (
            <ul className="history">
              {history.map((p) => (
                <li key={p.id}>
                  <span>{monthLabel(p.month)}</span>
                  <span className="muted small">
                    Paid {dateLabel(p.paid_on)}
                    {p.method ? ` · ${p.method}` : ''}
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

function PhoneFact({ label, phone }: { label: string; phone: string | null }) {
  return phone ? (
    <a className="contact" href={`tel:${phone}`}>
      <span className="muted small">{label}</span>
      {phone}
    </a>
  ) : (
    <span className="contact empty-contact">
      <span className="muted small">{label}</span>
      <span className="muted small">Add in Apartments</span>
    </span>
  )
}
