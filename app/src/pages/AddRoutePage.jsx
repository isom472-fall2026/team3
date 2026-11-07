import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

function AddRoutePage() {
  const [name, setName] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [operatingHours, setOperatingHours] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    const trimmedName = name.trim()
    const trimmedHours = operatingHours.trim()

    const newErrors = {}
    if (!trimmedName) {
      newErrors.name = 'Enter a route name.'
    }
    if (!serviceType) {
      newErrors.serviceType = 'Choose on campus or off campus.'
    }
    if (trimmedHours) {
      const m = trimmedHours.match(/^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/)
      if (!m) {
        newErrors.hours = 'Write hours like 07:00 - 16:00.'
      } else {
        const startH = Number(m[1])
        const startM = Number(m[2])
        const endH = Number(m[3])
        const endM = Number(m[4])
        const validTime = startH < 24 && startM < 60 && endH < 24 && endM < 60
        const startTotal = startH * 60 + startM
        const endTotal = endH * 60 + endM
        if (!validTime || startTotal >= endTotal) {
          newErrors.hours = 'Write hours like 07:00 - 16:00.'
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)

    const { data: existingRoutes } = await supabase
      .from('routes')
      .select('name')

    const isDuplicate = existingRoutes?.some(
      (r) => (r.name ?? '').trim().toLowerCase() === trimmedName.toLowerCase()
    )

    if (isDuplicate) {
      setSaving(false)
      setErrors({ name: 'This route name is already in use.' })
      return
    }

    setErrors({})

    const { error: insertError } = await supabase.from('routes').insert([
      {
        name: trimmedName,
        service_type: serviceType,
        operating_hours: trimmedHours || null,
        is_active: true,
      },
    ])

    setSaving(false)

    if (insertError) {
      if (
        insertError.code === '23505' ||
        insertError.message?.toLowerCase().includes('unique') ||
        insertError.message?.toLowerCase().includes('already exists')
      ) {
        setErrors({ name: 'This route name is already in use.' })
        return
      }
      setError(insertError.message)
      return
    }

    setMessage(`Route added. Students now see ${trimmedName}.`)
    setName('')
    setServiceType('')
    setOperatingHours('')
  }

  return (
    <div className="bus-confirmed-section" id="add-route-page">
      <div className="bus-content-intro">
        <h2>Add a Route</h2>
        <p>Add a new bus route with its service type and operating hours.</p>
      </div>

      {message && (
        <div className="alert alert-success" role="alert" id="add-route-success">
          <div>{message}</div>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert" id="add-route-error">
          <div>{error}</div>
        </div>
      )}

      <form id="f-route" className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className={`form-group ${errors.name ? 'bad' : ''}`} data-f="name">
          <label htmlFor="r-name">Route name</label>
          <input
            id="r-name"
            type="text"
            placeholder="For example, South route"
            value={name}
            style={{ borderColor: errors.name ? 'var(--error-text)' : undefined }}
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
            }}
          />
          {errors.name && (
            <div
              className="field-error msg"
              id="r-name-error"
              style={{ color: 'var(--error-text)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
            >
              {errors.name}
            </div>
          )}
        </div>

        <div className={`form-group ${errors.serviceType ? 'bad' : ''}`} data-f="type">
          <label>Where it runs</label>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 400, cursor: 'pointer' }}>
              <input
                type="radio"
                name="rtype"
                value="on_campus"
                checked={serviceType === 'on_campus'}
                onChange={(e) => {
                  setServiceType(e.target.value)
                  if (errors.serviceType) setErrors((prev) => ({ ...prev, serviceType: '' }))
                }}
              />
              On campus
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 400, cursor: 'pointer' }}>
              <input
                type="radio"
                name="rtype"
                value="off_campus"
                checked={serviceType === 'off_campus'}
                onChange={(e) => {
                  setServiceType(e.target.value)
                  if (errors.serviceType) setErrors((prev) => ({ ...prev, serviceType: '' }))
                }}
              />
              Off campus
            </label>
          </div>
          {errors.serviceType && (
            <div
              className="field-error msg"
              id="r-type-error"
              style={{ color: 'var(--error-text)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
            >
              {errors.serviceType}
            </div>
          )}
        </div>

        <div className={`form-group ${errors.hours ? 'bad' : ''}`} data-f="hours">
          <label htmlFor="r-hours">
            Operating hours <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
          </label>
          <input
            id="r-hours"
            type="text"
            placeholder="07:00 - 16:00"
            value={operatingHours}
            style={{ borderColor: errors.hours ? 'var(--error-text)' : undefined }}
            onChange={(e) => {
              setOperatingHours(e.target.value)
              if (errors.hours) setErrors((prev) => ({ ...prev, hours: '' }))
            }}
          />
          {errors.hours && (
            <div
              className="field-error msg"
              id="r-hours-error"
              style={{ color: 'var(--error-text)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
            >
              {errors.hours}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving} id="add-route-submit">
          {saving ? 'Saving…' : 'Add route'}
        </button>
      </form>
    </div>
  )
}

export default AddRoutePage

