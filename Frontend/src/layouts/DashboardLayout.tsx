import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Home, Building, Users, CreditCard, Wrench, Settings, LogOut, Menu, X } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['ADMIN', 'OWNER', 'TENANT'] },
    { name: 'Properties', href: '/properties', icon: Building, roles: ['ADMIN', 'OWNER'] },
    { name: 'Tenants', href: '/tenants', icon: Users, roles: ['ADMIN', 'OWNER'] },
    { name: 'Payments', href: '/payments', icon: CreditCard, roles: ['ADMIN', 'OWNER', 'TENANT'] },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['ADMIN', 'OWNER', 'TENANT'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'OWNER', 'TENANT'] },
  ];

  const filteredNav = navigation.filter(item => item.roles.includes(user?.role as string));

  const NavLinks = () => (
    <>
      {filteredNav.map((item) => {
        const isActive = location.pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 mx-4 my-1 rounded-xl transition-colors ${
              isActive 
                ? 'bg-blue-700/50 text-white font-medium' 
                : 'text-blue-100 hover:bg-blue-700/30'
            }`}
          >
            <Icon className="w-5 h-5" />
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-primary text-white shadow-xl z-20">
        <div className="flex items-center gap-3 px-6 h-20 mb-4">
          <Building className="w-8 h-8" />
          <span className="text-2xl font-bold tracking-tight">Nestly</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <NavLinks />
        </nav>

        <div className="p-4 mt-auto border-t border-blue-700/50">
          <div className="px-4 py-3 text-sm text-blue-100 mb-2 truncate">
            {user?.email}
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-blue-100 hover:bg-blue-700/30 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-primary text-white z-50 transform transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 h-20 mb-4 border-b border-blue-700/50">
          <div className="flex items-center gap-3">
            <Building className="w-8 h-8" />
            <span className="text-2xl font-bold">Nestly</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <NavLinks />
        </nav>

        <div className="p-4 mt-auto border-t border-blue-700/50">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-blue-100 hover:bg-blue-700/30 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 h-16 bg-white border-b">
          <div className="flex items-center gap-3">
            <Building className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-primary">Nestly</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
