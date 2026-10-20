import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Building2, Home, LogIn, LogOut, User, Shield, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    ...(user
      ? [
          { to: '/clubs', label: 'Clubs', icon: Users },
          { to: '/user', label: 'User', icon: User },
          ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
        ]
      : [{ to: '/login', label: 'Login', icon: LogIn }]),
  ];

  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-neutral-900 font-semibold text-lg tracking-tight">
          <Building2 className="w-5 h-5 text-neutral-900" />
          <span>ClubOS</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          {user && (
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
