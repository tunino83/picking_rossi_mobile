import React from 'react';
import { Home, BarChart2, Users, Settings, Package, LogOut, Box ,ListTodo,User, UserCircle, CheckCircle} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMenuStore } from '../store/menuStore';
import { useTranslation } from 'react-i18next';

const getNavigation = (role: string) => {
    // Normalize role to lowercase and map common aliases
    const r = (role || '').toLowerCase();
    const normalizedRole = r === 'wh' || r === 'warehouse' || r === 'warehouse_user' ? 'warehouse' : r;

    const items = [
    // { name: 'common.dashboard', icon: Home, path: '/', roles: ['admin', 'orders'] },
    // { name: 'common.users', icon: Users, path: '/users', roles: ['admin'] },
    // Make My Orders available to admin and warehouse on mobile
    { name: 'common.my_orders', icon: ListTodo, path: '/my-orders', roles: ['warehouse', 'orders', 'admin'] },
    // Inventory scanner for warehouse users
    { name: 'common.inventory', icon: Box, path: '/inventario', roles: ['warehouse', 'admin'] },
    // Close orders for orders_closer role
    { name: 'common.close_lists', icon: CheckCircle, path: '/close-orders', roles: [ 'orders_closer'] },
    // { name: 'common.settings', icon: Settings, path: '/settings', roles: ['admin'] },
  ];
  return items.filter((item) => item.roles.includes(normalizedRole));
};

export function Sidebar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { t } = useTranslation();
  const isOpen = useMenuStore((state) => state.isOpen);
  const closeMenu = useMenuStore((state) => state.close);
  const navigation = user ? getNavigation(user.role) : [];
  console.log('Sidebar render - isOpen=', isOpen, 'navigation=', navigation.map(i=>i.path));

  const handleNavigation = (path: string) => {
    navigate(path);
    closeMenu();
  };

  const handleSignOut = () => {
    signOut();
    closeMenu();
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed top-16 left-0 right-0 bottom-0 bg-gray-600 bg-opacity-75 z-20 md:hidden"
          onClick={closeMenu}
        />
      )}

      <div className={`
        fixed top-16 bottom-0 left-0 z-30 w-64 bg-white transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        min-h-[90vh]
      `}>
        {/* Debug: isOpen = {String(isOpen)} */}
        <div className="flex flex-col h-full">
          {/* Main navigation */}
          <div className="flex-1 flex flex-col pt-5 overflow-y-auto">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.path)}
                  className="flex items-center nav-btn px-4 py-3 text-lg font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 group w-full"
                >
                  <item.icon className="mr-3 h-6 w-6" />
                  {t(item.name)}
                </button>
              ))}

              {/* Profilo dinamico */}
                <button
                  key={'common.my_profile'}
                  onClick={() => handleNavigation(`/users/${user?.id}`)}
                  className="flex items-center nav-btn px-4 py-3 text-lg font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 group w-full"
                >
                  <UserCircle className="mr-3 h-6 w-6" />
                  {t('common.my_profile')}
                </button>
            </nav>
          </div>


        </div>
      </div>
    </>
  );
}