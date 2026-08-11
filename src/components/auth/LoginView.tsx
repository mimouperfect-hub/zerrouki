import React, { useState } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { api } from '../../api/client';
import { User } from '../../types';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername || !password) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.login({
        username: emailOrUsername,
        password
      });
      localStorage.setItem('zerrouki_token', res.token);
      localStorage.setItem('zerrouki_user', JSON.stringify(res.user));
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تسجيل الدخول، يرجى التأكد من البريد وكلمة السر');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2E1065] via-[#3B0764] to-[#1E1B4B] flex items-center justify-center p-4 relative overflow-hidden dir-rtl select-none">
      {/* Background Decor Ambient Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-rose-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-violet-400/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-amber-300/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3.5 bg-white/10 rounded-3xl border border-amber-300/40 shadow-xl backdrop-blur-md">
            <BrandLogo size="lg" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white mt-2 drop-shadow-xs">تسجيل الدخول للنظام</h1>
            <p className="text-xs text-purple-200/90 font-bold mt-1">
              أدخل البريد الإلكتروني وكلمة السر المسلمة لك من المدير العام
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-950/90 border border-rose-500/70 rounded-2xl text-rose-100 text-xs font-black text-center animate-in fade-in duration-200 shadow-md">
            {errorMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-amber-200 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-amber-400" />
              <span>البريد الإلكتروني أو اسم المستخدم:</span>
            </label>
            <input
              type="text"
              required
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="مثال: admin@zerrouki.dz"
              className="w-full px-4 py-3 bg-black/20 border border-amber-300/30 rounded-2xl text-xs font-bold text-white placeholder:text-purple-200/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-black/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-amber-200 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>كلمة السر:</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-black/20 border border-amber-300/30 rounded-2xl text-xs font-bold text-white placeholder:text-purple-200/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-black/40 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black text-sm shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            <span>{loading ? 'جاري التحقق...' : 'دخول إلى النظام ✨'}</span>
          </button>
        </form>

      </div>
    </div>
  );
};

