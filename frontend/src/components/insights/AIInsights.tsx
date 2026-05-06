import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain } from 'lucide-react'

// ─── Fake AI recommendation corpus ────────────────────────────────────────
const RECOMMENDATIONS = [
  'pH rising above target. Consider increasing nitrogen (NO₃) dosage by 5–10 mL/L.',
  'EC level is optimal. Current nutrient concentration is well-balanced for vegetative stage.',
  'Water temperature trending upward. Verify chiller set-point — target 22 °C.',
  'Light intensity is within PPFD range. Photosynthetic efficiency is at peak.',
  'Dissolved oxygen slightly low. Check air-stone placement in reservoir.',
  'Humidity stable at 65%. VPD is ideal — no fungal pressure detected.',
  'Nitrogen-phosphorus ratio nominal. Continue current feed schedule.',
  'Water level approaching 80%. Schedule reservoir top-up within 4 hours.',
]

// ─── Typing cursor ─────────────────────────────────────────────────────────
function Cursor() {
  return <span className="inline-block w-[2px] h-[1em] bg-emerald-400 align-middle ml-[1px] animate-blink" />
}

// ─── Hook: character-by-character typing cycle ─────────────────────────────
const CHAR_DELAY   = 28   // ms per character typed
const HOLD_DELAY   = 3500 // ms to hold full message
const ERASE_DELAY  = 12   // ms per character erased

function useTypingCycle(messages: string[]) {
  const [displayText, setDisplayText] = useState('')
  const [isTyping,    setIsTyping    ] = useState(true)
  const [msgIndex,    setMsgIndex    ] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const target = messages[msgIndex]
    let frame: ReturnType<typeof setTimeout>

    if (isTyping) {
      // type forward
      if (displayText.length < target.length) {
        frame = setTimeout(() => {
          if (mountedRef.current) setDisplayText(target.slice(0, displayText.length + 1))
        }, CHAR_DELAY)
      } else {
        // hold, then erase
        frame = setTimeout(() => {
          if (mountedRef.current) setIsTyping(false)
        }, HOLD_DELAY)
      }
    } else {
      // erase
      if (displayText.length > 0) {
        frame = setTimeout(() => {
          if (mountedRef.current) setDisplayText((prev: string) => prev.slice(0, -1))
        }, ERASE_DELAY)
      } else {
        // advance to next message
        setMsgIndex((prev: number) => (prev + 1) % messages.length)
        setIsTyping(true)
      }
    }

    return () => clearTimeout(frame)
  }, [displayText, isTyping, msgIndex, messages])

  return { displayText, isTyping }
}

// ─── System event log ───────────────────────────────────────────────────────────
const EVENT_LOG = [
  { time: '14:21:03', code: 'PH-ADJ', msg: 'Nitrogen dosage +5mL — pH correction applied' },
  { time: '14:09:47', code: 'EC-NOM', msg: 'EC stabilised at 1.82 mS/cm' },
  { time: '13:55:12', code: 'TMP-OK', msg: 'Water temp alert cleared — chiller nominal' },
]

// ─── Component ───────────────────────────────────────────────────────────────
export function AIInsights() {
  const { displayText, isTyping } = useTypingCycle(RECOMMENDATIONS)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t: number) => (t + 1) % 60), 1_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="lp-section">
      {/* Header */}
      <div className="lp-section-hd">
        <div className="flex items-center gap-1.5">
          <Brain size={12} className="text-violet-500" />
          <span className="lp-section-title">AI Insights</span>
        </div>
        <span className="text-[10px] text-zinc-600">{tick}s ago</span>
      </div>

      <div className="px-4 pb-4 pt-2">
        {/* Live recommendation */}
        <div className="mb-3 p-2.5 bg-zinc-800/40 rounded-lg border border-zinc-800">
          <p className="text-[11px] text-zinc-400 leading-relaxed min-h-[48px]">
            {displayText}
            {(isTyping || displayText.length > 0) && <Cursor />}
          </p>
        </div>

        {/* Event log */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.1em] mb-2">Recent Events</p>
          <AnimatePresence initial={false}>
            {EVENT_LOG.map((ev, i) => (
              <motion.div
                key={ev.code}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-baseline gap-2 py-1 border-b border-zinc-800/50 last:border-0"
              >
                <span className="text-[10px] font-mono text-zinc-700 shrink-0 tabular-nums">{ev.time}</span>
                <span className="text-[10px] font-medium text-violet-400 shrink-0">{ev.code}</span>
                <span className="text-[10px] text-zinc-500 truncate">{ev.msg}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
