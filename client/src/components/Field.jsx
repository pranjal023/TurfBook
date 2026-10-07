export const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600';

export default function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input {...props} className={inputClass} />
    </label>
  );
}