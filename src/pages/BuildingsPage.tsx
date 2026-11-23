import { useState } from 'react'
import type { Building, Unit } from '../lib/types'
import { deleteRow, saveRow, type Store } from '../lib/data'
import { formatMoney, isCurrent, numOrNull, strOrNull } from '../lib/format'
import { Empty, ErrorNote, Field, Sheet } from '../components/ui'

export function BuildingsPage({ store }: { store: Store }) {
  const [editBuilding, setEditBuilding] = useState<Building | 'new' | null>(null)
  const [editUnit, setEditUnit] = useState<{ unit?: Unit; buildingId: string } | null>(null)

  const occupants = (unitId: string) => store.tenants.filter((t) => t.unit_id === unitId && isCurrent(t))
  const done = () => {
    setEditBuilding(null)
    setEditUnit(null)
    void store.reload()
  }

  return (
    <section className="page">
      <div className="page-head">
        <h1>Apartments</h1>
        <button className="btn primary" onClick={() => setEditBuilding('new')}>
          + Add apartment
        </button>
      </div>

      {store.buildings.length === 0 ? (
        <Empty title="No apartments yet">
          <p>Add each apartment you rent out, then the houses inside it.</p>
        </Empty>
      ) : (
        <div className="stack">
          {store.buildings.map((b) => {
            const units = store.units.filter((u) => u.building_id === b.id)
            const occupied = units.filter((u) => occupants(u.id).length > 0).length
            return (
              <article key={b.id} className="building">
                <header className="building-head">
                  <div>
                    <h2>{b.name}</h2>
                    {b.address && <p className="muted small">{b.address}</p>}
                    <p className="small">
                      {units.length} house{units.length === 1 ? '' : 's'} · {occupied} occupied · {units.length - occupied} vacant
                    </p>
                  </div>
                  <button className="btn" onClick={() => setEditBuilding(b)}>
                    Edit
                  </button>
                </header>

                {(b.electrician_phone || b.eb_lineman_phone) && (
                  <div className="contacts">
                    {b.electrician_phone && (
                      <a className="contact" href={`tel:${b.electrician_phone}`}>
                        <span className="muted small">Electrician</span>
                        {b.electrician_phone}
                      </a>
                    )}
                    {b.eb_lineman_phone && (
                      <a className="contact" href={`tel:${b.eb_lineman_phone}`}>
                        <span className="muted small">EB line man</span>
                        {b.eb_lineman_phone}
                      </a>
                    )}
                  </div>
                )}

                <ul className="units">
                  {units.map((u) => {
                    const people = occupants(u.id)
                    const extra = [u.unit_type, u.eb_number && `EB ${u.eb_number}`, u.key_number && `Key ${u.key_number}`]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <li key={u.id}>
                        <button className="unit-row" onClick={() => setEditUnit({ unit: u, buildingId: b.id })}>
                          <span className="card-main">
                            <span className="rent-name">House {u.label}</span>
                            {extra && <span className="muted small">{extra}</span>}
                            <span className={people.length ? 'small' : 'small muted'}>
                              {people.length ? people.map((p) => p.name).join(', ') : 'Vacant'}
                            </span>
                          </span>
                          {u.rent_amount != null && <span className="card-amount">{formatMoney(u.rent_amount)}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <button className="link" onClick={() => setEditUnit({ buildingId: b.id })}>
                  + Add house
                </button>
              </article>
            )
          })}
        </div>
      )}

      {editBuilding && (
        <BuildingSheet building={editBuilding === 'new' ? undefined : editBuilding} onClose={() => setEditBuilding(null)} onSaved={done} />
      )}
      {editUnit && <UnitSheet {...editUnit} onClose={() => setEditUnit(null)} onSaved={done} />}
    </section>
  )
}

function BuildingSheet({ building, onClose, onSaved }: { building?: Building; onClose: () => void; onSaved: () => void }) {
  const s = (v: string | null | undefined) => v ?? ''
  const [f, setF] = useState({
    name: s(building?.name),
    address: s(building?.address),
    electrician_phone: s(building?.electrician_phone),
    eb_lineman_phone: s(building?.eb_lineman_phone),
    notes: s(building?.notes),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function save() {
    if (!f.name.trim()) return setError('Please enter the apartment name.')
    setBusy(true)
    const err = await saveRow(
      'buildings',
      {
        name: f.name.trim(),
        address: strOrNull(f.address),
        electrician_phone: strOrNull(f.electrician_phone),
        eb_lineman_phone: strOrNull(f.eb_lineman_phone),
        notes: strOrNull(f.notes),
      },
      building?.id,
    )
    setBusy(false)
    if (err) setError(err)
    else onSaved()
  }

  async function remove() {
    if (!building || !confirm(`Delete ${building.name} and all its houses? Tenants will stay but have no house.`)) return
    setBusy(true)
    const err = await deleteRow('buildings', building.id)
    setBusy(false)
    if (err) setError(err)
    else onSaved()
  }

  return (
    <Sheet
      title={building ? 'Edit apartment' : 'New apartment'}
      onClose={onClose}
      footer={
        <>
          {building && (
            <button className="btn danger" onClick={remove} disabled={busy}>
              Delete
            </button>
          )}
          <button className="btn primary" onClick={save} disabled={busy}>
            Save
          </button>
        </>
      }
    >
      <div className="grid">
        <Field label="Apartment name *" wide>
          <input value={f.name} placeholder="e.g. Lakshmi Apartments" onChange={set('name')} />
        </Field>
        <Field label="Address" wide>
          <textarea rows={2} value={f.address} onChange={set('address')} />
        </Field>
        <Field label="Electrician number">
          <input type="tel" inputMode="tel" value={f.electrician_phone} onChange={set('electrician_phone')} />
        </Field>
        <Field label="EB line man number">
          <input type="tel" inputMode="tel" value={f.eb_lineman_phone} onChange={set('eb_lineman_phone')} />
        </Field>
        <Field label="Notes" wide>
          <textarea rows={2} value={f.notes} placeholder="Water tax, caretaker contact…" onChange={set('notes')} />
        </Field>
      </div>
      <ErrorNote message={error} />
    </Sheet>
  )
}

function UnitSheet({ unit, buildingId, onClose, onSaved }: { unit?: Unit; buildingId: string; onClose: () => void; onSaved: () => void }) {
  const s = (v: string | number | null | undefined) => (v == null ? '' : String(v))
  const [f, setF] = useState({
    label: s(unit?.label),
    unit_type: s(unit?.unit_type),
    floor: s(unit?.floor),
    eb_number: s(unit?.eb_number),
    key_number: s(unit?.key_number),
    rent_amount: s(unit?.rent_amount),
    deposit: s(unit?.deposit),
    notes: s(unit?.notes),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function save() {
    if (!f.label.trim()) return setError('Please enter the house number.')
    setBusy(true)
    const err = await saveRow(
      'units',
      {
        building_id: buildingId,
        label: f.label.trim(),
        unit_type: strOrNull(f.unit_type),
        floor: strOrNull(f.floor),
        eb_number: strOrNull(f.eb_number),
        key_number: strOrNull(f.key_number),
        rent_amount: numOrNull(f.rent_amount),
        deposit: numOrNull(f.deposit),
        notes: strOrNull(f.notes),
      },
      unit?.id,
    )
    setBusy(false)
    if (err) setError(err)
    else onSaved()
  }

  async function remove() {
    if (!unit || !confirm(`Delete house ${unit.label}? Its tenants will have no house.`)) return
    setBusy(true)
    const err = await deleteRow('units', unit.id)
    setBusy(false)
    if (err) setError(err)
    else onSaved()
  }

  return (
    <Sheet
      title={unit ? `House ${unit.label}` : 'New house'}
      onClose={onClose}
      footer={
        <>
          {unit && (
            <button className="btn danger" onClick={remove} disabled={busy}>
              Delete
            </button>
          )}
          <button className="btn primary" onClick={save} disabled={busy}>
            Save
          </button>
        </>
      }
    >
      <div className="grid">
        <Field label="House number *">
          <input value={f.label} placeholder="e.g. 2B" onChange={set('label')} />
        </Field>
        <Field label="Type">
          <input value={f.unit_type} placeholder="2 BHK, Shop…" list="unit-types" onChange={set('unit_type')} />
          <datalist id="unit-types">
            {['1 RK', '1 BHK', '2 BHK', '3 BHK', 'Independent house', 'Room', 'Shop', 'Office'].map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <Field label="EB bill number">
          <input value={f.eb_number} onChange={set('eb_number')} />
        </Field>
        <Field label="House key number">
          <input value={f.key_number} onChange={set('key_number')} />
        </Field>
        <Field label="Rent (₹)">
          <input type="number" inputMode="decimal" min="0" value={f.rent_amount} onChange={set('rent_amount')} />
        </Field>
        <Field label="Advance (₹)">
          <input type="number" inputMode="decimal" min="0" value={f.deposit} onChange={set('deposit')} />
        </Field>
        <Field label="Floor">
          <input value={f.floor} placeholder="Ground, 1st…" onChange={set('floor')} />
        </Field>
        <Field label="Notes" wide>
          <textarea rows={2} value={f.notes} placeholder="Furnishing, parking…" onChange={set('notes')} />
        </Field>
      </div>
      <ErrorNote message={error} />
    </Sheet>
  )
}
