import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, LayoutDashboard, FolderGit2, ScanSearch,
  FileText, Settings, LogOut, Crown,
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  ];

  const isActive = (path) => location.pathname === path;

  const planColors = {
    trial: 'secondary',
    pro: 'default',
    enterprise: 'outline',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Shield className="h-6 w-6 text-primary" />
            <span className="bg-gradient-to-r from-primary to-neon-blue bg-clip-text text-transparent">
              SafeYou
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Badge variant={planColors[user?.plan] || 'secondary'} className="gap-1">
              {user?.plan === 'enterprise' && <Crown className="h-3 w-3" />}
              {user?.plan?.toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { logout(); navigate('/'); }}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-14 min-h-screen">
        <div className="container mx-auto px-4 py-6 lg:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
