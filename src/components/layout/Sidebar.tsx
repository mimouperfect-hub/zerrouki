import React from 'react';
import {
  LayoutDashboard, ShoppingCart, ReceiptText, Package, Boxes,
  Truck, Users, Wallet, UserCheck, Tag, BarChart3, Bell,
  ShieldCheck, Settings, LogOut, DollarSign
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { ActiveView, User } from '../../types';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  isOpen?: boolean;
  currentUser?: User | null;
  onLogout?: () => void;
}

interface NavItem {
  id: ActiveView;
  labelAr: string;
  icon: React.ElementType;
  permissionCode?: string;
}

interface NavGroup {
  titleAr: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, isOpen, currentUser, onLogout }) => {
  const isOwner = currentUser?.roleCode === 'OWNER';
  const permissions = currentUser?.permissions || [];

  const hasPermission = (item: NavItem) => {
    if (isOwner) return true;

    // RULE 1: Dashboard (لوحة التحكم) is EXCLUSIVELY for General Manager (OWNER)
    if (item.id === 'DASHBOARD') return false;

    // CASHIER (البائع) restriction: ONLY POS and CUSTOMERS
    if (currentUser?.roleCode === 'CASHIER') {
      return item.id === 'POS' || item.id === 'CUSTOMERS';
    }

    // STOREKEEPER (مسؤول المخزن) restriction: ONLY Products, Inventory, Purchases, Suppliers
    if (currentUser?.roleCode === 'STOREKEEPER') {
      return ['PRODUCTS', 'INVENTORY', 'PROMOTIONS', 'PURCHASES', 'SUPPLIERS'].includes(item.id);
    }

    // ACCOUNTANT (المحاسب) restriction: ONLY Cash, Customers, Payroll, Reports
    if (currentUser?.roleCode === 'ACCOUNTANT') {
      return ['CASH', 'CUSTOMERS', 'PAYROLL', 'REPORTS'].includes(item.id);
    }

    if (!item.permissionCode) return true;
    return permissions.includes(item.permissionCode);
  };

  const groups: NavGroup[] = [
    {
      titleAr: 'المبيعات والرئيسية',
      items: [
        { id: 'DASHBOARD', labelAr: 'لوحة التحكم', icon: LayoutDashboard, permissionCode: 'view_dashboard' },
        { id: 'POS', labelAr: 'نقطة البيع (POS)', icon: ShoppingCart, permissionCode: 'create_sale' },
        { id: 'SALES', labelAr: 'سجل المبيعات والفواتير', icon: ReceiptText, permissionCode: 'view_sales' }
      ]
    },
    {
      titleAr: 'المخزون والمنتجات',
      items: [
        { id: 'PRODUCTS', labelAr: 'المنتجات والأصناف', icon: Package, permissionCode: 'view_products' },
        { id: 'INVENTORY', labelAr: 'المخزون وصلاحية FEFO', icon: Boxes, permissionCode: 'view_stock' },
        { id: 'PROMOTIONS', labelAr: 'العروض والتخفيضات', icon: Tag, permissionCode: 'view_products' }
      ]
    },
    {
      titleAr: 'المشتريات والعلاقات',
      items: [
        { id: 'PURCHASES', labelAr: 'المشتريات والتوريد', icon: Truck, permissionCode: 'view_purchase' },
        { id: 'SUPPLIERS', labelAr: 'الموردون وشركات التوزيع', icon: Users, permissionCode: 'view_purchase' },
        { id: 'CUSTOMERS', labelAr: 'الزبائن والولاء والديون', icon: Users, permissionCode: 'manage_customers' }
      ]
    },
    {
      titleAr: 'الخزينة والموارد البشرية',
      items: [
        { id: 'CASH', labelAr: 'الخزينة والمصاريف', icon: Wallet, permissionCode: 'create_expense' },
        { id: 'EMPLOYEES', labelAr: 'سجل الموظفين', icon: UserCheck, permissionCode: 'manage_employees' },
        { id: 'PAYROLL', labelAr: 'الأجور والرواتب', icon: DollarSign, permissionCode: 'view_salaries' }
      ]
    },
    {
      titleAr: 'التقارير والنظام',
      items: [
        { id: 'REPORTS', labelAr: 'التقارير والأرباح الصافية', icon: BarChart3, permissionCode: 'view_profit' },
        { id: 'NOTIFICATIONS', labelAr: 'التنبيهات الإدارية', icon: Bell },
        { id: 'AUDIT_LOGS', labelAr: 'سجل الأمان والتدقيق', icon: ShieldCheck, permissionCode: 'view_audit_logs' },
        { id: 'SETTINGS', labelAr: 'إعدادات المحل والنسخ', icon: Settings, permissionCode: 'manage_settings' }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => onNavigate(activeView)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 right-0 z-40 w-64 bg-gradient-to-b from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white flex flex-col transition-transform duration-300 ease-in-out border-l border-amber-400/20 shadow-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-amber-400/20 flex items-center justify-between bg-black/10">
          <BrandLogo size="md" textColor="light" />
        </div>

        {/* User Card info */}
        {currentUser && (
          <div className="px-4 py-3 bg-white/5 border-b border-amber-400/15 flex items-center justify-between backdrop-blur-xs">
            <div className="min-w-0">
              <div className="text-xs font-black text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-amber-300 font-extrabold mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                {currentUser.roleCode === 'OWNER' && 'المدير العام'}
                {currentUser.roleCode === 'CASHIER' && 'بائع'}
                {currentUser.roleCode === 'STOREKEEPER' && 'مسؤول المخزن'}
                {currentUser.roleCode === 'ACCOUNTANT' && 'محاسب المحل'}
                {currentUser.roleCode === 'MANAGER' && 'مسؤول تنفيذي'}
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-purple-100 hover:text-white transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-purple-700">
          {groups.map((group, idx) => {
            const visibleItems = group.items.filter(item => hasPermission(item));
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <h4 className="px-3 text-[10px] font-black text-amber-300 uppercase tracking-wider mb-1.5 drop-shadow-xs">
                  {group.titleAr}
                </h4>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-black text-xs transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg shadow-amber-500/25 scale-[1.02]'
                          : 'text-purple-100/90 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-amber-300/80'}`} />
                      <span>{item.labelAr}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-amber-400/20 bg-black/20 text-[10px] text-amber-200/80 text-center font-black">
          ✨ نظام زروقي للحلويات v2.0 • الجزائر
        </div>
      </aside>

    </>
  );
};

