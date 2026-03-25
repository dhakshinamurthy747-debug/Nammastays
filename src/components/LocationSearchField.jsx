import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { suggestPlaces } from '../utils/placeSuggestions'
import styles from './LocationSearchField.module.css'

function highlightQuery(text, query) {
  const q = query.trim()
  if (!q) return text
  const lower = text.toLowerCase()
  const idx = lower.indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

/**
 * Destination typeahead: cities from catalog + property locations.
 */
export function LocationSearchField({
  id,
  value,
  onChange,
  placeholder,
  minChars = 1,
  maxSuggestions = 8,
  className = '',
  inputClassName = '',
  name,
  disabled = false,
  autoComplete = 'off',
  enterKeyHint = 'search',
  inputMode = 'text',
  'aria-label': ariaLabel,
  type = 'text',
}) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const suggestions = useMemo(
    () => (value.trim().length >= minChars ? suggestPlaces(value, maxSuggestions) : []),
    [value, minChars, maxSuggestions]
  )

  const showList = open && value.trim().length >= minChars && suggestions.length > 0

  useEffect(() => {
    setActiveIndex(-1)
  }, [value, suggestions.length])

  useEffect(() => {
    const onDoc = e => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = useCallback(
    label => {
      onChange(label)
      setOpen(false)
      setActiveIndex(-1)
    },
    [onChange]
  )

  const onKeyDown = e => {
    if (!showList) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        e.preventDefault()
        setOpen(true)
        setActiveIndex(0)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      pick(suggestions[activeIndex])
    }
  }

  const listId = id ? `${id}-suggestions` : 'location-suggestions'

  return (
    <div ref={rootRef} className={`${styles.root} ${className}`.trim()}>
      <input
        id={id}
        name={name}
        type={type}
        className={`${styles.input} ${inputClassName}`.trim()}
        value={value}
        onChange={e => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => value.trim().length >= minChars && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        enterKeyHint={enterKeyHint}
        inputMode={inputMode}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-haspopup="listbox"
      />
      {showList && (
        <ul id={listId} className={styles.list} role="listbox">
          {suggestions.map((label, i) => (
            <li key={label} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={`${styles.item} ${i === activeIndex ? styles.itemActive : ''}`.trim()}
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(label)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {highlightQuery(label, value.trim())}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
