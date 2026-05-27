'use client'

import { useForm } from '@payloadcms/ui'
import React, { useEffect, useRef, useState } from 'react'

/**
 * Autosave indicator + driver. The manual Save button is hidden via CSS
 * (see AdminListStyles), so this is the only feedback the editor sees
 * confirming their work is persisted.
 *
 * States:
 *   idle    — hidden
 *   pending — three pulsing dots, "Auto-saving"
 *   saving  — three spinning dots, "Saving"
 *   saved   — green ✓ "Saved" → fades out after a few seconds
 *
 * Implementation: we read the live form state via Payload's `useForm()`
 * context and compare a "meaningful" snapshot of it (empty values
 * stripped, auto-generated array row IDs ignored) against the last
 * known state. Only when that snapshot actually changes do we trigger
 * a save. This is what makes "Add Gallery Image" — which inserts an
 * empty row whose only populated field is an auto-generated `id` —
 * not count as user activity worth saving.
 *
 * We poll the form state on a short interval rather than using
 * `useFormFields`, which previously caused issues with the Cloudflare
 * static page-data collection step.
 */
const AUTOSAVE_DELAY_MS = 2000
// Brief window after a save resolves to absorb Payload's post-save
// re-render before we start diffing again. Without this we'd see the
// server's echo of the saved state as a "new edit" and loop.
const POST_SAVE_SETTLE_MS = 1500
// After the saved state appears, fade the indicator out so it doesn't
// clutter the form while the editor keeps working.
const SAVED_VISIBLE_MS = 3000
// How often to re-read form state. Cheap — just reads in-memory React
// state. Short enough that the "Auto-saving" indicator feels
// responsive after the user's edit.
const POLL_MS = 200

type SaveState = 'idle' | 'pending' | 'saving' | 'saved'

