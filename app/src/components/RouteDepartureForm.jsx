import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

function RouteDepartureForm({ route }) {
  const [time, setTime] = useState('');
  const [days, setDays] = useState({ Sun: false, Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false });
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const dayNames = Object.keys(days);

  const handleDayToggle = (day) => {
    setDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const validate = () => {
    if (!time) {
      setErrorMsg('Enter a departure time.');
      return false;
    }
    const selectedDays = dayNames.filter((d) => days[d]);
    if (selectedDays.length === 0) {
      setErrorMsg('Tick at least one day.');
      return false;
    }
    // operating_hours validation – simple inclusion check
    if (route.operating_hours) {
      // Assume operating_hours is a string like "08:00-18:00"
      const [start, end] = route.operating_hours.split('-').map((s) => s.trim());
      if (start && end) {
        if (time < start || time > end) {
          setErrorMsg(`This route runs ${route.operating_hours}.`);
          return false;
        }
      }
    }
    setErrorMsg('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const selectedDays = dayNames.filter((d) => days[d]);
    const daysString = selectedDays.join(',');
    // Check for duplicate on client side (optional)
    const { data: existing } = await supabase
      .from('schedules')
      .select('id')
      .eq('route_id', route.id)
      .eq('planned_start_time', time)
      .eq('days_of_week', daysString)
      .maybeSingle();
    if (existing && existing.id) {
      setErrorMsg('This departure already exists.');
      setSaving(false);
      return;
    }
    const { error } = await supabase.from('schedules').insert({
      route_id: route.id,
      planned_start_time: time,
      days_of_week: daysString,
    });
    if (error) {
      setErrorMsg(error.message);
    } else {
      // clear form
      setTime('');
      setDays({ Sun: false, Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false });
    }
    setSaving(false);
  };

  return (
    <form className="departure-form" onSubmit={handleSubmit} style={{ marginTop: '0.5rem' }}>
      <div>
        <label>
          Time:
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={saving} />
        </label>
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        Days:
        {dayNames.map((d) => (
          <label key={d} style={{ marginRight: '0.5rem' }}>
            <input
              type="checkbox"
              checked={days[d]}
              onChange={() => handleDayToggle(d)}
              disabled={saving}
            />
            {d}
          </label>
        ))}
      </div>
      {errorMsg && <div className="alert alert-error" role="alert" style={{ marginTop: '0.5rem' }}>{errorMsg}</div>}
      <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '0.5rem' }}>
        {saving ? 'Saving...' : 'Add Departure'}
      </button>
    </form>
  );
}

export default RouteDepartureForm;
