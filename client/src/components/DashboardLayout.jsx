import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/turfs', label: 'Turfs', permission: 'turf:read' },
  { to: '/dashboard/bookings', label: 'Bookings', permission: 'booking:read' },
  { to: '/dashboard/analytics', label: 'Analytics', permission: 'analytics:view' },
  { to: '/dashboard/staff', label: 'Staff', permission: 'staff:read' },
];

export default function DashboardLayout() {
  const { can } = useAuth();
  const items = NAV.filter((i) => !i.permission || can(i.permission)); 
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <aside className="md:w-44 md:shrink-0">
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-green-100 font-medium text-green-800' : 'text-gray-700 hover:bg-gray-100'}`}>
              {i.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="min-w-0 flex-1"><Outlet /></section>
    </div>
  );
}