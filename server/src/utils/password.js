import bcrypt from 'bcrypt';

export const hashPassword = (plain) => bcrypt.hash(plain, 12); 