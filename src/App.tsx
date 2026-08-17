import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginView } from './components/auth/LoginView';
import { ActiveView, User } from './types';
import { ScanAttendanceModal } from './components/employees/ScanAttendanceModal';

import { DashboardView } from './components/dashboard/DashboardView';
import { PosView } from './components/pos/PosView';
import { SalesView } from './components/sales/SalesView';
import { ProductsView } from './components/products/ProductsView';
import { InventoryView } from './components/inventory/InventoryView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { CustomersView } from './components/customers/CustomersView';
import { CashView } from './components/cash/CashView';
import { EmployeesView } from './components/employees/EmployeesView';
import { PayrollView } from './components/payroll/PayrollView';
import { PromotionsView } from './components/promotions/PromotionsView';
import { ReportsView } from './components/reports/ReportsView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { AuditLogView } from './components/audit/AuditLogView';
import { SettingsView } from './components/settings/SettingsView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScanAttendanceOpen, setIsScanAttendanceOpen] = useState(false);

  const navigateTo = (view: ActiveView, replace: boolean = false) => {
    setActiveView(view);
    const hash = `#${view}`;
    if (replace || window.location.hash === hash) {
      window.history.replaceState({ view }, '', hash);
    } else {
      window.history.pushState({ view }, '', hash);
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const stateView = e.state?.view;
      const hashView = window.location.hash.replace('#', '') as ActiveView;
      const targetView = stateView || hashView;

      if (targetView && canAccessView(targetView)) {
        setActiveView(targetView);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  useEffect(() => {
    // Check saved user session
    const savedUser = localStorage.getItem('zerrouki_user');
    const savedToken = localStorage.getItem('zerrouki_token');
    if (savedUser && savedToken) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.roleCode === 'CASHIER') {
          parsed.permissions = ['create_sale', 'manage_customers'];
          localStorage.setItem('zerrouki_user', JSON.stringify(parsed));
        }
        setCurrentUser(parsed);
        setDefaultViewForRole(parsed);
      } catch (e) {
        localStorage.removeItem('zerrouki_user');
        localStorage.removeItem('zerrouki_token');
      }
    }
  }, []);

  const setDefaultViewForRole = (user: User) => {
    let initialView: ActiveView = 'DASHBOARD';
    if (user.roleCode === 'CASHIER') {
      initialView = 'POS';
    } else if (user.roleCode === 'STOREKEEPER') {
      initialView = 'PRODUCTS';
    } else if (user.roleCode === 'ACCOUNTANT') {
      initialView = 'CASH';
    }

    const hashView = window.location.hash.replace('#', '') as ActiveView;
    const effectiveView = hashView && canAccessView(hashView) ? hashView : initialView;
    navigateTo(effectiveView, true);
  };

  const handleLoginSuccess = (user: User, token: string) => {
    if (user.roleCode === 'CASHIER') {
      user.permissions = ['create_sale', 'manage_customers'];
      localStorage.setItem('zerrouki_user', JSON.stringify(user));
    }
    setCurrentUser(user);
    setDefaultViewForRole(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('zerrouki_token');
    localStorage.removeItem('zerrouki_user');
    setCurrentUser(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  // Permission check helper
  const canAccessView = (view: ActiveView): boolean => {
    if (!currentUser) return false;
    if (currentUser.roleCode === 'OWNER') return true;

    // RULE 1: Dashboard is EXCLUSIVELY for General Manager (OWNER)
    if (view === 'DASHBOARD') return false;

    // Strict override for Cashier / Seller
    if (currentUser.roleCode === 'CASHIER') {
      return view === 'POS' || view === 'CUSTOMERS';
    }

    // Strict override for Storekeeper
    if (currentUser.roleCode === 'STOREKEEPER') {
      return ['PRODUCTS', 'INVENTORY', 'PROMOTIONS', 'PURCHASES', 'SUPPLIERS'].includes(view);
    }

    // Strict override for Accountant
    if (currentUser.roleCode === 'ACCOUNTANT') {
      return ['CASH', 'CUSTOMERS', 'PAYROLL', 'REPORTS'].includes(view);
    }

    const perms = currentUser.permissions || [];
    switch (view) {
      case 'POS':
        return perms.includes('create_sale');
      case 'SALES':
        return perms.includes('view_sales');
      case 'PRODUCTS':
        return perms.includes('view_products');
      case 'INVENTORY':
        return perms.includes('view_stock');
      case 'PROMOTIONS':
        return perms.includes('view_products');
      case 'PURCHASES':
        return perms.includes('view_purchase');
      case 'SUPPLIERS':
        return perms.includes('view_purchase');
      case 'CUSTOMERS':
        return perms.includes('manage_customers');
      case 'CASH':
        return perms.includes('create_expense') || perms.includes('manage_cash');
      case 'EMPLOYEES':
        return perms.includes('manage_employees');
      case 'PAYROLL':
        return perms.includes('view_salaries') || perms.includes('manage_payroll');
      case 'REPORTS':
        return perms.includes('view_profit');
      case 'NOTIFICATIONS':
        return true;
      case 'AUDIT_LOGS':
        return perms.includes('view_audit_logs');
      case 'SETTINGS':
        return perms.includes('manage_settings');
      default:
        return true;
    }
  };

  // If user is not logged in, show the Login screen
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const renderCurrentView = () => {
    if (!canAccessView(activeView)) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-3">
          <div className="p-4 bg-amber-50 text-amber-800 rounded-3xl border border-amber-200">
            <h3 className="font-extrabold text-base mb-1">غير مصرح لك للوصول لهذه الصفحة</h3>
            <p className="text-xs">حسابك لا يمتلك الصلاحية المطلوبة لمشاهدة هذا القسم. يرجى التواصل مع المدير العام.</p>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'DASHBOARD':
        return <DashboardView onNavigate={(view) => navigateTo(view)} />;
      case 'POS':
        return <PosView />;
      case 'SALES':
        return <SalesView />;
      case 'PRODUCTS':
        return <ProductsView />;
      case 'INVENTORY':
        return <InventoryView />;
      case 'PURCHASES':
        return <PurchasesView />;
      case 'SUPPLIERS':
        return <SuppliersView />;
      case 'CUSTOMERS':
        return <CustomersView />;
      case 'CASH':
        return <CashView />;
      case 'EMPLOYEES':
        return <EmployeesView />;
      case 'PAYROLL':
        return <PayrollView />;
      case 'PROMOTIONS':
        return <PromotionsView />;
      case 'REPORTS':
        return <ReportsView />;
      case 'NOTIFICATIONS':
        return <NotificationsView />;
      case 'AUDIT_LOGS':
        return <AuditLogView />;
      case 'SETTINGS':
        return <SettingsView />;
      default:
        return <DashboardView onNavigate={(view) => navigateTo(view)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#1E1B4B] font-sans flex flex-col dir-rtl text-right select-none relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/50 via-rose-50/30 to-purple-100/40">
      {/* Top Header */}
      <Header
        activeView={activeView}
        onNavigate={(view) => navigateTo(view)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenScanAttendance={() => setIsScanAttendanceOpen(true)}
      />

      {/* Main Body with Sidebar + View */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          activeView={activeView}
          onNavigate={(view) => {
            navigateTo(view);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto min-w-0">
          {renderCurrentView()}
        </main>
      </div>

      {/* Global QR Attendance Scanner Modal for All Employees */}
      <ScanAttendanceModal
        isOpen={isScanAttendanceOpen}
        onClose={() => setIsScanAttendanceOpen(false)}
        onScanSuccess={() => {
          // Toast or refresh notification
        }}
      />
    </div>
  );
}


