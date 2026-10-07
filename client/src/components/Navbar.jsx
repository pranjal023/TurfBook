import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, status, logout } = useAuth();
  const isStaff = user && user.role !== 'customer';
  const isCustomer = user?.role === 'customer';

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-green-700">TurfBook</Link>

        <div className="flex items-center gap-4 text-sm">
          {status === 'loading' ? null : user ? (
            <>
              {isCustomer && (
                <NavLink to="/my-bookings" className="text-gray-700 hover:text-green-700">
                  My bookings
                </NavLink>
              )}
              {isStaff && (
                <NavLink to="/dashboard" className="text-gray-700 hover:text-green-700">
                  Dashboard
                </NavLink>
              )}
              <span className="text-gray-500">Hi, {user.name.split(' ')[0]}</span>
              <button onClick={logout} className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/register-business" className="text-gray-700 hover:text-green-700">
                List your turf
              </Link>
              <Link to="/login" className="text-gray-700 hover:text-green-700">Log in</Link>
              <Link to="/register" className="rounded-lg bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}