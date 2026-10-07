import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User } from '../../models/User.js';
import { Tenant } from '../../models/Tenant.js';
import { ROLES } from '../../config/permissions.js';
import { AppError } from '../../utils/AppError.js';
import { makeSlug } from '../../utils/slug.js';

const BCRYPT_COST = 12;

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

export async function registerCustomer({ name, email, password, phone }) {
  if (await User.exists({ email })) throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  return User.create({ name, email, phone, passwordHash, role: ROLES.CUSTOMER });
}

export async function registerTenant({ businessName, name, email, password, phone }) {
  if (await User.exists({ email })) throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  
  const tenantId = new mongoose.Types.ObjectId();

  const session = await mongoose.startSession();
  let user;
  try {
    
    await session.withTransaction(async () => {
      [user] = await User.create(
        [{ name, email, phone, passwordHash, role: ROLES.OWNER, tenantId }],
        { session }
      );
      await Tenant.create(
        [{ _id: tenantId, name: businessName, slug: makeSlug(businessName), ownerId: user._id }],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
  return user;
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const passwordOk = await bcrypt.compare(password, hash);

  
  if (!user || !passwordOk || !user.isActive) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  return user;
}