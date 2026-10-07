import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import { emptyForm, formToPayload, newPeakRule, newUnit, slugify, turfToForm } from '../lib/turfForm';
import { label } from '../lib/format';
import Field, { inputClass } from './Field';
import TimeSelect from './TimeSelect';

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

const Section = ({ title, hint, children }) => (
  <section className="space-y-3 rounded-xl border bg-white p-4">
    <div>
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
    {children}
  </section>
);

function Chips({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button type="button" key={o} onClick={() => onToggle(o)}
          className={`rounded-full border px-3 py-1 text-sm ${selected.includes(o) ? 'border-green-600 bg-green-50 text-green-800' : 'hover:bg-gray-50'}`}>
          {label(o)}
        </button>
      ))}
    </div>
  );
}

export default function TurfForm({ initial, isEdit = false, onSubmit, isPending, error }) {
  const [f, setF] = useState(() => (initial ? turfToForm(initial) : emptyForm()));
  const [localError, setLocalError] = useState('');

  
  const meta = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.get('/public/meta').then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  const set = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.value }));

  // ---- units ----
  const patchUnit = (i, patch) =>
    setF((s) => {
      const oldKey = s.units[i].key;
      let units = s.units.map((u, idx) => (idx === i ? { ...u, ...patch } : u));
      const newKey = units[i].key;
      // If this unit's key changed, other units that block it must follow
      if (oldKey !== newKey) {
        units = units.map((u) => ({ ...u, blocks: u.blocks.map((b) => (b === oldKey ? newKey : b)) }));
      }
      return { ...s, units };
    });

  const renameUnit = (i, name) =>
    patchUnit(i, f.units[i].locked ? { name } : { name, key: slugify(name) });

  const removeUnit = (i) =>
    setF((s) => {
      const gone = s.units[i].key;
      return {
        ...s,
        units: s.units.filter((_, idx) => idx !== i).map((u) => ({ ...u, blocks: u.blocks.filter((b) => b !== gone) })),
      };
    });

  // ---- peak rules ----
  const patchRule = (i, patch) =>
    setF((s) => ({ ...s, peakRules: s.peakRules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));

  const useMyLocation = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setF((s) => ({ ...s, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })),
      () => setLocalError('Could not get your location. Enter the coordinates manually.')
    );

  const submit = (e) => {
    e.preventDefault();
    setLocalError('');
    if (f.sports.length === 0) return setLocalError('Pick at least one sport.');
    onSubmit(formToPayload(f, isEdit));
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Section title="Basics">
        <Field label="Turf name" required value={f.name} onChange={set('name')} />
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Description</span>
          <textarea rows={3} maxLength={1000} value={f.description} onChange={set('description')} className={inputClass} />
        </label>
        {isEdit && (
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <select value={f.status} onChange={set('status')} className={inputClass}>
              <option value="active">Active (bookable)</option>
              <option value="inactive">Paused (hidden from customers)</option>
            </select>
          </label>
        )}
      </Section>

      <Section title="Address and location">
        <Field label="Address line" required value={f.line1} onChange={set('line1')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Area / locality" value={f.area} onChange={set('area')} />
          <Field label="City" required value={f.city} onChange={set('city')} />
          <Field label="State" required value={f.state} onChange={set('state')} />
          <Field label="Pincode" required inputMode="numeric" maxLength={6} value={f.pincode} onChange={set('pincode')} />
          <Field label="Latitude" required type="number" step="any" value={f.lat} onChange={set('lat')} />
          <Field label="Longitude" required type="number" step="any" value={f.lng} onChange={set('lng')} />
        </div>
        <button type="button" onClick={useMyLocation} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
          📍 Use my current location
        </button>
      </Section>

      <Section title="Sports and facilities">
        <p className="text-sm font-medium text-gray-700">Sports</p>
        <Chips options={meta.data?.sports ?? []} selected={f.sports} onToggle={(v) => setF((s) => ({ ...s, sports: toggle(s.sports, v) }))} />
        <p className="pt-2 text-sm font-medium text-gray-700">Facilities</p>
        <Chips options={meta.data?.facilities ?? []} selected={f.facilities} onToggle={(v) => setF((s) => ({ ...s, facilities: toggle(s.facilities, v) }))} />
      </Section>

      <Section title="Bookable units"
        hint="A simple turf has one unit. A splittable ground has e.g. 'Full ground' (blocks both halves) plus 'Half A' and 'Half B'.">
        {f.units.map((u, i) => {
          const others = f.units.filter((_, idx) => idx !== i);
          return (
            <div key={u.uid} className="space-y-3 rounded-lg border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" required value={u.name} onChange={(e) => renameUnit(i, e.target.value)} />
                <Field label="Base price per slot (₹)" required type="number" min="0" step="1" value={u.price}
                  onChange={(e) => patchUnit(i, { price: e.target.value })} />
              </div>
              <p className="text-xs text-gray-500">
                Key: <code>{u.key || '—'}</code>{u.locked && ' · locked, because past bookings reference it'}
              </p>
              {others.length > 0 && (
                <div>
                  <p className="text-sm text-gray-700">When this unit is booked, also block:</p>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {others.map((o) => (
                      <label key={o.uid} className="flex items-center gap-1 text-sm">
                        <input type="checkbox" checked={u.blocks.includes(o.key)} disabled={!o.key}
                          onChange={() => patchUnit(i, { blocks: toggle(u.blocks, o.key) })} />
                        {o.name || '(unnamed)'}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {f.units.length > 1 && !u.locked && (
                <button type="button" onClick={() => removeUnit(i)} className="text-sm text-red-700 underline">Remove unit</button>
              )}
            </div>
          );
        })}
        <button type="button" onClick={() => setF((s) => ({ ...s, units: [...s.units, newUnit()] }))}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">+ Add unit</button>
      </Section>

      <Section title="Hours and slots" hint="Opening hours must fit a whole number of slots (e.g. 06:00–23:00 with 60-minute slots).">
        <div className="grid gap-3 sm:grid-cols-3">
          <TimeSelect label="Opens" value={f.openTime} onChange={(v) => setF((s) => ({ ...s, openTime: v }))} />
          <TimeSelect label="Closes" allowMidnight value={f.closeTime} onChange={(v) => setF((s) => ({ ...s, closeTime: v }))} />
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Slot length</span>
            <select value={f.slotDurationMinutes} onChange={set('slotDurationMinutes')} className={inputClass}>
              {[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </label>
        </div>
      </Section>

      <Section title="Pricing rules" hint="Surcharges are percentages added to the base price. A slot gets the weekend surcharge plus the best matching peak rule.">
        <Field label="Weekend surcharge (%)" type="number" min="0" max="300" step="1"
          value={f.weekendSurchargePercent} onChange={set('weekendSurchargePercent')} />
        {f.peakRules.map((r, i) => (
          <div key={r.uid} className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
            <TimeSelect label="Peak from" value={r.startTime} onChange={(v) => patchRule(i, { startTime: v })} />
            <TimeSelect label="Peak to" allowMidnight value={r.endTime} onChange={(v) => patchRule(i, { endTime: v })} />
            <Field label="Surcharge (%)" type="number" min="0" max="300" step="1" value={r.surchargePercent}
              onChange={(e) => patchRule(i, { surchargePercent: e.target.value })} />
            <button type="button" onClick={() => setF((s) => ({ ...s, peakRules: s.peakRules.filter((_, idx) => idx !== i) }))}
              className="pb-2 text-sm text-red-700 underline">Remove</button>
          </div>
        ))}
        {f.peakRules.length < 5 && (
          <button type="button" onClick={() => setF((s) => ({ ...s, peakRules: [...s.peakRules, newPeakRule()] }))}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">+ Add peak rule</button>
        )}
      </Section>

      {(localError || error) && <p className="text-sm text-red-600">{localError || errorMessage(error)}</p>}
      <button disabled={isPending}
        className="rounded-lg bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-60">
        {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create turf'}
      </button>
    </form>
  );
}