const uid = () => Math.random().toString(36).slice(2);

export const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);

export const newUnit = () => ({ uid: uid(), key: '', name: '', price: '', blocks: [], locked: false });
export const newPeakRule = () => ({ uid: uid(), startTime: '18:00', endTime: '22:00', surchargePercent: 20 });

export const emptyForm = () => ({
  name: '', description: '',
  line1: '', area: '', city: '', state: '', pincode: '',
  lat: '', lng: '',
  sports: [], facilities: [],
  units: [newUnit()],
  openTime: '06:00', closeTime: '23:00', slotDurationMinutes: 60,
  weekendSurchargePercent: 0, peakRules: [],
  status: 'active',
});


export const turfToForm = (t) => ({
  name: t.name, description: t.description ?? '',
  line1: t.address.line1, area: t.address.area ?? '', city: t.address.city,
  state: t.address.state, pincode: t.address.pincode,
  lat: String(t.location.coordinates[1]), lng: String(t.location.coordinates[0]), 
  sports: t.sports, facilities: t.facilities, 
  units: t.units.map((u) => ({ uid: u._id, key: u.key, name: u.name, price: String(u.basePrice / 100), blocks: u.blocks, locked: true })),
  openTime: t.openTime, closeTime: t.closeTime, slotDurationMinutes: t.slotDurationMinutes,
  weekendSurchargePercent: t.pricing?.weekendSurchargePercent ?? 0,
  peakRules: (t.pricing?.peakRules ?? []).map((r) => ({ uid: uid(), ...r })),
  status: t.status,
});


export function formToPayload(f, isEdit) {
  const keys = f.units.map((u) => u.key);
  return {
    name: f.name.trim(),
    description: f.description.trim(),
    address: {
      line1: f.line1.trim(), area: f.area.trim(), city: f.city.trim(),
      state: f.state.trim(), pincode: f.pincode.trim(),
    },
    location: { lat: Number(f.lat), lng: Number(f.lng) },
    sports: f.sports,
    facilities: f.facilities,
    units: f.units.map((u) => ({
      key: u.key,
      name: u.name.trim(),
      basePrice: Math.round(Number(u.price) * 100),
      blocks: u.blocks.filter((b) => keys.includes(b)),
    })),
    openTime: f.openTime,
    closeTime: f.closeTime,
    slotDurationMinutes: Number(f.slotDurationMinutes),
    pricing: {
      weekendSurchargePercent: Number(f.weekendSurchargePercent) || 0,
      peakRules: f.peakRules.map((r) => ({
        startTime: r.startTime, endTime: r.endTime, surchargePercent: Number(r.surchargePercent) || 0,
      })),
    },
    ...(isEdit && { status: f.status }),
  };
}