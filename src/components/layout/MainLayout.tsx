import { ReactNode, useState, createContext, useContext } from 'react';
import { SidebarDemo } from '@/components/ui/SidebarDemo';

interface MainLayoutProps {
  children: ReactNode;
}

interface MobileMenuContextType {
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
}

const MobileMenuContext = createContext<MobileMenuContextType | undefined>(undefined);

export const useMobileMenu = () => {
  const context = useContext(MobileMenuContext);
  if (!context) {
    throw new Error('useMobileMenu must be used within MainLayout');
  }
  return context;
};

export function MainLayout({ children }: MainLayoutProps): JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const toggleMobileMenu = () => {
    const newMobileMenuState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newMobileMenuState);
    // When opening mobile menu, also expand the sidebar
    if (newMobileMenuState) {
      setSidebarExpanded(true);
    }
  };
  
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setSidebarExpanded(false);
  };

  return (
    <MobileMenuContext.Provider value={{ 
      isMobileMenuOpen, 
      toggleMobileMenu, 
      closeMobileMenu, 
      sidebarExpanded, 
      setSidebarExpanded 
    }}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Mobile Overlay - only when menu is open */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={closeMobileMenu}
          />
        )}

        {/* Sidebar - hidden on mobile by default, normal on desktop */}
        <div className={`
          ${isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 w-64' : 'hidden md:block'} 
          h-full
        `}>
          <SidebarDemo 
            forceOpen={isMobileMenuOpen}
            sidebarExpanded={sidebarExpanded}
            setSidebarExpanded={setSidebarExpanded}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </MobileMenuContext.Provider>
  );
} 