const AutoSaveField: React.FC = () => {
  const [savingState, setSavingState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const { getData, submit } = useForm()

  // Keep the latest function refs available inside the long-lived
  // interval without re-running the effect on every render.
  const getDataRef = useRef(getData)
  getDataRef.current = getData
  const submitRef = useRef(submit)
  submitRef.current = submit

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const armedRef = useRef(false)
  // True while a submit() is in flight. Prevents firing another save
  // on top of one that's still resolving.
  const isSavingRef = useRef(false)
  // Brief window after submit() resolves to let Payload's post-save
  // re-render settle, so we don't mistake the server's echo for a new
  // edit and immediately schedule another save.
  const settleUntilRef = useRef(0)
  // Snapshot of the last *saved* state — what we'd send if a save fired
  // right now would have to differ from this.
  const lastSnapshotRef = useRef<string>('')
  // Snapshot from the *previous* poll. We restart the debounce only
  // when a poll's snapshot differs from this — i.e., the user just
  // made a fresh edit — rather than every poll where current data
  // differs from the last saved state (which would reset the timer
  // forever and prevent the save from ever firing).
  const prevPolledSnapshotRef = useRef<string>('')

  // Suppress Payload's generic "Something went wrong." toast that
  // fires from its built-in form-state sync (e.g. when adding an empty
  // gallery row, the server-side form-state handler hits an edge case
  // with no data integrity impact). Real save errors are surfaced
  // through this component's own indicator state, so the generic toast
  // is just noise. Anything specific (validation, "field is required",
  // etc.) passes through untouched.
  useEffect(() => {
    const isNoise = (text: string) =>
      text.trim().toLowerCase().replace(/[.!]+$/, '') === 'something went wrong'

    const hideIfNoise = (el: HTMLElement) => {
      if (isNoise(el.textContent || '')) el.style.display = 'none'
    }

    const observer = new MutationObserver((records) => {
      for (const r of records) {
        for (const node of Array.from(r.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue
          if (node.matches?.('[data-sonner-toast]')) hideIfNoise(node)
          node
            .querySelectorAll?.('[data-sonner-toast]')
            .forEach((t) => hideIfNoise(t as HTMLElement))
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.body.classList.add('mh-autosave-active')

    const computeSnapshot = (): string => {
      try {
        const data = getDataRef.current?.()
        if (!data) return ''
        return stableStringify(stripMeaningless(data))
      } catch {
        return ''
      }
    }

    // Capture a baseline snapshot after the form has had a moment to
    // initialize. Until armedRef flips, we ignore changes — Payload's
    // own initial render shouldn't be confused for an edit.
    const armTimer = setTimeout(() => {
      const baseline = computeSnapshot()
      lastSnapshotRef.current = baseline
      prevPolledSnapshotRef.current = baseline
      armedRef.current = true
    }, 1000)

    const tick = () => {
      if (!armedRef.current) return
      if (isSavingRef.current) return
      if (Date.now() < settleUntilRef.current) return

      const snapshot = computeSnapshot()
      if (snapshot === lastSnapshotRef.current) {
        // No unsaved changes. Keep prev-polled in sync so the next
        // genuine edit is detected as a fresh one.
        prevPolledSnapshotRef.current = snapshot
        return
      }

      // There are unsaved changes. Only restart the debounce when the
      // user has *just* edited something — otherwise let the existing
      // timer keep counting down so the save actually fires.
      const isFreshEdit = snapshot !== prevPolledSnapshotRef.current
      prevPolledSnapshotRef.current = snapshot
      if (!isFreshEdit) return

      setSavingState('pending')

      const attemptSave = async () => {
        const finalSnapshot = computeSnapshot()
        if (finalSnapshot === lastSnapshotRef.current) {
          setSavingState('idle')
          return
        }

        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
          debounceRef.current = setTimeout(attemptSave, 1000)
          return
        }

        lastSnapshotRef.current = finalSnapshot
        isSavingRef.current = true
        setSavingState('saving')

        try {
          await submitRef.current?.({ disableSuccessStatus: true })
          setSavingState('saved')
          setLastSavedAt(Date.now())
        } catch {
          setSavingState('idle')
        }

        isSavingRef.current = false
        settleUntilRef.current = Date.now() + POST_SAVE_SETTLE_MS
        setTimeout(() => {
          const refreshed = computeSnapshot()
          lastSnapshotRef.current = refreshed
          prevPolledSnapshotRef.current = refreshed
        }, POST_SAVE_SETTLE_MS)
      }

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(attemptSave, AUTOSAVE_DELAY_MS)
    }

    const pollId = setInterval(tick, POLL_MS)

    return () => {
      clearTimeout(armTimer)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      clearInterval(pollId)
      document.body.classList.remove('mh-autosave-active')
    }
  }, [])

  // After the green "Saved" highlight expires, drop back to the
  // muted "All changes saved" placeholder.
  useEffect(() => {
    if (savingState !== 'saved') return
    const id = setTimeout(() => setSavingState('idle'), SAVED_VISIBLE_MS)
    return () => clearTimeout(id)
  }, [savingState, lastSavedAt])

  // Idle is the resting state: a muted gray "All changes saved"
  // placeholder so the editor can confirm at a glance that work is
  // persisted. Other states light up briefly during activity.
  let label = 'All changes saved'
  let bg = '#f4f4f5'
  let border = '#e4e4e7'
  let fg = '#71717a'
  let icon: React.ReactNode = <Checkmark />
  if (savingState === 'pending') {
    label = 'Auto-saving'
    bg = '#fffbe8'
    border = '#f3e3a8'
    fg = '#a17c1d'
    icon = <Dots animated="pulse" />
  } else if (savingState === 'saving') {
    label = 'Saving'
    bg = '#fff8dc'
    border = '#ecdfb8'
    fg = '#8a6d1a'
    icon = <Dots animated="spin" />
  } else if (savingState === 'saved') {
    label = 'Saved'
    bg = '#ecf6ec'
    border = '#cbe3cb'
    fg = '#2e6b34'
  }

  return (
    <div
      className="mtm-autosave-indicator"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        margin: 0,
        fontSize: 11,
        fontWeight: 600,
        color: fg,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 999,
        fontFamily: 'system-ui, sans-serif',
        letterSpacing: '0.02em',
        opacity: 1,
        transition:
          'background 0.18s ease, border-color 0.18s ease, color 0.18s ease',
      }}
      aria-live="polite"
    >
      {icon}
      {label}
    </div>
  )
}

// A value is "meaningfully empty" if it carries no user-entered data.
// Crucially, an array row whose only populated field is an
// auto-generated `id` counts as empty — that's exactly the state
// produced by clicking "Add Gallery Image" without picking an image.
function isMeaningfullyEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value)) return value.every(isMeaningfullyEmpty)
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'id') continue
      if (!isMeaningfullyEmpty(v)) return false
    }
    return true
  }
  return false
}

function stripMeaningless(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.filter((v) => !isMeaningfullyEmpty(v)).map(stripMeaningless)
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isMeaningfullyEmpty(v)) continue
      result[k] = stripMeaningless(v)
    }
    return result
  }
  return value
}

// JSON.stringify with key sorting so two equivalent states always
// produce the same string regardless of property insertion order.
function stableStringify(value: unknown): string {
  if (value === undefined) return 'null'
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']'
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
  }
  return JSON.stringify(value)
}

const Checkmark: React.FC<{ color?: string }> = ({ color = 'currentColor' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const Dots: React.FC<{ animated: 'pulse' | 'spin' }> = ({ animated }) => {
  const baseDot: React.CSSProperties = {
    display: 'inline-block',
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'currentColor',
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes mtm-as-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1.1); }
}
@keyframes mtm-as-spin {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
.mtm-as-dots { display: inline-flex; gap: 3px; align-items: center; }
.mtm-as-dot { animation-duration: ${animated === 'spin' ? '0.9s' : '1.4s'}; animation-iteration-count: infinite; animation-name: ${animated === 'spin' ? 'mtm-as-spin' : 'mtm-as-pulse'}; }
.mtm-as-dot:nth-child(2) { animation-delay: 0.15s; }
.mtm-as-dot:nth-child(3) { animation-delay: 0.3s; }
`,
        }}
      />
      <span className="mtm-as-dots">
        <span className="mtm-as-dot" style={baseDot} />
        <span className="mtm-as-dot" style={baseDot} />
        <span className="mtm-as-dot" style={baseDot} />
      </span>
    </>
  )
}

export default AutoSaveField
