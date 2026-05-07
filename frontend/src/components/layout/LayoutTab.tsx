import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { AnimatePresence } from 'framer-motion'
import { Box } from 'lucide-react'
import { useZoneContext } from '../../context/ZoneContext'
import { GrowCycle, GrowStage, Zone, deriveStage } from '../../types/farm'
import { CyclePanel } from './CyclePanel'

// ─── Stage 3D config ──────────────────────────────────────────────────────────
type StageCfg = { body: string; canopy: string; emissive: string; intensity: number }

const STAGE_3D: Record<string, StageCfg> = {
  empty:      { body: '#18181b', canopy: '#27272a', emissive: '#000000', intensity: 0   },
  seedling:   { body: '#052e16', canopy: '#14532d', emissive: '#166534', intensity: 0.5 },
  vegetative: { body: '#052e16', canopy: '#166534', emissive: '#16a34a', intensity: 0.7 },
  mature:     { body: '#041e10', canopy: '#15803d', emissive: '#22c55e', intensity: 1.0 },
  ready:      { body: '#1a0e00', canopy: '#b45309', emissive: '#f59e0b', intensity: 1.0 },
}

const STAGE_BADGE: Record<GrowStage, string> = {
  seedling:   'bg-green-950 text-green-600 border border-green-900/80',
  vegetative: 'bg-green-900/70 text-green-400 border border-green-800/80',
  mature:     'bg-green-800/50 text-green-300 border border-green-700/80',
  ready:      'bg-amber-500/15 text-amber-400 border border-amber-500/30',
}
const STAGE_LABEL: Record<GrowStage, string> = {
  seedling: 'Seedling', vegetative: 'Vegetative', mature: 'Mature', ready: 'Ready ✦',
}

// ─── Zone spatial layout ──────────────────────────────────────────────────────
const ZONE_POS: Record<string, [number, number, number]> = {
  'zone-alpha':   [-5.5, 0,  0],
  'zone-beta':    [-2.0, 0,  0],
  'zone-gamma':   [ 1.0, 0,  0],
  'zone-delta':   [ 5.2, 0,  0],
  'zone-epsilon': [ 8.7, 0,  0],
}

interface ShapeCfg { bW: number; bH: number; bD: number; cW: number; cH: number; cD: number }
const ZONE_SHAPE: Record<string, ShapeCfg> = {
  'zone-alpha':   { bW: 2.2, bH: 1.8,  bD: 0.55, cW: 2.0,  cH: 0.28, cD: 0.50  },
  'zone-beta':    { bW: 2.1, bH: 0.65, bD: 1.8,  cW: 1.9,  cH: 0.22, cD: 1.65  },
  'zone-gamma':   { bW: 0.7, bH: 3.0,  bD: 0.7,  cW: 1.15, cH: 0.40, cD: 1.15  },
  'zone-delta':   { bW: 2.6, bH: 0.42, bD: 2.1,  cW: 2.4,  cH: 0.28, cD: 1.95  },
  'zone-epsilon': { bW: 1.9, bH: 1.4,  bD: 0.6,  cW: 1.7,  cH: 0.18, cD: 0.55  },
}
const FALLBACK: ShapeCfg = { bW: 2.0, bH: 1.5, bD: 0.6, cW: 1.8, cH: 0.25, cD: 0.55 }

// ─── Zone rack mesh ───────────────────────────────────────────────────────────
interface RackProps {
  zone:       Zone
  cycle:      GrowCycle | null
  position:   [number, number, number]
  isSelected: boolean
  onClick:    () => void
}

