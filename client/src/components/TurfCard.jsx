import { Link } from 'react-router-dom';
import { formatPrice, label } from '../lib/format';

export default function TurfCard({ turf }) {
  return (
    <Link
      to={`/turfs/${turf.id}`}
      className="block overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md"
    >
      {turf.image ? (
        <img src={turf.image} alt={turf.name} className="h-40 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-40 items-center justify-center bg-green-50 text-4xl">⚽</div>
      )}
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{turf.name}</h3>
          {turf.distanceKm !== undefined && (
            <span className="shrink-0 text-xs text-gray-500">{turf.distanceKm} km</span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {[turf.address.area, turf.address.city].filter(Boolean).join(', ')}
        </p>
        <div className="flex flex-wrap gap-1">
          {turf.sports.map((s) => (
            <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{label(s)}</span>
          ))}
        </div>
        <p className="text-sm">
          From <b>{formatPrice(turf.minPrice)}</b> <span className="text-gray-500">/ slot</span>
        </p>
      </div>
    </Link>
  );
}