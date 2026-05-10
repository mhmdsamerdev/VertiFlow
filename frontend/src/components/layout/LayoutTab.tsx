import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { AnimatePresence } from 'framer-motion'
import { Box } from 'lucide-react'
import { useZoneContext } from '../../context/ZoneContext'
import { Farm, GrowCycle, GrowStage, Zone, deriveStage } from '../../types/farm'
import { CyclePanel } from './CyclePanel'

// ─── Stage 3D config ──────────────────────────────────────────────────────────
type StageCfg = { body: string; canopy: string; emissive: string; intensity: number }
const STAGE_3D: Record<string, StageCfg> = {
  empty:      { body: '#141417', canopy: '#1e1e21', emissive: '#000000', intensity: 0   },
  seedling:   { body: '#052e16', canopy: '#14532d', emissive: '#22c55e', intensity: 0.4 },
  vegetative: { body: '#064e3b', canopy: '#065f46', emissive: '#10b981', intensity: 0.6 },
  mature:     { body: '#064e3b', canopy: '#047857', emissive: '#34d399', intensity: 0.8 },
  ready:      { body: '#1a0e00', canopy: '#92400e', emissive: '#fbbf24', intensity: 1.2 },
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

// ─── Dynamic shape by system type ────────────────────────────────────────────
interface ShapeCfg { bW: number; bH: number; bD: number; cW: number; cH: number; cD: number }
const SHAPE_BY_SYSTEM: Record<string, ShapeCfg> = {
  nft:       { bW: 2.2, bH: 1.8,  bD: 0.55, cW: 2.0,  cH: 0.28, cD: 0.50 },
  dwc:       { bW: 2.1, bH: 0.65, bD: 1.8,  cW: 1.9,  cH: 0.22, cD: 1.65 },
  aeroponic: { bW: 0.7, bH: 3.0,  bD: 0.7,  cW: 1.15, cH: 0.40, cD: 1.15 },
  flood:     { bW: 2.6, bH: 0.42, bD: 2.1,  cW: 2.4,  cH: 0.28, cD: 1.95 },
  kratky:    { bW: 1.9, bH: 1.4,  bD: 0.6,  cW: 1.7,  cH: 0.18, cD: 0.55 },
  media:     { bW: 2.0, bH: 0.8,  bD: 1.5,  cW: 1.8,  cH: 0.25, cD: 1.40 },
}
const FALLBACK_SHAPE: ShapeCfg = { bW: 2.0, bH: 1.5, bD: 0.6, cW: 1.8, cH: 0.25, cD: 0.55 }

// ─── Dynamic position helpers ─────────────────────────────────────────────────
// Farms are laid out left-to-right. Zones within each farm are spaced evenly.
const FARM_SPACING   = 14   // X distance between farm clusters
const ZONE_SPACING   =  3.5 // X distance between zones within a farm

function farmBounds(zoneCount: number): { cx: number; w: number } {
  const halfSpan = ((zoneCount - 1) * ZONE_SPACING) / 2
  return { cx: 0, w: Math.max(halfSpan * 2 + 4, 6) }
}

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
  const s     = SHAPE_BY_SYSTEM[zone.systemType] ?? FALLBACK_SHAPE
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
      scale={hovered ? 1.04 : 1.0}
      onClick={(e: { stopPropagation(): void }) => { e.stopPropagation(); onClick() }}
      onPointerOver={(e: { stopPropagation(): void }) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <torusGeometry args={[ringR, 0.05, 8, 64]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.9} />
        </mesh>
      )}
      {hovered && !isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <torusGeometry args={[ringR, 0.035, 8, 64]} />
          <meshBasicMaterial color="#3f3f46" transparent opacity={0.6} />
        </mesh>
      )}
      <mesh position={[0, s.bH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[s.bW, s.bH, s.bD]} />
        <meshStandardMaterial color={cfg.body} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh ref={canopyRef} position={[0, s.bH + s.cH / 2 + 0.05, 0]}>
        <boxGeometry args={[s.cW, s.cH, s.cD]} />
        <meshStandardMaterial color={cfg.canopy} emissive={cfg.emissive}
          emissiveIntensity={stage !== 'ready' ? cfg.intensity : 0.9}
          roughness={0.2} metalness={0.2} />
      </mesh>
      {stage && (
        <Sparkles
          count={stage === 'ready' ? 24 : stage === 'mature' ? 14 : 8}
          scale={[s.cW * 1.15, 0.6, s.cD * 1.15]}
          position={[0, s.bH + s.cH + 0.35, 0]}
          size={stage === 'ready' ? 3.5 : 2.0}
          speed={0.25}
          color={stage === 'ready' ? '#fbbf24' : '#10b981'}
          opacity={0.6}
        />
      )}
      <Html center position={[0, labelY, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`text-center transition-all duration-300 ${hovered ? 'scale-110' : 'scale-100'}`}>
          <p className="text-[11px] font-bold text-white leading-none drop-shadow-md">{zone.name}</p>
          <p className="text-[9px] text-zinc-400 mt-0.5 font-medium">{zone.cropName}</p>
          <div className="mt-1.5 flex justify-center">
            {stage
              ? <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] rounded-full ${STAGE_BADGE[stage]}`}>{STAGE_LABEL[stage]}</span>
              : <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] rounded-full bg-zinc-900/80 text-zinc-600 border border-zinc-800">Empty</span>
            }
          </div>
        </div>
      </Html>
    </group>
  )
}

// ─── Greenhouse wireframe per farm ────────────────────────────────────────────
function GreenhouseFrame({ center, w, h, d, label }: { center: [number, number, number]; w: number; h: number; d: number; label: string }) {
  const geo  = useMemo(() => new THREE.BoxGeometry(w, h, d), [w, h, d])
  const edge = useMemo(() => new THREE.EdgesGeometry(geo),   [geo])
  return (
    <group position={center}>
      <lineSegments geometry={edge}>
        <lineBasicMaterial color="#10b981" transparent opacity={0.15} />
      </lineSegments>
      <Html center position={[0, h / 2 + 0.45, 0]} style={{ pointerEvents: 'none' }}>
        <div className="px-2 py-0.5 bg-green-500/5 border border-green-500/10 rounded-full backdrop-blur-[2px]">
          <p className="text-[8px] font-mono font-bold text-green-500/60 uppercase tracking-[0.25em] whitespace-nowrap">{label}</p>
        </div>
      </Html>
    </group>
  )
}

// ─── Scene (inside Canvas) ────────────────────────────────────────────────────
interface SceneZone { zone: Zone; position: [number, number, number] }
interface SceneFarm { farm: Farm; cx: number; w: number }

function FarmScene({
  selectedId, onSelect, sceneZones, sceneFarms,
}: {
  selectedId: string | null
  onSelect:   (id: string | null) => void
  sceneZones: SceneZone[]
  sceneFarms: SceneFarm[]
}) {
  const { cycles } = useZoneContext()

  return (
    <>
      <color attach="background" args={['#09090b']} />
      <fog attach="fog" args={['#09090b', 24, 70]} />

      <ambientLight intensity={0.18} />
      <directionalLight position={[8, 16, 10]} intensity={1.9} color="#ffffff" castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-2.5, 4.5, 1]} intensity={0.55} color="#22c55e" />
      <pointLight position={[ 6.8, 3.5, 1]} intensity={0.45} color="#22c55e" />

      <gridHelper args={[90, 90, '#1c1c1e', '#141416']} position={[2, 0, 0]} />

      {sceneFarms.map(({ farm, cx, w }) => (
        <GreenhouseFrame
          key={farm.id}
          center={[cx, 2.5, 0]}
          w={w} h={5.0} d={6.5}
          label={`${farm.name} — ${farm.location}`}
        />
      ))}

      {sceneZones.map(({ zone, position }) => (
        <ZoneRackMesh
          key={zone.id}
          zone={zone}
          cycle={cycles[zone.id] ?? null}
          position={position}
          isSelected={selectedId === zone.id}
          onClick={() => onSelect(selectedId === zone.id ? null : zone.id)}
        />
      ))}

      <OrbitControls
        target={[0, 0.6, 0]}
        enablePan enableDamping dampingFactor={0.06}
        panSpeed={0.5}
        minPolarAngle={Math.PI / 9}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={8}
        maxDistance={55}
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
  const [selectedId, setSelectedId]   = useState<string | null>(null)

  // ── Build per-zone positions and per-farm wireframe data ──────────────────
  const { sceneZones, sceneFarms, allZones } = useMemo(() => {
    const sceneZones: SceneZone[] = []
    const sceneFarms: SceneFarm[] = []
    const allZones: Zone[] = []

    const totalFarmsWidth = (farms.length - 1) * FARM_SPACING
    const startFarmsX = -totalFarmsWidth / 2

    farms.forEach((farm, farmIdx) => {
      const farmCX = startFarmsX + farmIdx * FARM_SPACING
      const { w }  = farmBounds(farm.zones.length)

      // Center zones within the farm cluster
      const totalZonesWidth = (farm.zones.length - 1) * ZONE_SPACING
      const startZonesX = farmCX - totalZonesWidth / 2

      // Sort zones by layerIndex so layer ordering is respected
      const sorted = [...farm.zones].sort((a, b) => a.layerIndex - b.layerIndex)
      sorted.forEach((zone, zoneIdx) => {
        const x = startZonesX + zoneIdx * ZONE_SPACING
        const pos: [number, number, number] = [x, 0, 0]
        sceneZones.push({ zone, position: pos })
        allZones.push(zone)
      })

      // Wireframe centre is exactly at farmCX if zones are centered
      sceneFarms.push({ 
        farm, 
        cx: farmCX, 
        w: w + totalZonesWidth
      })
    })

    return { sceneZones, sceneFarms, allZones }
  }, [farms])

  const selectedZone  = selectedId ? allZones.find(z => z.id === selectedId) ?? null : null
  const activeCount   = Object.keys(cycles).length
  const readyCount    = Object.values(cycles).filter(c => deriveStage(c.plantedAt, c.expectedDays) === 'ready').length

  // Camera target: always centered at origin now that layout is symmetric
  const cameraTarget: [number, number, number] = [0, 0.6, 0]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#09090b]">
      {/* ── Header bar ── */}
      <div className="shrink-0 flex items-center gap-3 px-6 h-11 border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl">
        <div className="p-1.5 bg-green-500/10 rounded-lg">
          <Box size={13} className="text-green-500" />
        </div>
        <span className="text-[11px] font-bold text-zinc-100 tracking-wider uppercase">Farm Intelligence Map</span>
        <span className="text-zinc-800 select-none">|</span>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            {farms.length} Farm{farms.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            {allZones.length} Zone{allZones.length !== 1 ? 's' : ''}
          </span>
          {activeCount > 0 && 
            <span className="text-[10px] font-bold text-green-500/80 bg-green-500/5 px-2 py-0.5 rounded-full border border-green-500/10">
              {activeCount} Active
            </span>
          }
          {readyCount > 0 && 
            <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse uppercase tracking-tight">
              {readyCount} Ready to harvest
            </span>
          }
        </div>
      </div>

      {/* ── Canvas + overlays ── */}
      <div className="flex-1 relative overflow-hidden">
        {farms.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full text-zinc-600 text-sm">
            No farms configured — add farms and zones in Settings
          </div>
        ) : (
          <Canvas
            style={{ position: 'absolute', inset: 0 }}
            camera={{ position: [cameraTarget[0], 13, 18], fov: 45, near: 0.1, far: 120 }}
            gl={{ antialias: true, alpha: false }}
            shadows
          >
            <FarmScene
              selectedId={selectedId}
              onSelect={setSelectedId}
              sceneZones={sceneZones}
              sceneFarms={sceneFarms}
            />
          </Canvas>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 z-10 flex items-center gap-4 px-4 py-2.5 bg-black/40 border border-white/5 rounded-2xl backdrop-blur-md">
          {LEGEND.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${color} ${label === 'Ready' ? 'animate-pulse' : ''}`} />
              <span className="text-[10px] font-bold text-zinc-400 tracking-wide">{label}</span>
            </div>
          ))}
        </div>

        {/* Hint */}
        <div className="absolute bottom-6 right-6 z-10 px-4 py-2.5 bg-black/40 border border-white/5 rounded-2xl backdrop-blur-md">
          <p className="text-[10px] font-medium text-zinc-500 italic">Click a zone to view cycle · Drag to orbit</p>
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
