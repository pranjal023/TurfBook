// Where to send a user after login customer, owner
export const landingFor = (user, from) => (user.role === 'customer' ? from ?? '/' : '/dashboard');