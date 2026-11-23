export type Building = {
  id: string
  name: string
  address: string | null
  electrician_phone: string | null
  eb_lineman_phone: string | null
  notes: string | null
}

export type Unit = {
  id: string
  building_id: string
  label: string
  unit_type: string | null
  floor: string | null
  eb_number: string | null
  key_number: string | null
  rent_amount: number | null
  deposit: number | null
  notes: string | null
}

export type Tenant = {
  id: string
  unit_id: string | null
  name: string
  phone: string | null
  aadhaar_number: string | null
  permanent_address: string | null
  move_in_date: string | null
  move_out_date: string | null
  rent_amount: number
  deposit: number | null
  rent_due_day: number | null
  emergency_contact: string | null
  notes: string | null
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
