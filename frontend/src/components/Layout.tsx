import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Ticket, Settings, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets', icon: Ticket, label: 'Tickets' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
      void navigate('/login');
    },
  });

  const NavContent = () => (
    <>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:text-accent-foreground hover:bg-accent/80'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="h-6 w-6 rounded-full" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-xs">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-sm text-sidebar-foreground truncate">{user?.name}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground"
          onClick={() => logout.mutate()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
        <p className="text-center text-[10px] text-sidebar-foreground pt-2 tracking-wide">
          Developed by Aragrow, LLC
        </p>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex-col">
        <div
          className="p-4 border-b border-sidebar-border relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #3D0008 0%, #92000A 100%)' }}
        >
          {/* Gold top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #C4A044, #D4B84A, #C4A044)' }} />
          <h1 className="font-black text-white flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shadow-md" style={{ background: '#C4A044' }}>
              <Ticket className="h-4 w-4" style={{ color: '#3D0008' }} />
            </div>
            TIX4SMB
          </h1>
        </div>
        <NavContent />
      </aside>

      {/* ── Mobile overlay sidebar ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
            <div
              className="p-4 border-b border-sidebar-border flex items-center justify-between relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #3D0008 0%, #92000A 100%)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #C4A044, #D4B84A, #C4A044)' }} />
              <h1 className="font-black text-white flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center shadow-md" style={{ background: '#C4A044' }}>
                  <Ticket className="h-4 w-4" style={{ color: '#3D0008' }} />
                </div>
                TIX4SMB
              </h1>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavContent />
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center gap-3 px-4 py-3 border-b shrink-0 relative"
          style={{ background: 'linear-gradient(135deg, #3D0008 0%, #92000A 100%)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #C4A044, #D4B84A, #C4A044)' }} />
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white/70 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-black text-white flex items-center gap-2 text-sm">
            <div className="h-5 w-5 rounded flex items-center justify-center" style={{ background: '#C4A044' }}>
              <Ticket className="h-3 w-3" style={{ color: '#3D0008' }} />
            </div>
            TIX4SMB
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
