import React from 'react';
import { Bell, Menu, LogOut, User as UserIcon } from 'lucide-react';
import { ActiveView, User } from '../../types';

interface HeaderProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onToggleSidebar: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeView, onNavigate, onToggleSidebar, currentUser, onLogout }) => {
  return (
    <header className="relative bg-white/90 backdrop-blur-md border-b border-purple-100 h-16 px-4 md:px-6 flex items-center justify-between shrink-0 z-20 shadow-sm">
      {/* Top Rainbow Accent Line */}
      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-violet-600" />

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-purple-900 hover:bg-purple-50 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="text-sm md:text-base font-black text-purple-950 hidden sm:block">
          ✨ محل زروقي للحلويات - <span className="text-rose-600 font-extrabold">Zerrouki Sweets</span>
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* User Info Pill */}
        {currentUser && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 via-rose-50 to-purple-50 border border-amber-200/80 px-3 py-1.5 rounded-2xl text-xs font-black text-purple-950 shadow-xs">
            <UserIcon className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">{currentUser.name}</span>
            <span className="bg-gradient-to-r from-purple-700 to-indigo-700 text-amber-200 text-[10px] font-black px-2.5 py-0.5 rounded-lg shadow-xs">
              {currentUser.roleCode === 'OWNER' && 'المدير العام'}
              {currentUser.roleCode === 'CASHIER' && 'كاشير'}
              {currentUser.roleCode === 'STOREKEEPER' && 'المخزن'}
              {currentUser.roleCode === 'ACCOUNTANT' && 'محاسب'}
              {currentUser.roleCode === 'MANAGER' && 'مدير'}
            </span>
          </div>
        )}

        {/* Notifications Button */}
        <button
          onClick={() => onNavigate('NOTIFICATIONS')}
          className="p-2.5 rounded-2xl border border-rose-200 text-rose-700 hover:bg-rose-50 relative shadow-xs transition-all active:scale-95"
          title="الإشعارات"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
        </button>

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2.5 rounded-2xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-1.5 text-xs font-black shadow-xs active:scale-95"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        )}
      </div>
    </header>
  );
};



