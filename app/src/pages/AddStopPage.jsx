import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

function AddStopPage() {
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [geofenceRadiusM, setGeofenceRadiusM] = useState('50')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    const newErrors = {}
    if (!name.trim()) {
      newErrors.name = "Enter the stop's name."
    }

    const trimmedLat = latitude.trim()
    const trimmedLng = longitude.trim()

    if (!trimmedLat) {
      newErrors.latitude = 'Enter a latitude.'
    } else {
      const latN = Number(trimmedLat)
      if (isNaN(latN) || latN < 28.5 || latN > 30.1) {
        newErrors.latitude = 'This point is not in Kuwait.'
      }
    }

    if (!trimmedLng) {
      newErrors.longitude = 'Enter a longitude.'
    } else {
      const lngN = Number(trimmedLng)
      if (isNaN(lngN) || lngN < 46.5 || lngN > 48.5) {
        if (newErrors.latitude !== 'This point is not in Kuwait.') {
          newErrors.longitude = 'This point is not in Kuwait.'
        }
      }
    }

    const trimmedRad = String(geofenceRadiusM).trim()
    const radN = Number(trimmedRad)
    if (!/^\d+$/.test(trimmedRad) || radN < 10 || radN > 500) {
      newErrors.geofenceRadius = 'Radius must be 10–500 metres.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setSaving(true)

    const { error: insertError } = await supabase.from('stops').insert([
      {
        name: name.trim(),
        area: area.trim() || null,
        latitude: Number(latitude),
        longitude: Number(longitude),
        geofence_radius_m: Number(geofenceRadiusM),
      },
    ])

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setMessage('Stop added. It shows in stop search now.')
    setName('')
    setArea('')
    setLatitude('')
    setLongitude('')
    setGeofenceRadiusM('50')
  }

  return (
    <div className="bus-confirmed-section" id="add-stop-page">
      <div className="bus-content-intro">
        <h2>Add a Stop</h2>
        <p>Add a bus stop with its location.</p>
      </div>

      {message && (
        <div className="alert alert-success" role="alert" id="add-stop-success">
          <div>{message}</div>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert" id="add-stop-error">
          <div>{error}</div>
        </div>
      )}

      <form id="f-stop" className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className={`form-group ${errors.name ? 'bad' : ''}`} data-f="name">
          <label htmlFor="s-name">Stop name</label>
          <input
            id="s-name"
            type="text"
            placeholder="For example, Central Library"
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
              id="s-name-error"
              style={{ color: 'var(--error-text)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
            >
              {errors.name}
            </div>
          )}
        </div>

        <div className="form-group" data-f="area">
          <label htmlFor="s-area">Area (optional)</label>
          <input
            id="s-area"
            type="text"
            placeholder="For example, Main entrance"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </div>

        <div className={`form-group ${errors.latitude ? 'bad' : ''}`} data-f="lat">
          <label htmlFor="s-lat">Latitude</label>
          <input
            id="s-lat"
            type="text"
            inputMode="decimal"
            placeholder="29.2576"
            value={latitude}
            style={{ borderColor: errors.latitude ? 'var(--error-text)' : undefined }}
            onChange={(e) => {
              setLatitude(e.target.value)
              if (errors.latitude) setErrors((prev) => ({ ...prev, latitude: '' }))
            }}
          />
          {errors.latitude && (
            <div
              className="field-error msg"
              id="s-lat-error"
              style={{ color: 'var(--error-text)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
            >
              {errors.latitude}
            </div>
          )}
        </div>

        <div className={`form-group ${errors.longitude ? 'bad' : ''}`} data-f="lng">
          <label htmlFor="s-lng">Longitude</label>
          <input
            id="s-lng"
            type="text"
            inputMode="decimal"
            placeholder="47.8998"
            value={longitude}
            style={{ borderColor: errors.longitude ? 'var(--error-text)' : undefined }}
            onChange={(e) => {
              setLongitude(e.target.value)
              if (errors.longitude) setErrors((prev) => ({ ...prev, longitude: '' }))
            }}
          />
          {errors.longitude && (
            <div
              className="field-error msg"
              id="s-lng-error"
              style={{ color: 'var(--error-text)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
            >
              {errors.longitude}
            </div>
          )}
        </div>

        <div className={`form-group ${errors.geofenceRadius ? 'bad' : ''}`} data-f="rad">
          <label htmlFor="s-rad">Arrival radius in metres</label>
          <input
            id="s-rad"
            type="text"
            inputMode="numeric"
            value={geofenceRadiusM}
            style={{ borderColor: errors.geofenceRadius ? 'var(--error-text)' : undefined }}
            onChange={(e) => {
              setGeofenceRadiusM(e.target.value)
              if (errors.geofenceRadius) setErrors((prev) => ({ ...prev, geofenceRadius: '' }))
            }}
          />
          <div className="field-hint">A bus inside this circle counts as at the stop.</div>
          {errors.geofenceRadius && (
            <div
              className="field-error msg"
              id="s-rad-error"
              style={{ color: 'var(--error-text)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
            >
              {errors.geofenceRadius}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving} id="add-stop-submit">
          {saving ? 'Saving…' : 'Add stop'}
        </button>
      </form>
    </div>
  )
}

export default AddStopPage
