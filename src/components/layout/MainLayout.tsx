import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Users, ClipboardList, LogOut, Menu, X } from 'lucide-react';

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
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link className="mr-6 flex items-center space-x-2" to="/dashboard">
              <span className="font-bold">360° Feedback</span>
            </Link>
            <nav className="flex items-center space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "inline-flex items-center space-x-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                    isActive(item.path) ? "bg-muted font-medium" : "text-muted-foreground"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <Button
            variant="ghost"
            className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>

          <div className="flex flex-1 items-center justify-end space-x-4">
            {userEmail && (
              <div className="hidden items-center space-x-4 sm:flex">
                <span className="text-sm text-muted-foreground">{userEmail}</span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            )}
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
        <div className="container flex h-14 items-center text-sm text-muted-foreground">
          © 2024 360° Feedback. All rights reserved.
        </div>
      </footer>
    </div>
  );
} 