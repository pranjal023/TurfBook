import { Turf } from '../../models/Turf.js';
import { AppError } from '../../utils/AppError.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { uploadBuffer, deleteImage, cloudinaryEnabled } from '../../config/cloudinary.js';

const MAX_IMAGES = 8;

const toGeoPoint = ({ lat, lng }) => ({ type: 'Point', coordinates: [lng, lat] }); 

export async function createTurf(input) {
  const { location, ...rest } = input;
  return Turf.create({ ...rest, location: toGeoPoint(location) }); 
}

export function listTurfs() {
  return Turf.find({ status: { $ne: 'archived' } }).sort({ createdAt: -1 });
}

export async function getTurf(id) {
  const turf = await Turf.findById(id); 
  if (!turf || turf.status === 'archived') throw new AppError('Turf not found', 404, 'TURF_NOT_FOUND');
  return turf;
}

export async function updateTurf(id, patch) {
  const turf = await getTurf(id);
  const { location, ...rest } = patch;
  turf.set(rest);
  if (location) turf.location = toGeoPoint(location);
  await turf.save(); 
  return turf;
}

export async function archiveTurf(id) {
  const turf = await getTurf(id);
  turf.status = 'archived'; 
  await turf.save();
}

export async function addImages(id, files = []) {
  if (!cloudinaryEnabled) throw new AppError('Image uploads are not configured', 503, 'UPLOADS_DISABLED');
  if (!files.length) throw new AppError('No images provided', 400, 'NO_FILES');

  const turf = await getTurf(id); // prove the turf is ours BEFORE spending bandwidth uploading
  if (turf.images.length + files.length > MAX_IMAGES) {
    throw new AppError(`A turf can have at most ${MAX_IMAGES} images`, 400, 'TOO_MANY_IMAGES');
  }

  const folder = `turfbook/${getTenantId()}/${turf._id}`; // each tenant gets its own folder
  const results = await Promise.all(files.map((f) => uploadBuffer(f.buffer, folder)));
  turf.images.push(...results.map((r) => ({ url: r.secure_url, publicId: r.public_id })));
  await turf.save();
  return turf;
}

export async function removeImage(id, imageId) {
  const turf = await getTurf(id);
  const image = turf.images.id(imageId);
  if (!image) throw new AppError('Image not found', 404, 'IMAGE_NOT_FOUND');

  await deleteImage(image.publicId);
  turf.images.pull(imageId);
  await turf.save();
  return turf;
}