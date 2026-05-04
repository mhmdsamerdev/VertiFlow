import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles, ChevronRight } from 'lucide-react'

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

// ─── Insight history pill ──────────────────────────────────────────────────
const HISTORY_SNIPPETS = [
  'pH correction applied',
  'EC stabilised',
  'Temp alert resolved',
]

// ─── Component ─────────────────────────────────────────────────────────────
export function AIInsights() {
  const { displayText, isTyping } = useTypingCycle(RECOMMENDATIONS)
  const [tick, setTick] = useState(0)

  // "Last updated" counter
  useEffect(() => {
    const id = setInterval(() => setTick((t: number) => (t + 1) % 60), 1_000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="gradient-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/30">
            <Brain size={12} className="text-indigo-400" />
          </div>
          <span className="text-xs font-semibold text-slate-300 tracking-wide">AI Insights</span>
          <span className="flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">
            <Sparkles size={9} />
            Beta
          </span>
        </div>
        <span className="text-[10px] text-slate-600 font-mono">{tick}s ago</span>
      </div>

      {/* Active recommendation */}
      <div className="min-h-[64px] mb-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          {displayText}
          {isTyping && <Cursor />}
          {!isTyping && displayText.length > 0 && <Cursor />}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.06] mb-3" />

      {/* History snippets */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-1.5">
          Recent Actions
        </p>
        <AnimatePresence initial={false}>
          {HISTORY_SNIPPETS.map((snippet, i) => (
            <motion.div
              key={snippet}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-2 text-[11px] text-slate-500 group cursor-default"
            >
              <ChevronRight size={10} className="text-emerald-600 shrink-0" />
              <span className="group-hover:text-slate-300 transition-colors duration-150">{snippet}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}
