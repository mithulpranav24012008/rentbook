import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Data } from './types'

/** Loads the signed-in user's buildings, units and tenants. RLS limits rows to that user. */
export function useData() {
  const [data, setData] = useState<Data>({ buildings: [], units: [], tenants: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [b, u, t] = await Promise.all([
      supabase.from('buildings').select('*').order('name'),
      supabase.from('units').select('*').order('label'),
      supabase.from('tenants').select('*').order('name'),
    ])
    const err = b.error || u.error || t.error
    if (err) {
      setError(err.message)
    } else {
      setError(null)
      setData({ buildings: b.data ?? [], units: u.data ?? [], tenants: t.data ?? [] })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { ...data, loading, error, reload }
}

export type Store = ReturnType<typeof useData>

/** Insert when there is no id, update otherwise. Returns an error message or null. */
export async function saveRow(table: string, row: Record<string, unknown>, id?: string) {
  const { error } = id
    ? await supabase.from(table).update(row).eq('id', id)
    : await supabase.from(table).insert(row)
  return error?.message ?? null
}

export async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  return error?.message ?? null
}
