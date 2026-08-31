import React from 'react';
import { Menu, Search, Bell, User,LogOut } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useMenuStore} from '../store/menuStore';
import { useAuthStore } from '../store/authStore';

export function Header() {
  const toggleMenu = useMenuStore((state) => state.toggle);
  const closeMenu = useMenuStore((state) => state.close);
  const { user, signOut } = useAuthStore();
  const handleSignOut = () => {
    signOut();
    closeMenu();
  };


  
  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-40 h-16">
      <div className="flex justify-between items-center h-16 px-4">
          <div className="flex items-center gap-2">
           
            <button 
              onClick={() => { console.log('Header: toggleMenu clicked'); toggleMenu(); }}
              className="btn p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pointer-events-auto z-50 flex-shrink-0"
              aria-label="Toggle menu"
            >
              <Menu className="h-7 w-7" />
            </button>
            
            <div className="flex items-center">
              <img
                src="/rossi-logo.png"
                alt="ROSSI Logo"
                className="h-14 w-auto"
                style={{ maxHeight: 56 }}
              />
              <div className="flex flex-col ml-2">
                <span className="text-sm text-gray-500 hidden sm:inline-block">
                  Warehouse Picking System
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold w-fit">
                  v1.0
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* <button className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100">
              <LanguageSwitcher />
            </button> */} 

            <button onClick={() => { console.log('Header: signOut clicked'); handleSignOut(); }} className="flex items-center space-x-2 btn p-3 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 pointer-events-auto z-50">
              <span className="hidden md:inline-block text-base text-gray-700">{user?.NAME} {user?.WAREHOUSE_CODE}</span>
              <LogOut className="h-8 w-8" />
            </button>

          </div>
      </div>
      {
        /*
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            

                    <button className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100">
              <Bell className="h-6 w-6" />
            </button>
            
            
            
            <button className="flex items-center space-x-2 p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100">
              <User className="h-6 w-6" />
            </button>


        */
      }
    </header>
  );
}