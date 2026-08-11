import {
  User, Product, Category, Sale, Purchase, Supplier, Customer, CustomerPaymentRecord,
  CashSession, Expense, Employee, AttendanceRecord, AuditLog, SystemNotification, SystemSettings, Promotion
} from '../types';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('zerrouki_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    if (!response.ok) {
      throw new Error(`خطأ بالاتصال بالسيرفر (${response.status})`);
    }
    throw new Error('استجابة السيرفر غير صالحة');
  }

  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (usernameOrData: string | { username: string; password?: string }, password?: string) => {
    const payload = typeof usernameOrData === 'string'
      ? { username: usernameOrData, password }
      : usernameOrData;
    return fetchApi<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  getMe: () => fetchApi<{ user: User; role: any; permissions: string[] }>('/auth/me'),
  verifyPin: (pin: string) => fetchApi<{ success: boolean }>('/auth/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) }),
  updateCredentials: (data: { newUsername?: string; newPassword?: string; currentPassword?: string }) =>
    fetchApi<{ success: boolean; message: string; user: User }>('/auth/update-credentials', { method: 'POST', body: JSON.stringify(data) }),

  // Users & Roles
  getRoles: () => fetchApi<any>('/roles'),
  getUsers: () => fetchApi<User[]>('/users'),
  createUser: (data: any) => fetchApi<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => fetchApi<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Categories & Products
  getCategories: () => fetchApi<Category[]>('/categories'),
  createCategory: (data: any) => fetchApi<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: any) => fetchApi<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => fetchApi<{ message: string }>(`/categories/${id}`, { method: 'DELETE' }),
  getProducts: (params?: { search?: string; categoryId?: string; lowStock?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.categoryId) q.append('categoryId', params.categoryId);
    if (params?.lowStock) q.append('lowStock', 'true');
    return fetchApi<Product[]>(`/products?${q.toString()}`);
  },
  getProductByBarcode: (barcode: string) => fetchApi<Product>(`/products/barcode/${encodeURIComponent(barcode)}`),
  createProduct: (data: any) => fetchApi<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
  bulkCreateProducts: (products: any[]) => fetchApi<{ success: boolean; count: number; message: string }>('/products/bulk', { method: 'POST', body: JSON.stringify({ products }) }),
  updateProduct: (id: string, data: any) => fetchApi<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => fetchApi<{ message: string }>(`/products/${id}`, { method: 'DELETE' }),

  // Inventory Management & FEFO
  adjustStock: (data: { productId: string; batchId?: string; type: string; quantityDelta: number; reason: string }) =>
    fetchApi<any>('/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),
  createBatch: (data: { productId: string; batchNumber?: string; productionDate?: string; expirationDate: string; quantity: number; purchasePrice?: number }) =>
    fetchApi<any>('/inventory/batches', { method: 'POST', body: JSON.stringify(data) }),
  getStockMovements: () => fetchApi<any[]>('/inventory/movements'),
  disposeBatch: (batchId: string, reason?: string) =>
    fetchApi<any>(`/inventory/batches/${batchId}/dispose`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // POS & Sales
  checkoutSale: (data: any) => fetchApi<any>('/pos/checkout', { method: 'POST', body: JSON.stringify(data) }),
  getSales: () => fetchApi<Sale[]>('/sales'),
  cancelSale: (id: string, data: { reason: string; managerPin: string }) =>
    fetchApi<any>(`/sales/${id}/cancel`, { method: 'POST', body: JSON.stringify(data) }),
  returnSale: (id: string, data: { returnItems: any[]; reason: string }) =>
    fetchApi<any>(`/sales/${id}/return`, { method: 'POST', body: JSON.stringify(data) }),

  // Purchases & Suppliers
  getSuppliers: () => fetchApi<Supplier[]>('/suppliers'),
  createSupplier: (data: any) => fetchApi<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => fetchApi<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => fetchApi<any>(`/suppliers/${id}`, { method: 'DELETE' }),
  paySupplierDebt: (id: string, amount: number) => fetchApi<any>(`/suppliers/${id}/pay-debt`, { method: 'POST', body: JSON.stringify({ amount }) }),
  getPurchases: () => fetchApi<Purchase[]>('/purchases'),
  createPurchase: (data: any) => fetchApi<Purchase>('/purchases', { method: 'POST', body: JSON.stringify(data) }),

  // Inventory & Stock Operations
  recordWaste: (data: { productId: string; batchId?: string; quantity: number; reason: string; notes?: string }) =>
    fetchApi<any>('/inventory/waste', { method: 'POST', body: JSON.stringify(data) }),

  // Customers & Loyalty
  getCustomers: () => fetchApi<Customer[]>('/customers'),
  createCustomer: (data: any) => fetchApi<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  payCustomerDebt: (id: string, amount: number, notes?: string) => fetchApi<any>(`/customers/${id}/pay-debt`, { method: 'POST', body: JSON.stringify({ amount, notes }) }),
  adjustCustomerBalance: (id: string, data: { newTotalPaid?: number; newTotalDebt?: number; reason?: string }) =>
    fetchApi<any>(`/customers/${id}/adjust-balance`, { method: 'PUT', body: JSON.stringify(data) }),
  getCustomerPayments: (id: string) => fetchApi<CustomerPaymentRecord[]>(`/customers/${id}/payments`),
  updateCustomerPayment: (paymentId: string, data: { amount: number; notes?: string }) =>
    fetchApi<any>(`/customer-payments/${paymentId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomerPayment: (paymentId: string) => fetchApi<any>(`/customer-payments/${paymentId}`, { method: 'DELETE' }),
  redeemPoints: (id: string, points: number) => fetchApi<any>(`/customers/${id}/redeem-points`, { method: 'POST', body: JSON.stringify({ points }) }),
  updateSalePaidAmount: (saleId: string, data: { paidAmount: number; reason?: string }) =>
    fetchApi<any>(`/sales/${saleId}/update-paid-amount`, { method: 'PUT', body: JSON.stringify(data) }),

  // Cash Register & Expenses
  getCurrentCashSession: () => fetchApi<CashSession | null>('/cash/current'),
  openCashSession: (openingBalance: number, notes?: string) => fetchApi<CashSession>('/cash/open', { method: 'POST', body: JSON.stringify({ openingBalance, notes }) }),
  closeCashSession: (cashSessionId: string, closingBalanceActual: number, notes?: string) => fetchApi<CashSession>('/cash/close', { method: 'POST', body: JSON.stringify({ cashSessionId, closingBalanceActual, notes }) }),
  getExpenses: () => fetchApi<{ expenses: Expense[]; categories: any[] }>('/expenses'),
  createExpense: (data: any) => fetchApi<Expense>('/expenses', { method: 'POST', body: JSON.stringify(data) }),

  // Employees, Attendance, Leaves & Payroll
  getEmployees: () => fetchApi<Employee[]>('/employees'),
  createEmployee: (data: any) => fetchApi<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployeeSchedule: (id: string, data: { workStartTime?: string; workEndTime?: string; offDays?: string[]; lateToleranceMinutes?: number; userId?: string }) =>
    fetchApi<Employee>(`/employees/${id}/schedule`, { method: 'PUT', body: JSON.stringify(data) }),
  getAttendance: () => fetchApi<AttendanceRecord[]>('/attendance'),
  getManagerAttendanceQR: () => fetchApi<{ qrToken: string; qrPayload: string; storeName?: string }>('/attendance/manager-qr'),
  scanAttendanceQR: (qrToken: string) => fetchApi<any>('/attendance/scan-qr', { method: 'POST', body: JSON.stringify({ qrToken }) }),
  recordManualAttendance: (data: any) => fetchApi<AttendanceRecord>('/attendance/manual', { method: 'POST', body: JSON.stringify(data) }),
  checkInEmployee: (employeeId: string, notes?: string) => fetchApi<any>('/attendance/check-in', { method: 'POST', body: JSON.stringify({ employeeId, notes }) }),
  checkOutEmployee: (employeeId: string, notes?: string) => fetchApi<any>('/attendance/check-out', { method: 'POST', body: JSON.stringify({ employeeId, notes }) }),
  getLeaves: () => fetchApi<any[]>('/leaves'),
  requestLeave: (data: any) => fetchApi<any>('/leaves', { method: 'POST', body: JSON.stringify(data) }),
  updateLeaveStatus: (id: string, status: string) => fetchApi<any>(`/leaves/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Salary Adjustments & Payroll
  getPayrollSummary: () => fetchApi<any>('/payroll/summary'),
  paySalary: (data: any) => fetchApi<any>('/payroll/pay-salary', { method: 'POST', body: JSON.stringify(data) }),
  createAdvance: (data: any) => fetchApi<any>('/salary-advances', { method: 'POST', body: JSON.stringify(data) }),
  createBonus: (data: { employeeId: string; amount: number; reasonAr: string }) => fetchApi<any>('/salary-bonuses', { method: 'POST', body: JSON.stringify(data) }),
  createDeduction: (data: { employeeId: string; amount: number; reasonAr: string }) => fetchApi<any>('/salary-deductions', { method: 'POST', body: JSON.stringify(data) }),

  // Promotions
  getPromotions: () => fetchApi<Promotion[]>('/promotions'),
  createPromotion: (data: any) => fetchApi<Promotion>('/promotions', { method: 'POST', body: JSON.stringify(data) }),
  updatePromotion: (id: string, data: any) => fetchApi<Promotion>(`/promotions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  togglePromotion: (id: string) => fetchApi<Promotion>(`/promotions/${id}/toggle`, { method: 'PATCH' }),
  deletePromotion: (id: string) => fetchApi<any>(`/promotions/${id}`, { method: 'DELETE' }),

  // Reports & Dashboard
  getDashboardReports: () => fetchApi<any>('/reports/dashboard'),

  // System & Audit & Backups
  getNotifications: () => fetchApi<SystemNotification[]>('/notifications'),
  markNotificationRead: (id: string) => fetchApi<any>(`/notifications/${id}/read`, { method: 'PUT' }),
  getAuditLogs: () => fetchApi<AuditLog[]>('/audit-logs'),
  getSettings: () => fetchApi<SystemSettings>('/settings'),
  updateSettings: (data: any) => fetchApi<SystemSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getBackups: () => fetchApi<any[]>('/backups'),
  createBackup: () => fetchApi<any>('/backups/create', { method: 'POST' }),
  restoreBackup: (filename: string) => fetchApi<any>('/backups/restore', { method: 'POST', body: JSON.stringify({ filename }) }),
  resetDemoData: (pin: string) => fetchApi<any>('/backups/reset', { method: 'POST', body: JSON.stringify({ pin, managerPin: pin }) }),

  // Firebase Cloud
  getFirebaseStatus: () => fetchApi<{ connected: boolean; projectId?: string; syncedAt?: string }>('/firebase/status'),
  triggerFirebaseSync: () => fetchApi<{ success: boolean; message: string }>('/firebase/sync', { method: 'POST' })
};
