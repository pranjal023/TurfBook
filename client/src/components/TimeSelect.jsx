import { inputClass } from './Field';

const TIMES = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);


export default function TimeSelect({ label, value, onChange, allowMidnight = false }) {
  const options = allowMidnight ? [...TIMES, '24:00'] : TIMES;
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    </label>
  );
}