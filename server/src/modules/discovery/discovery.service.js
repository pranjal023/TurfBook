import { Turf } from '../../models/Turf.js';
import { Tenant } from '../../models/Tenant.js';
import { SPORTS, FACILITIES } from '../../config/catalog.js';
import { AppError } from '../../utils/AppError.js';
import { distanceKm } from '../../utils/geo.js';

const EARTH_RADIUS_KM = 6378.1; 


const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { minPrice: 1, _id: 1 },     
  price_desc: { minPrice: -1, _id: 1 },
};


const LIST_FIELDS =
  'tenantId name address location sports facilities images minPrice units.basePrice openTime closeTime slotDurationMinutes';


const cheapest = (t) =>
  t.minPrice > 0 ? t.minPrice : Math.min(...(t.units ?? []).map((u) => u.basePrice));

export async function searchTurfs(p) {
  const filter = { status: 'active' };

  if (p.city) filter['address.city'] = new RegExp(`^${escapeRegex(p.city)}$`, 'i');
  if (p.q) {
    const rx = new RegExp(escapeRegex(p.q), 'i');
    filter.$or = [{ name: rx }, { 'address.area': rx }, { 'address.city': rx }];
  }
  if (p.sport) filter.sports = p.sport;
  if (p.facilities?.length) filter.facilities = { $all: p.facilities }; 
  if (p.minPrice !== undefined || p.maxPrice !== undefined) {
    filter.minPrice = {};
    if (p.minPrice !== undefined) filter.minPrice.$gte = p.minPrice;
    if (p.maxPrice !== undefined) filter.minPrice.$lte = p.maxPrice;
  }


  const hasGeo = p.lat !== undefined;
  const point = hasGeo ? { type: 'Point', coordinates: [p.lng, p.lat] } : null;
  const findFilter = hasGeo
    ? { ...filter, location: { $near: { $geometry: point, $maxDistance: p.radiusKm * 1000 } } }
    : filter;
  const countFilter = hasGeo
    ? { ...filter, location: { $geoWithin: { $centerSphere: [point.coordinates, p.radiusKm / EARTH_RADIUS_KM] } } }
    : filter;

  let query = Turf.find(findFilter).select(LIST_FIELDS).setOptions({ skipTenant: true });
  if (!hasGeo) query = query.sort(SORTS[p.sort]); 

  const [rows, total] = await Promise.all([
    query.skip((p.page - 1) * p.limit).limit(p.limit).lean(),
    Turf.countDocuments(countFilter).setOptions({ skipTenant: true }),
  ]);

  // Attach business names with ONE extra query instead of one per turf
  const tenants = await Tenant.find({ _id: { $in: [...new Set(rows.map((r) => String(r.tenantId)))] } })
    .select('name')
    .lean();
  const nameOf = new Map(tenants.map((t) => [String(t._id), t.name]));

  return {
    turfs: rows.map((t) => ({
      id: t._id,
      name: t.name,
      address: t.address,
      location: { lat: t.location.coordinates[1], lng: t.location.coordinates[0] },
      sports: t.sports,
      facilities: t.facilities,
      image: t.images[0]?.url ?? null,
      minPrice: cheapest(t),
      openTime: t.openTime,
      closeTime: t.closeTime,
      slotDurationMinutes: t.slotDurationMinutes,
      business: { name: nameOf.get(String(t.tenantId)) ?? null },
      distanceKm: hasGeo
        ? Math.round(distanceKm(p.lat, p.lng, t.location.coordinates[1], t.location.coordinates[0]) * 10) / 10
        : undefined,
    })),
    page: p.page,
    limit: p.limit,
    total,
    totalPages: Math.ceil(total / p.limit),
  };
}

export async function getPublicTurf(id) {
  const turf = await Turf.findOne({ _id: id, status: 'active' }).setOptions({ skipTenant: true }).lean();
  if (!turf) throw new AppError('Turf not found', 404, 'TURF_NOT_FOUND');

  const tenant = await Tenant.findById(turf.tenantId).select('name slug status').lean();
  if (!tenant || tenant.status !== 'active') throw new AppError('Turf not found', 404, 'TURF_NOT_FOUND');

  const { tenantId, __v, ...publicFields } = turf; 
  return {
    ...publicFields,
    minPrice: cheapest(turf),
    location: { lat: turf.location.coordinates[1], lng: turf.location.coordinates[0] },
    business: { name: tenant.name, slug: tenant.slug },
  };
}

export async function getMeta() {
  const cities = await Turf.distinct('address.city', { status: 'active' }).setOptions({ skipTenant: true });
  return { sports: SPORTS, facilities: FACILITIES, cities: cities.sort() };
}