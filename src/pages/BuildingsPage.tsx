import { useState } from 'react'
import type { Building, Unit } from '../lib/types'
import { deleteRow, saveRow, type Store } from '../lib/data'
import { formatMoney, numOrNull, strOrNull } from '../lib/format'
import { Empty, ErrorNote, Field, Sheet } from '../components/ui'

export function BuildingsPage({ store }: { store: Store }) {
  const [editBuilding, setEditBuilding] = useState<Building | 'new' | null>(null)
  const [editUnit, setEditUnit] = useState<{ unit?: Unit; buildingId: string } | null>(null)

  const occupants = (unitId: string) => store.tenants.filter((t) => t.active && t.unit_id === unitId)
  const done = () => {
    setEditBuilding(null)
    setEditUnit(null)
    void store.reload()
  }

  return (
    <section className="page">
      <div className="page-head">
        <h1>Buildings</h1>
        <button className="btn primary" onClick={() => setEditBuilding('new')}>
          + Add building
        </button>
      </div>

      {store.buildings.length === 0 ? (
        <Empty title="No buildings yet">
          <p>Add each building you rent out, then the flats, rooms or shops inside it.</p>
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
                      {units.length} unit{units.length === 1 ? '' : 's'} · {occupied} occupied · {units.length - occupied} vacant
                    </p>
                  </div>
                  <button className="btn" onClick={() => setEditBuilding(b)}>
                    Edit
                  </button>
                </header>
                <ul className="units">
                  {units.map((u) => {
                    const people = occupants(u.id)
                    return (
                      <li key={u.id}>
                        <button className="unit-row" onClick={() => setEditUnit({ unit: u, buildingId: b.id })}>
                          <span className="card-main">
                            <span className="rent-name">
                              {u.label}
                              {u.unit_type && <span className="muted"> · {u.unit_type}</span>}
                            </span>
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
                  + Add flat / unit
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
  const [name, setName] = useState(building?.name ?? '')
  const [address, setAddress] = useState(building?.address ?? '')
  const [notes, setNotes] = useState(building?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) return setError('Please enter a building name.')
    setBusy(true)
    const err = await saveRow('buildings', { name: name.trim(), address: strOrNull(address), notes: strOrNull(notes) }, building?.id)
    setBusy(false)
    if (err) setError(err)
    else onSaved()
  }

  async function remove() {
    if (!building || !confirm(`Delete ${building.name} and all its units? Tenants will stay but become unassigned.`)) return
    setBusy(true)
    const err = await deleteRow('buildings', building.id)
    setBusy(false)
    if (err) setError(err)
    else onSaved()
  }

  return (
    <Sheet
      title={building ? 'Edit building' : 'New building'}
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
        <Field label="Building name *" wide>
          <input value={name} placeholder="e.g. Lakshmi Apartments" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Address" wide>
          <textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Notes" wide>
          <textarea rows={3} value={notes} placeholder="EB number, water tax, caretaker contact…" onChange={(e) => setNotes(e.target.value)} />
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
    rent_amount: s(unit?.rent_amount),
    deposit: s(unit?.deposit),
    notes: s(unit?.notes),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function save() {
    if (!f.label.trim()) return setError('Please enter a name like "Flat 2B".')
    setBusy(true)
    const err = await saveRow(
      'units',
      {
        building_id: buildingId,
        label: f.label.trim(),
        unit_type: strOrNull(f.unit_type),
        floor: strOrNull(f.floor),
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
    if (!unit || !confirm(`Delete ${unit.label}? Its tenants will become unassigned.`)) return
    setBusy(true)
    const err = await deleteRow('units', unit.id)
    setBusy(false)
    if (err) setError(err)
    else onSaved()
  }

  return (
    <Sheet
      title={unit ? `Edit ${unit.label}` : 'New flat / unit'}
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
        <Field label="Name / number *">
          <input value={f.label} placeholder="Flat 2B" onChange={set('label')} />
        </Field>
        <Field label="Type">
          <input value={f.unit_type} placeholder="2 BHK, Shop, Room" list="unit-types" onChange={set('unit_type')} />
          <datalist id="unit-types">
            {['1 RK', '1 BHK', '2 BHK', '3 BHK', 'Independent house', 'Room', 'Shop', 'Office'].map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <Field label="Floor">
          <input value={f.floor} placeholder="Ground, 1st…" onChange={set('floor')} />
        </Field>
        <Field label="Rent (₹)">
          <input type="number" inputMode="decimal" min="0" value={f.rent_amount} onChange={set('rent_amount')} />
        </Field>
        <Field label="Deposit (₹)">
          <input type="number" inputMode="decimal" min="0" value={f.deposit} onChange={set('deposit')} />
        </Field>
        <Field label="Notes" wide>
          <textarea rows={3} value={f.notes} placeholder="Furnishing, meter number, parking…" onChange={set('notes')} />
        </Field>
      </div>
      <ErrorNote message={error} />
    </Sheet>
  )
}