function ZoneRackMesh({ zone, cycle, position, isSelected, onClick }: RackProps) {
  const [hovered, setHovered] = useState(false)
  const canopyRef = useRef<THREE.Mesh>(null!)

  const stage = cycle ? deriveStage(cycle.plantedAt, cycle.expectedDays) : null
  const cfg   = STAGE_3D[stage ?? 'empty']
  const s     = ZONE_SHAPE[zone.id] ?? FALLBACK
  const ringR = (Math.max(s.bW, s.bD) / 2) + 0.22

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto'
    return () => { document.body.style.cursor = 'auto' }
  }, [hovered])

  useFrame(({ clock }: { clock: THREE.Clock }) => {
    if (!canopyRef.current || stage !== 'ready') return
    const mat = canopyRef.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.8 + Math.sin(clock.getElapsedTime() * 1.9) * 0.55
  })

  const labelY = s.bH + s.cH + 0.65

  return (
    <group
      position={position}
      onClick={(e: { stopPropagation(): void }) => { e.stopPropagation(); onClick() }}
      onPointerOver={(e: { stopPropagation(): void }) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Selection glow ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <torusGeometry args={[ringR, 0.045, 8, 56]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.85} />
        </mesh>
      )}
      {/* Hover ring */}
      {hovered && !isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <torusGeometry args={[ringR, 0.03, 8, 56]} />
          <meshBasicMaterial color="#52525b" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Equipment body */}
      <mesh position={[0, s.bH / 2, 0]} castShadow>
        <boxGeometry args={[s.bW, s.bH, s.bD]} />
        <meshStandardMaterial color={cfg.body} roughness={0.65} metalness={0.3} />
      </mesh>

      {/* Canopy — colored by grow stage */}
      <mesh ref={canopyRef} position={[0, s.bH + s.cH / 2 + 0.05, 0]}>
        <boxGeometry args={[s.cW, s.cH, s.cD]} />
        <meshStandardMaterial
          color={cfg.canopy}
          emissive={cfg.emissive}
          emissiveIntensity={stage !== 'ready' ? cfg.intensity : 0.9}
          roughness={0.3} metalness={0.1}
        />
      </mesh>

      {/* Sparkles above canopy for active zones */}
      {stage && (
        <Sparkles
          count={stage === 'ready' ? 20 : stage === 'mature' ? 12 : 6}
          scale={[s.cW * 1.1, 0.55, s.cD * 1.1]}
          position={[0, s.bH + s.cH + 0.3, 0]}
          size={stage === 'ready' ? 3.2 : 1.8}
          speed={0.22}
          color={stage === 'ready' ? '#f59e0b' : '#22c55e'}
          opacity={0.55}
        />
      )}

      {/* Floating HTML label */}
      <Html center position={[0, labelY, 0]} style={{ pointerEvents: 'none' }}>
        <div className="text-center whitespace-nowrap select-none">
          <p className="text-[11px] font-semibold text-zinc-200 leading-none drop-shadow">{zone.name}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">{zone.cropName}</p>
          <div className="mt-1 flex justify-center">
            {stage
              ? <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded ${STAGE_BADGE[stage]}`}>{STAGE_LABEL[stage]}</span>
              : <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest rounded bg-zinc-800/70 text-zinc-600 border border-zinc-700/50">Empty</span>
            }
          </div>
        </div>
      </Html>
    </group>
  )
}

// ─── Greenhouse wireframe boundary ────────────────────────────────────────────
function GreenhouseFrame({ center, w, h, d, label }: { center: [number, number, number]; w: number; h: number; d: number; label: string }) {
  const geo  = useMemo(() => new THREE.BoxGeometry(w, h, d),      [w, h, d])
  const edge = useMemo(() => new THREE.EdgesGeometry(geo),         [geo])
  return (
    <group position={center}>
      <lineSegments geometry={edge}>
        <lineBasicMaterial color="#22c55e" transparent opacity={0.09} />
      </lineSegments>
      <Html center position={[0, h / 2 + 0.35, 0]} style={{ pointerEvents: 'none' }}>
        <p className="text-[9px] font-mono font-semibold text-green-600/40 uppercase tracking-[0.18em] whitespace-nowrap">{label}</p>
      </Html>
    </group>
  )
}

// ─── Scene (inside Canvas) ────────────────────────────────────────────────────
function FarmScene({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string | null) => void }) {
  const { farms, cycles } = useZoneContext()
  const allZones = useMemo(() => farms.flatMap(f => f.zones), [farms])

  return (
    <>
      <color attach="background" args={['#09090b']} />
      <fog attach="fog" args={['#09090b', 24, 52]} />

      <ambientLight intensity={0.18} />
      <directionalLight position={[8, 16, 10]} intensity={1.9} color="#ffffff" castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-2.5, 4.5, 1]} intensity={0.55} color="#22c55e" />
      <pointLight position={[ 6.8, 3.5, 1]} intensity={0.45} color="#22c55e" />

      <gridHelper args={[70, 70, '#1c1c1e', '#141416']} position={[2, 0, 0]} />

      <GreenhouseFrame center={[-2.25, 2.6, 0]} w={11.2} h={5.2} d={6.5} label="Greenhouse A — Farm 001" />
      <GreenhouseFrame center={[ 6.95, 2.3, 0]} w={ 8.0} h={4.5} d={6.5} label="Greenhouse B — Farm 002" />

      {allZones.map(zone => (
        <ZoneRackMesh
          key={zone.id}
          zone={zone}
          cycle={cycles[zone.id] ?? null}
          position={ZONE_POS[zone.id] ?? [0, 0, 0]}
          isSelected={selectedId === zone.id}
          onClick={() => onSelect(selectedId === zone.id ? null : zone.id)}
        />
      ))}

      <OrbitControls
        target={[2, 0.6, 0]}
        enablePan enableDamping dampingFactor={0.06}
        panSpeed={0.5}
        minPolarAngle={Math.PI / 9}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={8}
        maxDistance={42}
        makeDefault
      />
    </>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────
const LEGEND = [
  { color: 'bg-green-900',  label: 'Seedling'   },
  { color: 'bg-green-600',  label: 'Vegetative' },
  { color: 'bg-green-500',  label: 'Mature'     },
  { color: 'bg-amber-400',  label: 'Ready'      },
  { color: 'bg-zinc-700',   label: 'Empty'      },
]

// ─── Layout Tab ───────────────────────────────────────────────────────────────
interface LayoutTabProps { onViewDashboard: (zoneId: string) => void }

export function LayoutTab({ onViewDashboard }: LayoutTabProps) {
  const { farms, cycles, pastCycles } = useZoneContext()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const allZones    = useMemo(() => farms.flatMap(f => f.zones), [farms])
  const selectedZone = selectedId ? allZones.find(z => z.id === selectedId) ?? null : null

  const activeCount = Object.keys(cycles).length
  const readyCount  = Object.values(cycles).filter(c => deriveStage(c.plantedAt, c.expectedDays) === 'ready').length

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#09090b]">

      {/* ── Header bar ── */}
      <div className="shrink-0 flex items-center gap-3 px-5 h-10 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm">
        <Box size={12} className="text-zinc-600" />
        <span className="text-xs font-semibold text-zinc-400">Farm Intelligence Map</span>
        <span className="text-zinc-700 select-none">·</span>
        <span className="text-xs text-zinc-600">{farms.length} Greenhouse{farms.length > 1 ? 's' : ''}</span>
        <span className="text-zinc-700 select-none">·</span>
        <span className="text-xs text-zinc-600">{allZones.length} Zones</span>
        {activeCount > 0 && <>
          <span className="text-zinc-700 select-none">·</span>
          <span className="text-xs text-green-600 font-medium">{activeCount} Active</span>
        </>}
        {readyCount > 0 && <>
          <span className="text-zinc-700 select-none">·</span>
          <span className="text-xs text-amber-400 font-semibold animate-pulse">{readyCount} Ready to harvest</span>
        </>}
      </div>

      {/* ── Canvas + overlays ── */}
      <div className="flex-1 relative overflow-hidden">

        <Canvas
          style={{ position: 'absolute', inset: 0 }}
          camera={{ position: [2, 13, 18], fov: 45, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: false }}
          shadows
        >
          <FarmScene selectedId={selectedId} onSelect={setSelectedId} />
        </Canvas>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl backdrop-blur-sm">
          {LEGEND.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-sm ${color}`} />
              <span className="text-[10px] text-zinc-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Instruction hint */}
        <div className="absolute bottom-4 right-4 z-10 px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl backdrop-blur-sm">
          <p className="text-[10px] text-zinc-600">Click a zone to view cycle · Drag to orbit</p>
        </div>

        {/* Cycle panel slide-in */}
        <AnimatePresence>
          {selectedZone && (
            <CyclePanel
              key={selectedZone.id}
              zone={selectedZone}
              cycle={cycles[selectedZone.id] ?? null}
              pastCycles={pastCycles[selectedZone.id] ?? []}
              onClose={() => setSelectedId(null)}
              onViewDashboard={zoneId => { setSelectedId(null); onViewDashboard(zoneId) }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
