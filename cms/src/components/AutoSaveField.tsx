'use client'

import React, { useEffect, useRef, useState } from 'react'

/**
 * Autosave indicator + driver. The manual Save button is hidden via CSS
 * (see AdminListStyles), so this is the only feedback the editor sees
 * confirming their work is persisted.
 *
 * States:
 *   idle    — hidden
 *   pending — three pulsing pale-gold dots, "Auto-saving"
 *   saving  — three spinning gold dots, "Saving"
 *   saved   — green ✓ "Saved" → fades out after a few seconds
 *
 * Implementation: a delegated input/change listener on the surrounding
 * form. We deliberately avoid Payload's `useFormFields` hook because
 * it broke the Cloudflare static page-data collection step in earlier
 * sessions.
 */
const AUTOSAVE_DELAY_MS = 2000
// Time to ignore mutations after we trigger a save — covers the
// network round-trip + Payload's post-save form re-render. Keeps us
// from looping (post-save re-render → looks like a new edit → schedule
// another save → loop).
const SAVE_COOLDOWN_MS = 4000
// After the saved state appears, fade the indicator out so it doesn't
// clutter the form while the editor keeps working.
const SAVED_VISIBLE_MS = 4000

const AutoSaveField: React.FC = () => {
  const [savingState, setSavingState] = useState<'idle' | 'pending' | 'saving' | 'saved'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const armedRef = useRef(false)
  // Block re-entrancy: once we kick off a save, ignore any mutations
  // for SAVE_COOLDOWN_MS. Otherwise Payload's post-save form re-render
  // looks like a new "change" and we loop forever, never settling on
  // "saved".
  const saveLockUntilRef = useRef(0)

  useEffect(() => {
    document.body.classList.add('mh-autosave-active')

    const armTimer = setTimeout(() => {
      armedRef.current = true
    }, 1000)

    const form = document.querySelector(
      'form[method="POST"], form.collection-edit, form.global-edit, main form',
    )
    if (!form) {
      return () => {
        clearTimeout(armTimer)
        document.body.classList.remove('mh-autosave-active')
      }
    }

    const onChange = () => {
      if (!armedRef.current) return
      if (Date.now() < saveLockUntilRef.current) return
      setSavingState('pending')

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const saveBtn = document.querySelector<HTMLButtonElement>(
          'button[type="button"][id="action-save"], button[type="submit"], #action-save',
        )
        // Lock for 4s: 2s for the round-trip + 2s for Payload's
        // post-save re-render to settle.
        saveLockUntilRef.current = Date.now() + SAVE_COOLDOWN_MS
        setSavingState('saving')
        if (saveBtn) saveBtn.click()
        else (form as HTMLFormElement).requestSubmit()

        setTimeout(() => {
          setSavingState('saved')
          setLastSavedAt(Date.now())
        }, 800)
      }, AUTOSAVE_DELAY_MS)
    }

    form.addEventListener('input', onChange, true)
    form.addEventListener('change', onChange, true)

    // Mutation observer catches programmatic field changes (image
    // uploads, relationship pickers) that don't fire native events.
    // We ignore mutations inside our own indicator chip and during the
    // save-cooldown window to keep us from looping on Payload's
    // post-save re-render.
    const mutationObserver = new MutationObserver((records) => {
      if (Date.now() < saveLockUntilRef.current) return
      const meaningful = records.some((r) => {
        const t = r.target as HTMLElement
        if (!t) return false
        if (t.closest && (t.closest('[class*="mh-as-"]') || t.closest('.mh-autosave-indicator'))) {
          return false
        }
        return true
      })
      if (meaningful) onChange()
    })
    mutationObserver.observe(form, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'src', 'data-id', 'data-value'],
    })

    return () => {
      clearTimeout(armTimer)
      if (timerRef.current) clearTimeout(timerRef.current)
      form.removeEventListener('input', onChange, true)
      form.removeEventListener('change', onChange, true)
      mutationObserver.disconnect()
      document.body.classList.remove('mh-autosave-active')
    }
  }, [])

  // Tick every second while transient state changes are happening so
  // the auto-hide animates cleanly.
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (savingState === 'idle') return
    const id = setInterval(() => forceTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [savingState])

  // Fade the indicator out 4s after a successful save so it doesn't
  // clutter the form. Hidden entirely until the editor types again.
  const visible = (() => {
    if (savingState === 'pending' || savingState === 'saving') return true
    if (savingState === 'saved' && lastSavedAt) {
      return Date.now() - lastSavedAt < SAVED_VISIBLE_MS
    }
    return false
  })()

  let label = ''
  let bg = '#ecf6ec'
  let border = '#cbe3cb'
  let fg = '#2e6b34'
  let icon: React.ReactNode = <Checkmark />
  if (savingState === 'pending') {
    label = 'Auto-saving'
    bg = '#fff8db'
    border = '#f4e08a'
    fg = '#8a6d1a'
    icon = <Dots animated="pulse" />
  } else if (savingState === 'saving') {
    label = 'Saving'
    bg = '#fff4b8'
    border = '#FFC700'
    fg = '#8a6d1a'
    icon = <Dots animated="spin" />
  } else if (savingState === 'saved') {
    label = 'Saved'
  }

  return (
    <div
      className="mh-autosave-indicator"
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
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transform: visible ? 'translateY(0)' : 'translateY(-4px)',
        transition:
          'opacity 0.3s ease, transform 0.3s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease',
      }}
      aria-live="polite"
    >
      {icon}
      {label}
    </div>
  )
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
@keyframes mh-as-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1.1); }
}
@keyframes mh-as-spin {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
.mh-as-dots { display: inline-flex; gap: 3px; align-items: center; }
.mh-as-dot { animation-duration: ${animated === 'spin' ? '0.9s' : '1.4s'}; animation-iteration-count: infinite; animation-name: ${animated === 'spin' ? 'mh-as-spin' : 'mh-as-pulse'}; }
.mh-as-dot:nth-child(2) { animation-delay: 0.15s; }
.mh-as-dot:nth-child(3) { animation-delay: 0.3s; }
`,
        }}
      />
      <span className="mh-as-dots">
        <span className="mh-as-dot" style={baseDot} />
        <span className="mh-as-dot" style={baseDot} />
        <span className="mh-as-dot" style={baseDot} />
      </span>
    </>
  )
}

export default AutoSaveField
