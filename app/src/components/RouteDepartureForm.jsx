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
    // operating_hours like "07:00-15:00", "7:00 AM – 3:00 PM" or "6:30 – 9:00".
    // A format we can't read (e.g. "TBD") skips the check rather than blocking staff.
    const toMinutes = (text) => {
      const m = text.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (!m) return null;
      let hours = Number(m[1]);
      if (m[3]) hours = (hours % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
      return hours * 60 + Number(m[2]);
    };
    if (route.operating_hours) {
      const [start, end] = route.operating_hours.split(/[-–—]/).map(toMinutes);
      const chosen = toMinutes(time);
      if (start !== null && end !== null && (chosen < start || chosen > end)) {
        setErrorMsg(`This route runs ${route.operating_hours}.`);
        return false;
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
