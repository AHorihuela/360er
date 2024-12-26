import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Users, ClipboardList, LogOut, Menu, X } from 'lucide-react';
import { getVersion } from '@/lib/version';

interface MainLayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Employees', path: '/employees', icon: <Users className="h-4 w-4" /> },
  { label: 'Reviews', path: '/reviews', icon: <ClipboardList className="h-4 w-4" /> },
];

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || null);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-gray-950/80">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              FuboLens
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className={`text-sm font-medium ${location.pathname === '/dashboard' ? 'text-primary dark:text-primary-light' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutDashboard className="h-4 w-4 inline-block mr-1" />
                Dashboard
              </Link>
              <Link
                to="/employees"
                className={`text-sm font-medium ${location.pathname === '/employees' ? 'text-primary dark:text-primary-light' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Users className="h-4 w-4 inline-block mr-1" />
                Employees
              </Link>
              <Link
                to="/reviews"
                className={`text-sm font-medium ${location.pathname === '/reviews' ? 'text-primary dark:text-primary-light' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <ClipboardList className="h-4 w-4 inline-block mr-1" />
                Reviews
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{userEmail}</span>
            <Button variant="ghost" onClick={handleSignOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-14 z-50 bg-background md:hidden">
          <nav className="container grid gap-2 p-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center space-x-2 rounded-md p-2 text-sm transition-colors hover:bg-muted",
                  isActive(item.path) ? "bg-muted font-medium" : "text-muted-foreground"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
            {userEmail && (
              <Button variant="ghost" className="justify-start" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            )}
          </nav>
        </div>
      )}

      <main className="container mx-auto py-6">
        {children}
      </main>

      <footer className="mt-auto border-t">
        <div className="container flex h-14 items-center justify-between text-sm text-muted-foreground">
          <span>© 2024 360° Feedback. All rights reserved.</span>
          <span className="text-xs">{getVersion()}</span>
        </div>
      </footer>
    </div>
  );
} 