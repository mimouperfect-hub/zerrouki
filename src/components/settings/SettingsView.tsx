import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon, Download, RotateCcw, ShieldCheck, Key, Store, Phone, MapPin, Save,
  UserCheck, Lock, Eye, EyeOff, FileText, CheckCircle, AlertTriangle, Database, Upload, RefreshCw, Sparkles, Cloud, Globe, CheckCircle2
} from 'lucide-react';
import { api } from '../../api/client';
import { SystemSettings, User } from '../../types';
import { ManagerPinModal } from '../common/ManagerPinModal';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState(false);

  // Manager Credentials state
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [credSubmitting, setCredSubmitting] = useState(false);
  const [credSuccessMsg, setCredSuccessMsg] = useState<string | null>(null);
  const [credErrorMsg, setCredErrorMsg] = useState<string | null>(null);

  // Settings Save State
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Firebase Cloud State
  const [firebaseStatus, setFirebaseStatus] = useState<{ connected: boolean; projectId?: string; syncedAt?: string } | null>(null);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [cloudMsg, setCloudMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      setLoading(true);
      const [sets, backs, meRes, fbStatus] = await Promise.all([
        api.getSettings(),
        api.getBackups(),
        api.getMe(),
        api.getFirebaseStatus().catch(() => ({ connected: false }))
      ]);
      setSettings(sets);
      setBackups(backs);
      setCurrentUser(meRes.user);
      setFirebaseStatus(fbStatus);
      if (meRes.user) {
        setNewUsername(meRes.user.username);
      }
    } catch (e) {
      console.error('فشل تحميل إعدادات المحل:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCloudSync = async () => {
    try {
      setSyncingCloud(true);
      setCloudMsg(null);
      const res = await api.triggerFirebaseSync();
      setCloudMsg(res.message);
      const status = await api.getFirebaseStatus();
      setFirebaseStatus(status);
      setTimeout(() => setCloudMsg(null), 6000);
    } catch (err: any) {
      setCloudMsg(err.message || 'فشلت المزامنة السحابية');
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSettingsSaving(true);
      await api.updateSettings(settings);
      setSettingsSuccessMsg('تم حفظ إعدادات المحل والنظام بنجاح!');
      setTimeout(() => setSettingsSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleUpdateManagerCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredErrorMsg(null);
    setCredSuccessMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setCredErrorMsg('كلمة السر الجديدة وتأكيد كلمة السر غير متطابقين');
      return;
    }

    if (!newUsername.trim()) {
      setCredErrorMsg('يرجى كتابة اسم مستخدم صالح');
      return;
    }

    try {
      setCredSubmitting(true);
      const res = await api.updateCredentials({
        newUsername: newUsername.trim(),
        newPassword: newPassword ? newPassword.trim() : undefined,
        currentPassword: currentPassword ? currentPassword.trim() : undefined
      });

      setCredSuccessMsg('تم تغيير اسم المستخدم وكلمة السر بنجاح! احتفظ ببياناتك الجديدة للرات المادمة.');
      setCurrentUser(res.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => setCredSuccessMsg(null), 4000);
    } catch (err: any) {
      setCredErrorMsg(err.message || 'فشل تغيير بيانات الدخول');
    } finally {
      setCredSubmitting(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const res = await api.createBackup();
      alert(`تم إنشاء نسخة احتياطية بنجاح: ${res.filename}`);
      loadSettingsData();
    } catch (err: any) {
      alert('فشل إنشاء النسخة الاحتياطية');
    }
  };

  const handleResetDemoData = () => {
    setIsResetPinModalOpen(true);
  };

  const handleConfirmResetData = async (pin?: string) => {
    if (!pin) {
      alert('يرجى إدخال رمز PIN الخاص بالمدير العام لعملية تصفير النظام');
      return;
    }
    try {
      await api.resetDemoData(pin);
      alert('تم تصفير البيانات وإصلاح النظام بنجاح');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'فشلت عملية إعادة الضبط. رمز PIN غير صحيح');
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-12 text-center text-gray-500 font-bold flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <span>جاري تحميل إعدادات المحل والنسخ الاحتياطي...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200 dir-rtl">
      
      {/* Top Header */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white p-6 rounded-3xl border border-amber-400/30 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-amber-400 flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 text-amber-400 animate-spin-slow" />
            إعدادات المحل وأمان المدير العام
          </h1>
          <p className="text-xs text-amber-100/80 font-bold mt-1">
            إدارة معلومات المؤسسة بالفواتير، تغيير اسم المستخدم وكلمة سر المدير العام، والنسخ الاحتياطي
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 px-3.5 py-2 rounded-2xl">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-black text-amber-300">
            الحساب الحالي: {currentUser?.name || 'المدير العام'} ({currentUser?.username})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. STORE INFORMATION & INVOICE SETTINGS */}
        <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-md space-y-5">
          <div className="flex justify-between items-center border-b border-purple-100 pb-3">
            <h3 className="font-black text-purple-950 text-base flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-500" />
              بيانات الهوية والفواتير المحل
            </h3>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-black">
              تظهر بالفاتورة الإلكتورنية والمطبوعة 🧾
            </span>
          </div>

          {settingsSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-black flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{settingsSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-black text-purple-950">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-gray-700">اسم المحل (بالعربية) *</label>
                <input
                  type="text"
                  required
                  value={settings.storeNameAr}
                  onChange={(e) => setSettings({ ...settings, storeNameAr: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200/80 rounded-xl outline-none font-bold text-purple-950 focus:bg-white focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block mb-1 text-gray-700">اسم المحل (بالفرنسية / Latine)</label>
                <input
                  type="text"
                  value={settings.storeNameFr || ''}
                  onChange={(e) => setSettings({ ...settings, storeNameFr: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200/80 rounded-xl outline-none font-bold text-purple-950 focus:bg-white focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-gray-700">الجملة الترحيبية / الشعار بالفاتورة</label>
              <input
                type="text"
                value={settings.taglineAr || ''}
                onChange={(e) => setSettings({ ...settings, taglineAr: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200/80 rounded-xl outline-none font-bold text-purple-950 focus:bg-white focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-gray-700">رقم الهاتف للاتصال *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                  <input
                    type="text"
                    required
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full pr-3.5 pl-9 py-2.5 bg-[#FFFBF7] border border-amber-200/80 rounded-xl outline-none font-mono font-bold text-purple-950 focus:bg-white focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-gray-700">رمز PIN السري للمدير (6 أرقام) *</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={settings.managerPin}
                    onChange={(e) => setSettings({ ...settings, managerPin: e.target.value })}
                    className="w-full pr-3.5 pl-9 py-2.5 bg-[#FFFBF7] border border-amber-200/80 rounded-xl outline-none font-mono font-black text-center text-sm tracking-widest text-purple-950 focus:bg-white focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block mb-1 text-gray-700">عنوان المحل التجاري</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                <input
                  type="text"
                  value={settings.addressAr || ''}
                  onChange={(e) => setSettings({ ...settings, addressAr: e.target.value })}
                  className="w-full pr-3.5 pl-9 py-2.5 bg-[#FFFBF7] border border-amber-200/80 rounded-xl outline-none font-bold text-purple-950 focus:bg-white focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-gray-700">تذييل الفاتورة (النص المكتوب بأسفل الوصل)</label>
              <input
                type="text"
                value={settings.invoiceFooterAr || ''}
                onChange={(e) => setSettings({ ...settings, invoiceFooterAr: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200/80 rounded-xl outline-none font-bold text-purple-950 focus:bg-white focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={settingsSaving}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs shadow-md hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-white" />
              <span>{settingsSaving ? 'جاري الحفظ...' : 'حفظ وتحديث بيانات المحل ✨'}</span>
            </button>
          </form>
        </div>

        {/* 2. GENERAL MANAGER CREDENTIALS & SECURITY */}
        <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-md space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-purple-100 pb-3 mb-4">
              <h3 className="font-black text-purple-950 text-base flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-500" />
                تغيير اسم المستخدم وكلمة سر المدير العام
              </h3>
              <span className="text-[10px] bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full font-black">
                حماية وأمان الحساب 🔒
              </span>
            </div>

            {credSuccessMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-black flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{credSuccessMsg}</span>
              </div>
            )}

            {credErrorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-black flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{credErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateManagerCredentials} className="space-y-4 text-xs font-black text-purple-950">
              
              {/* Current Username Info */}
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between">
                <span className="text-purple-900 font-bold">اسم المستخدم الحالي:</span>
                <span className="font-mono text-sm bg-purple-950 text-amber-300 px-3 py-1 rounded-xl font-black">
                  {currentUser?.username || 'owner'}
                </span>
              </div>

              {/* New Username Input */}
              <div>
                <label className="block mb-1 text-gray-700">اسم المستخدم الجديد (Username)</label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم الجديد..."
                    className="w-full pr-3.5 pl-9 py-2.5 bg-[#FFFBF7] border border-amber-200/80 rounded-xl outline-none font-mono font-bold text-purple-950 focus:bg-white focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              {/* Current Password Input */}
              <div>
                <label className="block mb-1 text-gray-700">كلمة السر الحالية (للتأكيد)</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="أدخل كلمة السر الحالية..."
                    className="w-full pr-3.5 pl-9 py-2.5 bg-[#FFFBF7] border border-amber-200/80 rounded-xl outline-none font-mono font-bold text-purple-950 focus:bg-white focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-950"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-gray-700">كلمة السر الجديدة (الجديدة)</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="كلمة السر الجديدة..."
                      className="w-full pr-3.5 pl-9 py-2.5 bg-[#FFFBF7] border border-amber-200/80 rounded-xl outline-none font-mono font-bold text-purple-950 focus:bg-white focus:ring-2 focus:ring-purple-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-950"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-gray-700">تأكيد كلمة السر الجديدة</label>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="تأكيد كلمة السر..."
                    className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200/80 rounded-xl outline-none font-mono font-bold text-purple-950 focus:bg-white focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={credSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-900 text-amber-300 font-black text-xs shadow-md hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
              >
                <Key className="w-4 h-4 text-amber-400" />
                <span>{credSubmitting ? 'جاري التحديث...' : 'تحديث اسم المستخدم وكلمة السر 🔑'}</span>
              </button>
            </form>
          </div>

          {/* Security Tip Note */}
          <div className="mt-4 p-3 bg-amber-50 rounded-2xl border border-amber-200/60 text-[11px] font-bold text-amber-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>نصيحة أمان: بعد تغيير اسم المستخدم أو كلمة السر، تأكد من حفظ بياناتك الجديدة في مكان آمن.</span>
          </div>
        </div>

      </div>

      {/* 2.5. FIREBASE CLOUD DATABASE CONTROL CARD */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 text-white p-6 rounded-3xl border border-amber-300/30 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <h3 className="font-black text-white text-base flex items-center gap-2.5">
            <Cloud className="w-6 h-6 text-amber-400 animate-pulse" />
            قاعدة البيانات السحابية والمزامنة الفورية (Firebase Firestore)
          </h3>
          <span className="text-[10px] bg-amber-400/20 border border-amber-400/40 text-amber-300 px-3 py-1 rounded-full font-black flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            Google Cloud Storage ☁️
          </span>
        </div>

        {cloudMsg && (
          <div className="p-3 bg-amber-400/20 border border-amber-400/40 text-amber-200 rounded-2xl text-xs font-black flex items-center gap-2 animate-in fade-in duration-200">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{cloudMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-1">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-black">
              <span className="text-gray-300">حالة الربط بالسحابة:</span>
              {firebaseStatus?.connected ? (
                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-xl flex items-center gap-1 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  متصل بالسحابة الفايربيز 🟢
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-400/40 text-amber-300 rounded-xl flex items-center gap-1 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  المزامنة المحلية الهجيرة (جاهز لمفاتيح Firebase) ⚡
                </span>
              )}
            </div>

            <p className="text-[11px] text-gray-300 leading-relaxed font-bold">
              يتم حفظ ومزامنة كافة المنتجات، الفواتير، ديون العملاء والموردين، الحضور والراتب سحابياً على خوادم **Firebase Firestore** مع احتفاظ بأعلى سرعة أداء.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-end">
            <button
              type="button"
              onClick={handleTriggerCloudSync}
              disabled={syncingCloud}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-white ${syncingCloud ? 'animate-spin' : ''}`} />
              <span>{syncingCloud ? 'جاري المزامنة السحابية...' : 'مزامنة البيانات سحابياً الآن ✨'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. BACKUP & DATABASE SNAPSHOTS CONTROL */}
      <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-md space-y-5">
        <div className="flex justify-between items-center border-b border-purple-100 pb-3">
          <h3 className="font-black text-purple-950 text-base flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            النسخ الاحتياطي واسترجاع بيانات المحل
          </h3>
          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full font-black">
            Snapshots & Data Recovery 💾
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleCreateBackup}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-amber-300 font-black text-xs shadow-lg hover:brightness-110 flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-98"
          >
            <Download className="w-5 h-5 text-amber-400" />
            <span>إنشاء نسخة احتياطية فورية الآن (Snapshot JSON)</span>
          </button>

          <button
            onClick={handleResetDemoData}
            className="w-full py-4 px-5 rounded-2xl bg-rose-50 text-rose-700 font-black text-xs border border-rose-200 hover:bg-rose-100 flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-98"
          >
            <RotateCcw className="w-5 h-5 text-rose-600" />
            <span>تصفير وإعادة ضبط النظام (Clean Zero Data)</span>
          </button>
        </div>

        {/* Saved Backups Table */}
        <div className="border-t border-purple-100 pt-4 space-y-3">
          <h4 className="font-black text-xs text-purple-950 flex items-center justify-between">
            <span>سجل النسخ الاحتياطية المحفوظة بالسيرفر:</span>
            <span className="text-gray-400 font-mono">({backups.length} نسخة)</span>
          </h4>

          {backups.length === 0 ? (
            <div className="p-4 text-center text-xs font-bold text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              لا توجد نسخ احتياطية سابقة. اضغط على الزر أعلاه لإنشاء أول نسخة احتياطية!
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {backups.map((b, i) => (
                <div key={i} className="p-3 bg-[#FFFBF7] border border-amber-200/60 rounded-2xl text-xs font-mono font-bold flex justify-between items-center hover:bg-amber-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span className="text-purple-950">{b.filename}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-[10px]">{b.sizeKb} KB</span>
                    <span className="text-emerald-700 text-[10px] bg-emerald-100 px-2 py-0.5 rounded-md font-sans font-black">محفوظة 🟢</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manager Approval PIN Modal for System Reset */}
      <ManagerPinModal
        isOpen={isResetPinModalOpen}
        onClose={() => setIsResetPinModalOpen(false)}
        onSuccess={(pin) => handleConfirmResetData(pin)}
        titleAr="تأكيد تصفير وإعادة ضبط النظام برمز المدير"
        descriptionAr="تحذير هام جداً: هذه العملية ستؤدي لإعادة ضبط كافة بيانات المحل والنظام ولا يمكن التراجع عنها. يرجى إدخال رمز PIN السري للمدير العام للمتابعة."
      />

    </div>
  );
};
