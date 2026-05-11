'use client'

import React, { useEffect, useRef, useState } from 'react'

/**
 * Autosave indicator + driver. The manual Save button is hidden via CSS
 * (see AdminListStyles), so this is the only feedback the editor sees
 * confirming their work is persisted.
 *
 * States:
 *   idle    — neutral pewter checkmark "All changes saved"
 *   pending — three pulsing pale-gold dots, "Auto-saving in 2s"
 *   saving  — three spinning gold dots, "Saving"
 *   saved   — green checkmark "Saved" then "Saved Xs ago"
 *
 * Implementation: a delegated input/change listener on the surrounding
 * form. We deliberately avoid Payload's `useFormFields` hook because
 * it broke the Cloudflare static page-data collection step in the
 * ManskiHaus build, and the same constraint applies to the limo
 * starter (both run on @opennextjs/cloudflare).
 */
const AUTOSAVE_DELAY_MS = 2000

const AutoSaveField: React.FC = () => {
  const [savingState, setSavingState] = useState<'idle' | 'pending' | 'saving' | 'saved'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const armedRef = useRef(false)

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
      setSavingState('pending')

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const saveBtn = document.querySelector<HTMLButtonElement>(
          'button[type="button"][id="action-save"], button[type="submit"], #action-save',
        )
        setSavingState('saving')
        if (saveBtn) saveBtn.click()
        else (form as HTMLFormElement).requestSubmit()

        setTimeout(() => {
          setSavingState('saved')
          setLastSavedAt(Date.now())
        }, 600)
      }, AUTOSAVE_DELAY_MS)
    }

    form.addEventListener('input', onChange, true)
    form.addEventListener('change', onChange, true)

    // Also watch for DOM mutations inside the form. Image uploads and
    // other relationship fields update React state without firing
    // native input/change events — but the DOM mutates visibly.
    const mutationObserver = new MutationObserver((records) => {
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

  // Re-render every 5s while saved so "Saved Xs ago" stays current
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (savingState !== 'saved' || !lastSavedAt) return
    const id = setInterval(() => forceTick((t) => t + 1), 5000)
    return () => clearInterval(id)
  }, [savingState, lastSavedAt])

  let label = 'All changes saved'
  let bg = '#ecf6ec'
  let border = '#cbe3cb'
  let fg = '#2e6b34'
  let icon: React.ReactNode = <Checkmark />
  if (savingState === 'idle' && !lastSavedAt) {
    // Truly first-render idle (no edits yet)
    label = 'Up to date'
    bg = '#fbfbf6'
    border = '#eeeee8'
    fg = '#636360'
    icon = <Checkmark color="#636360" />
  } else if (savingState === 'pending') {
    // Pale gold for the pending state — a faded version of the brand
    // accent so it reads as "not yet acting" without losing identity.
    label = 'Auto-saving in 2s'
    bg = '#fff8db'
    border = '#f4e08a'
    fg = '#8a6d1a'
    icon = <Dots animated="pulse" />
  } else if (savingState === 'saving') {
    // Brand gold for the active state.
    label = 'Saving'
    bg = '#fff4b8'
    border = '#FFC700'
    fg = '#8a6d1a'
    icon = <Dots animated="spin" />
  } else if (savingState === 'saved' && lastSavedAt) {
    const secs = Math.max(0, Math.floor((Date.now() - lastSavedAt) / 1000))
    label = secs < 5 ? 'Saved' : `Saved ${formatAgo(secs)} ago`
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        margin: '0 0 16px',
        fontSize: 12,
        fontWeight: 600,
        color: fg,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 999,
        fontFamily: 'system-ui, sans-serif',
        letterSpacing: '0.02em',
        transition: 'background 0.18s ease, border-color 0.18s ease, color 0.18s ease',
      }}
    >
      {icon}
      {label}
    </div>
  )
}

function formatAgo(secs: number): string {
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h`
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
@keyframes lim-as-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1.1); }
}
@keyframes lim-as-spin {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
.lim-as-dots { display: inline-flex; gap: 3px; align-items: center; }
.lim-as-dot { animation-duration: ${animated === 'spin' ? '0.9s' : '1.4s'}; animation-iteration-count: infinite; animation-name: ${animated === 'spin' ? 'lim-as-spin' : 'lim-as-pulse'}; }
.lim-as-dot:nth-child(2) { animation-delay: 0.15s; }
.lim-as-dot:nth-child(3) { animation-delay: 0.3s; }
`,
        }}
      />
      <span className="lim-as-dots">
        <span className="lim-as-dot" style={baseDot} />
        <span className="lim-as-dot" style={baseDot} />
        <span className="lim-as-dot" style={baseDot} />
      </span>
    </>
  )
}

export default AutoSaveField
