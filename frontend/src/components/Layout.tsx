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
          <span className="text-sm text-muted-foreground truncate">{user?.name}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => logout.mutate()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="font-semibold text-foreground flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
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
            <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
              <h1 className="font-semibold text-foreground flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                TIX4SMB
              </h1>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-muted-foreground hover:text-foreground"
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
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-sidebar shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <Ticket className="h-4 w-4 text-primary" />
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
