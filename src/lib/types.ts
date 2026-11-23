export type Building = {
  id: string
  name: string
  address: string | null
  notes: string | null
}

export type Unit = {
  id: string
  building_id: string
  label: string
  unit_type: string | null
  floor: string | null
  rent_amount: number | null
  deposit: number | null
  notes: string | null
}

export type Tenant = {
  id: string
  unit_id: string | null
  name: string
  phone: string | null
  email: string | null
  id_proof_type: string | null
  id_proof_number: string | null
  move_in_date: string | null
  rent_amount: number
  deposit: number | null
  rent_due_day: number | null
  emergency_contact: string | null
  notes: string | null
  active: boolean
}

export type Payment = {
  id: string
  tenant_id: string
  month: string
  amount: number
  paid_on: string
  method: string | null
  note: string | null
}

export type Data = {
  buildings: Building[]
  units: Unit[]
  tenants: Tenant[]
}
