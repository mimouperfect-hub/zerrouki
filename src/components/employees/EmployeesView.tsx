import React, { useEffect, useState } from 'react';
import {
  UserCheck, Plus, Phone, Calendar, DollarSign, Award, Clock, QrCode, Camera,
  Printer, Settings, CheckCircle2, AlertTriangle, AlertCircle, ShieldCheck, RefreshCw, Filter, Search,
  Check, FileText, User, ChevronLeft, BarChart2, Trash2, Edit, Key, Lock, Mail, UserPlus, Shield
} from 'lucide-react';
import { api } from '../../api/client';
import { Employee, AttendanceRecord, User as UserType } from '../../types';
import { ManagerAttendanceQRModal } from './ManagerAttendanceQRModal';
import { EmployeeScheduleModal } from './EmployeeScheduleModal';
import { ScanAttendanceModal } from './ScanAttendanceModal';
import { ManualAttendanceModal } from './ManualAttendanceModal';

export const EmployeesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'ATTENDANCE' | 'SCORECARDS'>('ATTENDANCE');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [systemUsers, setSystemUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  // Employee Modal state (Create / Edit)
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [fullNameAr, setFullNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [positionAr, setPositionAr] = useState('');
  const [baseSalary, setBaseSalary] = useState(40000);
  const [commissionRatePercent, setCommissionRatePercent] = useState(0);
  const [offDays, setOffDays] = useState<string[]>(['الجمعة']);
  const [workStartTime, setWorkStartTime] = useState<string>('08:00');
  const [workEndTime, setWorkEndTime] = useState<string>('17:00');
  const [lateToleranceMinutes, setLateToleranceMinutes] = useState<number>(15);

  const DAYS_OF_WEEK = ['الجمعة', 'السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

  const toggleOffDay = (day: string) => {
    setOffDays((prev) => {
      const updated = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      return updated.length > 0 ? updated : [day];
    });
  };

  // System User Login Credentials for Employee
  const [createAccount, setCreateAccount] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userRoleCode, setUserRoleCode] = useState('CASHIER');

  // Manager QR Modal State
  const [isManagerQRModalOpen, setIsManagerQRModalOpen] = useState(false);
  const [managerQRToken, setManagerQRToken] = useState('ZERROUKI_ATTENDANCE_MAIN_STORE_2026');
  const [storeName, setStoreName] = useState('مؤسسة زروقي للحلويات');

  // Employee Schedule Customization Modal State
  const [selectedEmpForSchedule, setSelectedEmpForSchedule] = useState<Employee | null>(null);

  // Employee Scanner Modal State
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // Manual Attendance Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualModalEmpId, setManualModalEmpId] = useState<string | undefined>(undefined);
  const [manualModalStatus, setManualModalStatus] = useState<'PRESENT' | 'LATE' | 'REST_DAY' | 'LEAVE' | 'ABSENT' | undefined>(undefined);

  // Custom Delete Confirmation Modal State
  const [empToDeleteConfirm, setEmpToDeleteConfirm] = useState<Employee | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmpFilter, setSelectedEmpFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  useEffect(() => {
    loadData();

    const handleAttendanceUpdated = () => {
      loadData();
    };

    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.storeNameAr) {
        setStoreName(e.detail.storeNameAr);
      } else {
        loadData();
      }
    };

    window.addEventListener('zerrouki_attendance_updated', handleAttendanceUpdated);
    window.addEventListener('zerrouki_settings_updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('zerrouki_attendance_updated', handleAttendanceUpdated);
      window.removeEventListener('zerrouki_settings_updated', handleSettingsUpdated);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [emps, atts, qrInfo, usersList] = await Promise.all([
        api.getEmployees().catch(() => []),
        api.getAttendance().catch(() => []),
        api.getManagerAttendanceQR().catch(() => ({ qrToken: 'ZERROUKI_ATTENDANCE_MAIN_STORE_2026', storeName: 'مؤسسة زروقي للحلويات' })),
        api.getUsers().catch(() => [])
      ]);
      setEmployees(emps);
      setAttendanceRecords(atts);
      setSystemUsers(usersList);
      if (qrInfo?.qrToken) setManagerQRToken(qrInfo.qrToken);
      if (qrInfo?.storeName) setStoreName(qrInfo.storeName);
    } catch (e) {
      console.error('Failed to load employees & attendance data:', e);
    } finally {
      setLoading(false);
    }
  };

  const openNewEmployeeModal = () => {
    setEditingEmp(null);
    setFullNameAr('');
    setPhone('');
    setPositionAr('');
    setBaseSalary(40000);
    setCommissionRatePercent(0);
    setOffDays(['الجمعة']);
    setWorkStartTime('08:00');
    setWorkEndTime('17:00');
    setLateToleranceMinutes(15);
    setCreateAccount(true);
    setUsername('');
    setPassword('');
    setUserRoleCode('CASHIER');
    setIsEmpModalOpen(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEditingEmp(emp);
    setFullNameAr(emp.fullNameAr || '');
    setPhone(emp.phone || '');
    setPositionAr(emp.positionAr || '');
    setBaseSalary(emp.baseSalary || 40000);
    setCommissionRatePercent(emp.commissionRatePercent || 0);
    setOffDays(emp.offDays && emp.offDays.length > 0 ? emp.offDays : (emp.restDayAr ? [emp.restDayAr] : ['الجمعة']));
    setWorkStartTime(emp.workStartTime || '08:00');
    setWorkEndTime(emp.workEndTime || '17:00');
    setLateToleranceMinutes(emp.lateToleranceMinutes || 15);

    const linkedUser = emp.userId ? systemUsers.find((u) => u.id === emp.userId) : null;
    if (linkedUser) {
      setCreateAccount(true);
      setUsername(linkedUser.username || linkedUser.email || '');
      setPassword('');
      setUserRoleCode(linkedUser.roleCode || 'CASHIER');
    } else {
      setCreateAccount(false);
      setUsername('');
      setPassword('');
      setUserRoleCode('CASHIER');
    }
    setIsEmpModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmp) {
        await api.updateEmployee(editingEmp.id, {
          fullNameAr,
          phone,
          positionAr,
          baseSalary,
          commissionRatePercent,
          offDays,
          restDayAr: offDays.join('، '),
          workStartTime,
          workEndTime,
          lateToleranceMinutes,
          createAccount,
          username,
          password,
          userRoleCode
        });
      } else {
        await api.createEmployee({
          fullNameAr,
          phone,
          positionAr,
          baseSalary,
          commissionRatePercent,
          workStartTime,
          workEndTime,
          offDays,
          restDayAr: offDays.join('، '),
          lateToleranceMinutes,
          createAccount,
          username,
          password,
          userRoleCode
        });
      }
      setIsEmpModalOpen(false);
      setEditingEmp(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'فشلت عملية حفظ البيانات');
    }
  };

  const handleDeleteEmployee = (emp: Employee) => {
    console.log('🔍 [فتح نافذة تأكيد الحذف للموظف]:', { id: emp.id, name: emp.fullNameAr });
    setEmpToDeleteConfirm(emp);
  };

  const confirmExecutionDeleteEmployee = async () => {
    if (!empToDeleteConfirm) return;
    const targetEmp = empToDeleteConfirm;
    setEmpToDeleteConfirm(null);

    console.group('🔍 [تنفيذ حذف الموظف - EXECUTION]');
    console.log('1. بيانات الموظف الجاري حذفه:', targetEmp);

    try {
      console.log('2. إرسال طلب الحذف إلى API:', `/api/employees/${targetEmp.id}`);
      setEmployees((prev) => prev.filter((e) => e.id !== targetEmp.id));

      const res = await api.deleteEmployee(targetEmp.id);
      console.log('3. ✅ استجابة الخادم بنجاح:', res);

      await loadData();
      console.log('4. ✅ تم تحديث البيانات بنجاح.');
    } catch (err: any) {
      console.error('💥 [خطأ في عملية الحذف]:', err);
      alert(`خطأ في الحذف: ${err?.message || err}`);
      await loadData();
    } finally {
      console.groupEnd();
    }
  };

  // KPI Calculations in Algeria Time (GMT+1 / Africa/Algiers)
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Algiers',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const algeriaParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Algiers',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const algeriaDateMap: Record<string, string> = {};
  for (const p of algeriaParts) algeriaDateMap[p.type] = p.value;
  const todayDayName = arabicDays[new Date(`${algeriaDateMap.year}-${algeriaDateMap.month}-${algeriaDateMap.day}T12:00:00`).getDay()];

  const activeEmployees = employees.filter((e) => e.isActive !== false);
  const todayAttendance = attendanceRecords.filter((a) => a.date === todayStr);

  const presentTodayCount = todayAttendance.filter((a) => a.status === 'PRESENT').length;
  const lateTodayCount = todayAttendance.filter((a) => a.status === 'LATE').length;
  
  // Weekly Rest Day calculation
  const scheduledOffEmpIds = activeEmployees
    .filter((e) => (e.offDays && e.offDays.includes(todayDayName)) || e.restDayAr === todayDayName)
    .map((e) => e.id);
  const recordedRestDayEmpIds = todayAttendance
    .filter((a) => a.status === 'REST_DAY')
    .map((a) => a.employeeId);
  const loggedEmpIdsToday = todayAttendance.map((a) => a.employeeId);

  const allOffTodayEmpIds = Array.from(new Set([
    ...recordedRestDayEmpIds,
    ...scheduledOffEmpIds.filter((id) => !loggedEmpIdsToday.includes(id) || recordedRestDayEmpIds.includes(id))
  ]));
  const offTodayCount = allOffTodayEmpIds.length;

  const leaveTodayCount = todayAttendance.filter((a) => a.status === 'LEAVE').length;

  // Absent without excuse count
  const recordedAbsentEmpIds = todayAttendance.filter((a) => a.status === 'ABSENT').map((a) => a.employeeId);
  const unloggedActiveEmpIds = activeEmployees
    .filter((e) => !loggedEmpIdsToday.includes(e.id) && !scheduledOffEmpIds.includes(e.id))
    .map((e) => e.id);
  const absentTodayCount = recordedAbsentEmpIds.length + unloggedActiveEmpIds.length;

  const filteredEmployees = employees.filter(
    (e) =>
      !searchQuery ||
      e.fullNameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.positionAr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate live today entries for unlogged active employees so filtering by REST_DAY, ABSENT etc. shows them!
  const liveTodayEntries: AttendanceRecord[] = [];
  for (const emp of activeEmployees) {
    const hasLogToday = todayAttendance.some((a) => a.employeeId === emp.id);
    if (!hasLogToday) {
      const isOffDay = (emp.offDays && emp.offDays.includes(todayDayName)) || emp.restDayAr === todayDayName;
      if (isOffDay) {
        liveTodayEntries.push({
          id: 'live-off-' + emp.id,
          employeeId: emp.id,
          employeeNameAr: emp.fullNameAr,
          date: todayStr,
          checkIn: '',
          checkOut: '',
          workingHours: 0,
          overtimeHours: 0,
          status: 'REST_DAY',
          notes: 'عطلة أسبوعية معتمدة لهذا اليوم (لم يسجل حضور)',
          createdByUserId: 'system',
          createdAt: new Date().toISOString()
        });
      } else {
        liveTodayEntries.push({
          id: 'live-absent-' + emp.id,
          employeeId: emp.id,
          employeeNameAr: emp.fullNameAr,
          date: todayStr,
          checkIn: '',
          checkOut: '',
          workingHours: 0,
          overtimeHours: 0,
          status: 'ABSENT',
          notes: 'لم يسجل حضوراً اليوم حتى الآن',
          createdByUserId: 'system',
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  const allAttendanceViewList = [...attendanceRecords, ...liveTodayEntries];

  const filteredAttendance = allAttendanceViewList.filter((att) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || att.employeeNameAr.toLowerCase().includes(q) || att.date.includes(q);
    const matchesEmp = !selectedEmpFilter || att.employeeId === selectedEmpFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || att.status === selectedStatusFilter;
    return matchesSearch && matchesEmp && matchesStatus;
  });

  // Centralized unified employee attendance summary helper (synchronizes calculations across all 3 tabs)
  const getEmployeeAttendanceSummary = (emp: Employee) => {
    const empAtts = attendanceRecords.filter((a) => a.employeeId === emp.id);
    const presentDays = empAtts.filter((a) => a.status === 'PRESENT').length;
    const lateDays = empAtts.filter((a) => a.status === 'LATE').length;
    const restDaysFromRecords = empAtts.filter((a) => a.status === 'REST_DAY').length;
    const leaveDays = empAtts.filter((a) => a.status === 'LEAVE').length;
    const absentDaysFromRecords = empAtts.filter((a) => a.status === 'ABSENT').length;
    const totalWorkedHours = Number(empAtts.reduce((sum, a) => sum + (a.workingHours || 0), 0).toFixed(1));
    const totalOvertime = Number(empAtts.reduce((sum, a) => sum + (a.overtimeHours || 0), 0).toFixed(1));

    // Today's Live Status for this employee
    const todayLog = todayAttendance.find((a) => a.employeeId === emp.id);
    const isOffToday = (emp.offDays && emp.offDays.includes(todayDayName)) || emp.restDayAr === todayDayName;

    // Incorporate live today status into counts if not already logged in records
    const restDays = isOffToday && !todayLog ? restDaysFromRecords + 1 : restDaysFromRecords;
    const absentDays = !isOffToday && !todayLog ? absentDaysFromRecords + 1 : absentDaysFromRecords;

    const totalEvaluated = presentDays + lateDays + restDays + leaveDays + absentDays;
    const complianceRate = totalEvaluated > 0
      ? Math.round(((presentDays + restDays + leaveDays) / totalEvaluated) * 100)
      : 100;

    const shiftStr = `${emp.workStartTime || '08:00'} - ${emp.workEndTime || '17:00'}`;
    const offDaysStr = emp.offDays && emp.offDays.length > 0 ? emp.offDays.join('، ') : (emp.restDayAr || 'الجمعة');

    let todayStatusText = '';
    let todayStatusClass = '';
    let todayStatusShort = '';
    if (todayLog) {
      if (todayLog.status === 'PRESENT') {
        todayStatusText = `حاضر اليوم في الموعد 🟢 (${todayLog.checkIn})`;
        todayStatusShort = `حاضر 🟢 (${todayLog.checkIn})`;
        todayStatusClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
      } else if (todayLog.status === 'LATE') {
        todayStatusText = `حاضر اليوم (متأخر) 🟡 (${todayLog.checkIn})`;
        todayStatusShort = `متأخر 🟡 (${todayLog.checkIn})`;
        todayStatusClass = 'bg-amber-100 text-amber-900 border-amber-300';
      } else if (todayLog.status === 'REST_DAY') {
        todayStatusText = `حضور في عطلة أسبوعية 🔵 (${todayLog.checkIn})`;
        todayStatusShort = `عطلة + حضور 🔵`;
        todayStatusClass = 'bg-blue-100 text-blue-900 border-blue-300';
      } else if (todayLog.status === 'LEAVE') {
        todayStatusText = 'في إجازة رسمية مبررة 🟣';
        todayStatusShort = 'إجازة مبررة 🟣';
        todayStatusClass = 'bg-purple-100 text-purple-900 border-purple-300';
      } else {
        todayStatusText = 'مسجل حضور';
        todayStatusShort = 'مسجل';
        todayStatusClass = 'bg-slate-100 text-slate-800 border-slate-300';
      }
    } else if (isOffToday) {
      todayStatusText = 'في عطلة أسبوعية اليوم 🔵';
      todayStatusShort = 'عطلة أسبوعية 🔵';
      todayStatusClass = 'bg-blue-50 text-blue-800 border-blue-200';
    } else {
      todayStatusText = 'لم يسجل حضور اليوم بعد 🔴';
      todayStatusShort = 'لم يسجل بعد 🔴';
      todayStatusClass = 'bg-rose-50 text-rose-800 border-rose-200';
    }

    return {
      empAtts,
      presentDays,
      lateDays,
      restDays,
      leaveDays,
      absentDays,
      totalWorkedHours,
      totalOvertime,
      complianceRate,
      shiftStr,
      offDaysStr,
      todayLog,
      isOffToday,
      todayStatusText,
      todayStatusShort,
      todayStatusClass
    };
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-200 dir-rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-purple-950 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-amber-500" />
            تتبع حضور الموظفين وإدارة حسابات الدخول وساعات العمل
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">
            إدارة الموظفين، تحديد مرتباتهم وحسابات دخولهم للنظام وحذف أو تعديل الموظفين بسهولة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Manual Attendance Registration Button */}
          <button
            onClick={() => {
              setManualModalEmpId(undefined);
              setManualModalStatus('PRESENT');
              setIsManualModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FFFBF7] border border-amber-300 text-purple-950 font-black text-xs hover:bg-amber-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>تسجيل حضور يدوي / عذر 📝</span>
          </button>

          {/* Employee QR Scan Button */}
          <button
            onClick={() => setIsScannerModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-white" />
            <span>مسح كود QR الحضور 📷</span>
          </button>

          {/* General Manager Printable QR Button */}
          <button
            onClick={async () => {
              try {
                const s = await api.getSettings();
                if (s?.storeNameAr) setStoreName(s.storeNameAr);
              } catch (e) {}
              setIsManagerQRModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-amber-300 font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer border border-amber-300/30"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>طباعة ملصق QR للمدير 🖨️</span>
          </button>

          {/* New Employee */}
          <button
            onClick={openNewEmployeeModal}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>إضافة موظف جديد ✨</span>
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-purple-100 pb-3">
        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'ATTENDANCE'
              ? 'bg-purple-950 text-amber-300 shadow-md'
              : 'bg-white text-slate-600 border border-purple-100 hover:bg-purple-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل وتتبع الحضور المفصل ({allAttendanceViewList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SCORECARDS')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'SCORECARDS'
              ? 'bg-purple-950 text-amber-300 shadow-md'
              : 'bg-white text-slate-600 border border-purple-100 hover:bg-purple-50'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>بطاقات الانضباط والالتزام اليومي لكل عامل ({filteredEmployees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'EMPLOYEES'
              ? 'bg-purple-950 text-amber-300 shadow-md'
              : 'bg-white text-slate-600 border border-purple-100 hover:bg-purple-50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>دليل وعقود وحسابات الموظفين ({filteredEmployees.length})</span>
        </button>
      </div>

      {/* TAB 1: DETAILED ATTENDANCE LEDGER */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-4">
          {/* Attendance KPI Cards - Interactive click to filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Present on time */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'PRESENT' ? 'ALL' : 'PRESENT')}
              className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                selectedStatusFilter === 'PRESENT'
                  ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500 shadow-md scale-102'
                  : 'bg-white border-emerald-100 hover:bg-emerald-50/50'
              }`}
            >
              <div>
                <span className="text-[11px] text-slate-500 font-bold block">حاضرون بموعد الدوام اليوم</span>
                <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                  {presentTodayCount} موظف
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">التزام تـام بالوقت 🟢</span>
              </div>
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </button>

            {/* 2. Late */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'LATE' ? 'ALL' : 'LATE')}
              className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                selectedStatusFilter === 'LATE'
                  ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500 shadow-md scale-102'
                  : 'bg-white border-amber-100 hover:bg-amber-50/50'
              }`}
            >
              <div>
                <span className="text-[11px] text-slate-500 font-bold block">متأخرون اليوم</span>
                <div className="text-xl font-black text-amber-900 font-mono mt-0.5">
                  {lateTodayCount} موظف
                </div>
                <span className="text-[10px] text-amber-700 font-bold">تجاوزوا المهلة المحددة 🟡</span>
              </div>
              <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </button>

            {/* 3. Weekly Rest Day */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'REST_DAY' ? 'ALL' : 'REST_DAY')}
              className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                selectedStatusFilter === 'REST_DAY'
                  ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500 shadow-md scale-102'
                  : 'bg-white border-blue-100 hover:bg-blue-50/50'
              }`}
            >
              <div>
                <span className="text-[11px] text-slate-500 font-bold block">في عطلة أسبوعية اليوم</span>
                <div className="text-xl font-black text-blue-900 font-mono mt-0.5">
                  {offTodayCount} موظف
                </div>
                <span className="text-[10px] text-blue-700 font-bold">راحة رسمية معتمدة 🔵</span>
              </div>
              <div className="p-3 bg-blue-100 text-blue-900 rounded-2xl shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
            </button>

            {/* 4. Approved Leaves */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'LEAVE' ? 'ALL' : 'LEAVE')}
              className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                selectedStatusFilter === 'LEAVE'
                  ? 'bg-purple-100 border-purple-500 ring-2 ring-purple-500 shadow-md scale-102'
                  : 'bg-white border-purple-100 hover:bg-purple-50/50'
              }`}
            >
              <div>
                <span className="text-[11px] text-slate-500 font-bold block">إجازات مبررة / مرضية</span>
                <div className="text-xl font-black text-purple-950 font-mono mt-0.5">
                  {leaveTodayCount} موظف
                </div>
                <span className="text-[10px] text-purple-700 font-bold">إجازات موثقة 🟣</span>
              </div>
              <div className="p-3 bg-purple-100 text-purple-900 rounded-2xl shrink-0">
                <FileText className="w-6 h-6" />
              </div>
            </button>

            {/* 5. Absent */}
            <button
              type="button"
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
              className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                selectedStatusFilter === 'ABSENT'
                  ? 'bg-rose-100 border-rose-500 ring-2 ring-rose-500 shadow-md scale-102'
                  : 'bg-white border-rose-100 hover:bg-rose-50/50'
              }`}
            >
              <div>
                <span className="text-[11px] text-slate-500 font-bold block">غائبون بدون مبرر اليوم</span>
                <div className="text-xl font-black text-rose-700 font-mono mt-0.5">
                  {absentTodayCount} موظف
                </div>
                <span className="text-[10px] text-rose-600 font-bold">لم يسجلوا حضوراً 🔴</span>
              </div>
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث باسم الموظف أو التاريخ (YYYY-MM-DD)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-4 py-2 bg-[#FAF7F2] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none"
              />
            </div>

            <select
              value={selectedEmpFilter}
              onChange={(e) => setSelectedEmpFilter(e.target.value)}
              className="px-3 py-2 bg-[#FAF7F2] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none"
            >
              <option value="">جميع الموظفين</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullNameAr} ({e.positionAr})
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#FAF7F2] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none"
            >
              <option value="ALL">جميع حالات الحضور</option>
              <option value="PRESENT">حاضر في الوقت 🟢</option>
              <option value="LATE">متأخر 🟡</option>
              <option value="REST_DAY">عطلة أسبوعية 🔵</option>
              <option value="LEAVE">إجازة مبررة 🟣</option>
              <option value="ABSENT">غائب بدون مبرر 🔴</option>
            </select>

            <button
              onClick={loadData}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-purple-950 cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Detailed Attendance Records Table */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 font-black border-b border-purple-100">
                  <tr>
                    <th className="p-3.5">التاريخ واليوم</th>
                    <th className="p-3.5">الموظف والوظيفة</th>
                    <th className="p-3.5">دوام الشفت المخصص</th>
                    <th className="p-3.5">العطلة المعتمدة</th>
                    <th className="p-3.5">وقت الحضور (Check-In)</th>
                    <th className="p-3.5">وقت الانصراف (Check-Out)</th>
                    <th className="p-3.5">ساعات العمل الإضافي</th>
                    <th className="p-3.5">إجمالي الساعات</th>
                    <th className="p-3.5">حالة الحضور المفصلة</th>
                    <th className="p-3.5 text-center">العمليات والتصحيح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                        لا توجد سجلات حضور تطابق الفلترة
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((att) => {
                      const emp = employees.find((e) => e.id === att.employeeId);
                      const shiftStr = emp ? `${emp.workStartTime || '08:00'} - ${emp.workEndTime || '17:00'}` : '08:00 - 17:00';
                      const offDaysStr = emp?.offDays && emp.offDays.length > 0 ? emp.offDays.join('، ') : (emp?.restDayAr || 'الجمعة');

                      return (
                        <tr key={att.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                          <td className="p-3.5 font-mono text-purple-950 font-black">{att.date}</td>
                          <td className="p-3.5">
                            <div className="font-black text-purple-950">{att.employeeNameAr}</div>
                            {emp?.positionAr && (
                              <div className="text-[10px] text-rose-600 font-bold">{emp.positionAr}</div>
                            )}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md inline-block my-1 border border-amber-200">
                            {shiftStr}
                          </td>
                          <td className="p-3.5 font-bold text-slate-500">{offDaysStr}</td>
                          <td className="p-3.5 font-mono font-black text-emerald-700">{att.checkIn || '--:--'}</td>
                          <td className="p-3.5 font-mono font-black text-rose-600">{att.checkOut || '--:--'}</td>
                          <td className="p-3.5 font-mono font-bold text-indigo-700">
                            {att.overtimeHours ? `+${att.overtimeHours} سا` : '-'}
                          </td>
                          <td className="p-3.5 font-mono font-black text-purple-950">{att.workingHours || 0} سا</td>
                          <td className="p-3.5">
                            {att.status === 'PRESENT' ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-200">
                                حاضر في الوقت 🟢
                              </span>
                            ) : att.status === 'LATE' ? (
                              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-200">
                                متأخر 🟡
                              </span>
                            ) : att.status === 'REST_DAY' ? (
                              <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2.5 py-1 rounded-full border border-blue-200">
                                عطلة أسبوعية معتمدة 🔵
                              </span>
                            ) : att.status === 'LEAVE' ? (
                              <span className="bg-purple-100 text-purple-900 text-[10px] font-black px-2.5 py-1 rounded-full border border-purple-200">
                                إجازة مبررة 🟣
                              </span>
                            ) : (
                              <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-full">
                                غائب 🔴
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => {
                                setManualModalEmpId(att.employeeId);
                                setManualModalStatus(att.status);
                                setIsManualModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-purple-950 rounded-xl text-[11px] font-black cursor-pointer inline-flex items-center gap-1"
                              title="تسجيل عذر أو تعديل السجل بحيادية"
                            >
                              <Settings className="w-3 h-3 text-amber-600" />
                              <span>تعديل عذر</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMPLOYEE COMPLIANCE SCORECARDS */}
      {activeTab === 'SCORECARDS' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-xs flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم الموظف أو المسمى الوظيفي في بطاقات الانضباط..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-purple-950 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-3xl border border-purple-100 text-center text-slate-400 font-black text-xs">
                لا يوجد موظفون يطابقون البحث
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const summary = getEmployeeAttendanceSummary(emp);

                return (
                  <div
                    key={emp.id}
                    className="bg-white p-5 rounded-3xl border border-purple-100 shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start border-b border-purple-100 pb-3">
                        <div>
                          <h3 className="font-black text-purple-950 text-base">{emp.fullNameAr}</h3>
                          <p className="text-xs text-rose-600 font-extrabold mt-0.5">{emp.positionAr}</p>
                        </div>
                        <div className="text-left bg-purple-50 px-3 py-1.5 rounded-2xl border border-purple-100">
                          <span className="text-[10px] text-slate-400 block font-bold">نسبة الانضباط</span>
                          <span className="text-sm font-black font-mono text-purple-950">{summary.complianceRate}%</span>
                        </div>
                      </div>

                      {/* Today's Live Status Badge */}
                      <div className={`px-3 py-1.5 rounded-xl border text-xs font-black text-center flex items-center justify-center gap-1.5 ${summary.todayStatusClass}`}>
                        <span className="text-[10px] text-slate-500 font-normal">حالة اليوم:</span>
                        <span>{summary.todayStatusText}</span>
                      </div>

                      {/* Schedule details */}
                      <div className="bg-[#FFFBF7] p-3 rounded-2xl border border-amber-200 text-xs font-bold space-y-1 text-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-500">أوقات الدوام اليومي:</span>
                          <span className="font-mono text-amber-900 font-black">{summary.shiftStr}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">أيام العطل الأسبوعية:</span>
                          <span className="font-black text-rose-700">{summary.offDaysStr}</span>
                        </div>
                      </div>

                      {/* Scorecard grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <span className="text-[10px] text-emerald-700 block">أيام الحضور في الوقت</span>
                          <span className="text-base font-black text-emerald-800 font-mono">{summary.presentDays} أيام 🟢</span>
                        </div>

                        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                          <span className="text-[10px] text-blue-700 block">عطل رسمية معتمدة</span>
                          <span className="text-base font-black text-blue-800 font-mono">{summary.restDays} أيام 🔵</span>
                        </div>

                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                          <span className="text-[10px] text-amber-700 block">مرات التأخير</span>
                          <span className="text-base font-black text-amber-900 font-mono">{summary.lateDays} مرات 🟡</span>
                        </div>

                        <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                          <span className="text-[10px] text-purple-700 block">إجازات مدفوعة/مرضية</span>
                          <span className="text-base font-black text-purple-900 font-mono">{summary.leaveDays} أيام 🟣</span>
                        </div>
                      </div>

                      {/* Hours Stats */}
                      <div className="pt-2 border-t border-purple-100 flex justify-between text-xs font-black">
                        <div>
                          <span className="text-slate-400 block text-[10px]">إجمالي الساعات المنجزة</span>
                          <span className="text-purple-950 font-mono">{summary.totalWorkedHours} ساعة</span>
                        </div>
                        <div className="text-left">
                          <span className="text-slate-400 block text-[10px]">ساعات العمل الإضافي</span>
                          <span className="text-emerald-700 font-mono">+{summary.totalOvertime} ساعة</span>
                        </div>
                      </div>
                    </div>

                    {/* Scorecard Action Buttons */}
                    <div className="pt-3 border-t border-purple-100 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedEmpForSchedule(emp)}
                        className="py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-purple-200"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>تخصيص الدوام ⚙️</span>
                      </button>
                      <button
                        onClick={() => {
                          setManualModalEmpId(emp.id);
                          setManualModalStatus('PRESENT');
                          setIsManualModalOpen(true);
                        }}
                        className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-amber-200"
                      >
                        <Settings className="w-3.5 h-3.5 text-amber-600" />
                        <span>تسجيل يدوي 📝</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EMPLOYEES DIRECTORY & ACCOUNTS MANAGEMENT */}
      {activeTab === 'EMPLOYEES' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-xs flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم الموظف أو المسمى الوظيفي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-purple-950 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-3xl border border-purple-100 text-center text-slate-400 font-black text-xs">
                لا يوجد موظفون في هذه القائمة
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const summary = getEmployeeAttendanceSummary(emp);
                const linkedUser = emp.userId
                  ? systemUsers.find((u) => u.id === emp.userId)
                  : systemUsers.find((u) =>
                      (u.phone && emp.phone && u.phone.replace(/[\s\-\+\(\)]/g, '') === emp.phone.replace(/[\s\-\+\(\)]/g, '')) ||
                      (u.name && u.name.trim() === emp.fullNameAr.trim())
                    ) || null;

                return (
                  <div
                    key={emp.id}
                    className="bg-white p-5 rounded-3xl border border-purple-100 shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-black text-purple-950 text-base">{emp.fullNameAr}</h3>
                          <p className="text-xs text-rose-600 font-extrabold mt-0.5">{emp.positionAr}</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-200">
                          نشط 🟢
                        </span>
                      </div>

                      {/* Live Today Attendance Badge & Mini Compliance Rate */}
                      <div className={`p-2.5 rounded-2xl border text-xs font-black flex items-center justify-between ${summary.todayStatusClass}`}>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span className="text-[11px]">{summary.todayStatusText}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/80 font-mono font-black shadow-2xs">
                          انضباط {summary.complianceRate}%
                        </span>
                      </div>

                      {/* Mini Attendance Metrics Bar */}
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-black">
                        <div className="bg-emerald-50 text-emerald-800 p-1.5 rounded-xl border border-emerald-200/60">
                          <span className="block text-[9px] text-emerald-600 font-bold">حضور بالموعد</span>
                          <span className="font-mono text-xs">{summary.presentDays} يوم</span>
                        </div>
                        <div className="bg-amber-50 text-amber-900 p-1.5 rounded-xl border border-amber-200/60">
                          <span className="block text-[9px] text-amber-700 font-bold">تأخيرات</span>
                          <span className="font-mono text-xs">{summary.lateDays} مرات</span>
                        </div>
                        <div className="bg-purple-50 text-purple-950 p-1.5 rounded-xl border border-purple-200/60">
                          <span className="block text-[9px] text-purple-700 font-bold">إجمالي العمل</span>
                          <span className="font-mono text-xs">{summary.totalWorkedHours} سا</span>
                        </div>
                      </div>

                      {/* System User Account Info Badge */}
                      <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs font-black">
                        {linkedUser ? (
                          <div className="flex items-center justify-between text-purple-950">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <Key className="w-3.5 h-3.5 text-amber-600" />
                              <span>حساب الدخول:</span>
                              <span className="font-mono text-purple-900 bg-white px-2 py-0.5 rounded-md border border-amber-200 font-black">
                                {linkedUser.username}
                              </span>
                            </span>
                            <span className="text-[10px] text-amber-900 bg-amber-200 px-1.5 py-0.2 rounded-md font-bold">
                              {linkedUser.roleCode === 'CASHIER'
                                ? 'بائع'
                                : linkedUser.roleCode === 'STOREKEEPER'
                                ? 'مخزن'
                                : linkedUser.roleCode === 'ACCOUNTANT'
                                ? 'محاسب'
                                : linkedUser.roleCode === 'MANAGER'
                                ? 'مسؤول'
                                : 'مستخدم'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-slate-500 text-[11px]">
                            <span className="flex items-center gap-1">
                              <Key className="w-3.5 h-3.5 text-slate-400" />
                              <span>لا يملك حساب دخول للنظام</span>
                            </span>
                            <button
                              onClick={() => openEditEmployeeModal(emp)}
                              className="text-[10px] text-amber-700 bg-white px-2 py-0.5 rounded-md border border-amber-300 font-black hover:bg-amber-100 cursor-pointer"
                            >
                              + إضافة حساب
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="text-xs space-y-1.5 text-slate-600 font-bold bg-[#FFFBF7] p-3 rounded-2xl border border-amber-200">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold">الهاتف:</span>
                          <span className="font-mono text-purple-950">{emp.phone || 'غير مسجل'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold">أوقات العمل اليومية:</span>
                          <span className="font-mono font-black text-amber-900">{summary.shiftStr}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold">العطل الأسبوعية المعتمدة:</span>
                          <span className="font-black text-rose-700">{summary.offDaysStr}</span>
                        </div>
                      </div>

                      <div className="flex justify-between text-xs font-bold pt-1">
                        <div>
                          <span className="text-slate-400 block text-[10px]">الراتب الأساسي</span>
                          <span className="text-purple-950 font-black">{emp.baseSalary.toLocaleString()} د.ج</span>
                        </div>
                        {emp.commissionRatePercent ? (
                          <div className="text-left">
                            <span className="text-slate-400 block text-[10px]">نسبة العمولة</span>
                            <span className="text-amber-600 font-black">{emp.commissionRatePercent}%</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Actions Grid (Edit, Schedule, Manual, Delete) */}
                    <div className="pt-3 border-t border-purple-100 space-y-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => openEditEmployeeModal(emp)}
                          className="py-2 bg-slate-100 hover:bg-slate-200 text-purple-950 font-black text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="تعديل بيانات الموظف ورسالة الدخول والكلمة السرية"
                        >
                          <Edit className="w-3 h-3 text-indigo-600" />
                          <span>تعديل ✏️</span>
                        </button>

                        <button
                          onClick={() => setSelectedEmpForSchedule(emp)}
                          className="py-2 bg-purple-50 hover:bg-purple-100 text-purple-950 font-black text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer border border-purple-100"
                          title="تخصيص أوقات الدوام والعطل المخصصة"
                        >
                          <Settings className="w-3 h-3 text-amber-600" />
                          <span>الدوام ⚙️</span>
                        </button>

                        <button
                          onClick={() => {
                            setManualModalEmpId(emp.id);
                            setManualModalStatus('PRESENT');
                            setIsManualModalOpen(true);
                          }}
                          className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 font-black text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer border border-amber-200"
                          title="تسجيل حضور يدوي أو عذر"
                        >
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>حضور 📝</span>
                        </button>
                      </div>

                      {/* Delete Employee Button */}
                      <button
                        onClick={() => handleDeleteEmployee(emp)}
                        className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>حذف الموظف وحسابه نهائياً 🗑️</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Employee & Account Credentials Modal */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-purple-100 space-y-4 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <h3 className="font-black text-lg text-purple-950 flex items-center gap-2">
                {editingEmp ? <Edit className="w-5 h-5 text-indigo-600" /> : <UserPlus className="w-5 h-5 text-amber-500" />}
                <span>{editingEmp ? `تعديل الموظف: ${editingEmp.fullNameAr}` : 'إضافة موظف جديد وتحديد حساب دخوله ✨'}</span>
              </h3>
              <button
                onClick={() => setIsEmpModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs font-black text-purple-950">
              {/* Employee Main Info */}
              <div className="space-y-3 p-4 bg-[#FFFBF7] rounded-2xl border border-amber-200">
                <h4 className="text-xs font-black text-amber-900 border-b border-amber-200 pb-1">
                  1. البيانات الوظيفية والشخصية:
                </h4>
                <div>
                  <label className="block mb-1">الاسم الكامل للموظف *</label>
                  <input
                    type="text"
                    required
                    value={fullNameAr}
                    onChange={(e) => setFullNameAr(e.target.value)}
                    placeholder="مثال: محمد الأمين زروقي"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-bold focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1">رقم الهاتف *</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0550 12 34 56"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">المسمى الوظيفي *</label>
                    <input
                      type="text"
                      required
                      value={positionAr}
                      onChange={(e) => setPositionAr(e.target.value)}
                      placeholder="بائع، مسؤول مخزن..."
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1">الراتب الأساسي الشهري (د.ج) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">نسبة العمولة % على المبيعات</label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={commissionRatePercent}
                      onChange={(e) => setCommissionRatePercent(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Working Hours & Weekly Off-Days Section */}
              <div className="space-y-3 p-4 bg-[#FFFBF7] rounded-2xl border border-amber-200">
                <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5 border-b border-amber-200 pb-1">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>2. ساعات الدوام وأيام العطل والراحة الأسبوعية:</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-slate-700">وقت بدء الدوام صباحاً *</label>
                    <input
                      type="time"
                      required
                      value={workStartTime}
                      onChange={(e) => setWorkStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-700">وقت نهاية الدوام / الانصراف *</label>
                    <input
                      type="time"
                      required
                      value={workEndTime}
                      onChange={(e) => setWorkEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-black">أيام العطلة الأسبوعية (اختر أي يوم أو عدة أيام للموظف):</label>
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                      {offDays.length} يوم راحة
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = offDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleOffDay(day)}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white shadow-xs scale-105 ring-2 ring-amber-300'
                              : 'bg-white border border-amber-200 text-slate-600 hover:bg-amber-50'
                          }`}
                        >
                          <span>{day}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Login Credentials Section */}
              <div className="space-y-3 p-4 bg-purple-50/60 rounded-2xl border border-purple-200">
                <div className="flex items-center justify-between border-b border-purple-200 pb-1">
                  <h4 className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-600" />
                    <span>3. بيانات حساب تسجيل الدخول بالنظام:</span>
                  </h4>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-black text-purple-900">
                    <input
                      type="checkbox"
                      checked={createAccount}
                      onChange={(e) => setCreateAccount(e.target.checked)}
                      className="w-4 h-4 rounded-md accent-amber-500 cursor-pointer"
                    />
                    <span>تفعيل حساب دخول</span>
                  </label>
                </div>

                {createAccount && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block mb-1 text-slate-700">
                        اسم المستخدم أو البريد الإلكتروني لدخول النظام *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required={createAccount}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="مثال: mohamed أو mohamed@zerrouki.dz"
                          className="w-full pr-9 pl-3 py-2 bg-white border border-purple-300 rounded-xl outline-none font-bold text-xs text-purple-950 focus:ring-2 focus:ring-purple-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 text-slate-700">
                        كلمة السر الخاصة بالموظف لتسجيل الدخول {editingEmp ? '(اتركها فارغة للإبقاء على الحالية)' : '*'}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required={createAccount && !editingEmp}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={editingEmp ? 'اكتب كلمة سر جديدة لتعديلها...' : 'مثال: 123456'}
                          className="w-full pr-9 pl-3 py-2 bg-white border border-purple-300 rounded-xl outline-none font-mono font-bold text-xs text-purple-950 focus:ring-2 focus:ring-purple-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 text-slate-700">
                        صلاحية ودور الحساب داخل النظام *
                      </label>
                      <div className="relative">
                        <Shield className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                          value={userRoleCode}
                          onChange={(e) => setUserRoleCode(e.target.value)}
                          className="w-full pr-9 pl-3 py-2 bg-white border border-purple-300 rounded-xl outline-none font-bold text-xs text-purple-950 focus:ring-2 focus:ring-purple-400"
                        >
                          <option value="CASHIER">أمين الصندوق / البائع (واجهة البيع POS)</option>
                          <option value="STOREKEEPER">مسؤول المخزن (المنتجات والمشتريات)</option>
                          <option value="ACCOUNTANT">المحاسب المالي (المصاريف والتقارير والرواتب)</option>
                          <option value="MANAGER">المسؤول التنفيذي للمحل</option>
                          <option value="OWNER">مدير عام (صلاحية كاملة)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl font-black text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black rounded-xl shadow-md hover:brightness-110 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingEmp ? 'حفظ التعديلات ✨' : 'حفظ وإنشاء الموظف ✨'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* General Manager Printable QR Code Modal */}
      <ManagerAttendanceQRModal
        isOpen={isManagerQRModalOpen}
        onClose={() => setIsManagerQRModalOpen(false)}
        qrToken={managerQRToken}
        storeName={storeName}
      />

      {/* Employee Schedule Customization Modal */}
      {selectedEmpForSchedule && (
        <EmployeeScheduleModal
          isOpen={!!selectedEmpForSchedule}
          onClose={() => setSelectedEmpForSchedule(null)}
          employee={selectedEmpForSchedule}
          systemUsers={systemUsers}
          onScheduleUpdated={() => loadData()}
        />
      )}

      {/* Employee Camera / QR Scanner Modal */}
      <ScanAttendanceModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onScanSuccess={() => loadData()}
      />

      {/* Manager Manual Attendance & Excuse Registration Modal */}
      <ManualAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setManualModalEmpId(undefined);
          setManualModalStatus(undefined);
        }}
        employees={employees}
        initialEmployeeId={manualModalEmpId}
        initialStatus={manualModalStatus}
        onRecordSaved={() => loadData()}
      />

      {/* Custom React Delete Confirmation Modal */}
      {empToDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-rose-200 space-y-4 shadow-2xl text-purple-950">
            <div className="flex items-center gap-3 border-b border-rose-100 pb-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-rose-950">تأكيد حذف الموظف نهائياً ⚠️</h3>
                <p className="text-xs text-slate-500 font-bold">هذا الإجراء لا يمكن التراجع عنه بعد إتمامه</p>
              </div>
            </div>

            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 text-xs font-bold space-y-2">
              <p className="text-slate-800">
                هل أنت متأكد من رغبتك في حذف الموظف:
              </p>
              <div className="bg-white p-3 rounded-xl border border-rose-200 font-black text-rose-900 flex justify-between items-center">
                <span>{empToDeleteConfirm.fullNameAr}</span>
                <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-extrabold">{empToDeleteConfirm.positionAr}</span>
              </div>
              <p className="text-[11px] text-rose-700 font-semibold">
                سيتم إزالة الموظف وحساب دخوله بالنظام وسجلاته بشكل كامل ونهائي.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEmpToDeleteConfirm(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-black text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                إلغاء ✖
              </button>

              <button
                type="button"
                onClick={confirmExecutionDeleteEmployee}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 text-white font-black text-xs shadow-md hover:brightness-110 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>تأكيد الحذف النهائي 🗑️</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
