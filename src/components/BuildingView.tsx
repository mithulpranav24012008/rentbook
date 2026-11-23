import { Suspense, lazy, useCallback, useState } from 'react'
import type { BuildingWindows } from '../lib/rent'

const Building3D = lazy(() => import('./Building3D'))

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** The apartment(s) with one window per house. 3D when the phone can draw it, a flat drawing otherwise. */
export function BuildingView({ data, label, lightUp }: { data: BuildingWindows[]; label: string; lightUp?: boolean }) {
  const [use3d, setUse3d] = useState(hasWebGL)
  const onFail = useCallback(() => setUse3d(false), [])
  const counts = { paid: 0, due: 0, vacant: 0 }
  data.forEach((b) => b.windows.forEach((w) => counts[w.state]++))

  return (
    <figure className="building-view">
      <div className="building-stage" role="img" aria-label={label}>
        {use3d ? (
          <Suspense fallback={<FlatBuildings data={data} />}>
            <Building3D data={data} onFail={onFail} lightUp={lightUp} />
          </Suspense>
        ) : (
          <FlatBuildings data={data} />
        )}
      </div>
      <figcaption className="key">
        <span>
          <i className="swatch paid" /> Lit window: paid ({counts.paid})
        </span>
        <span>
          <i className="swatch due" /> Dark window: not paid ({counts.due})
        </span>
        {counts.vacant > 0 && (
          <span>
            <i className="swatch vacant" /> Grey: empty house ({counts.vacant})
          </span>
        )}
      </figcaption>
    </figure>
  )
}

function FlatBuildings({ data }: { data: BuildingWindows[] }) {
  return (
    <div className="flat-buildings" aria-hidden="true">
      {data.map((b) => (
        <div key={b.building.id} className="flat-building" style={{ gridTemplateColumns: `repeat(${b.columns}, 1fr)` }}>
          {/* Top floor first on screen, so house 1 sits bottom-left as in the 3D view. */}
          {Array.from({ length: b.floors }, (_, f) => b.floors - 1 - f).flatMap((floor) =>
            Array.from({ length: b.columns }, (_, c) => {
              const w = b.windows[floor * b.columns + c]
              return <i key={`${floor}-${c}`} className={w ? `swatch ${w.state}` : 'swatch none'} />
            }),
          )}
        </div>
      ))}
    </div>
  )
}
