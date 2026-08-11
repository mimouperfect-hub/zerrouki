import React, { useEffect, useState } from 'react';
import { ShieldCheck, Search, Clock, Lock } from 'lucide-react';
import { api } from '../../api/client';
import { AuditLog } from '../../types';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs();
      setLogs(res);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      !searchQuery ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.detailsAr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-purple-950 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
            سجل التدقيق والعمليات الحساسة (Audit Log)
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">
            سجل دائم وغير قابل للتعديل لتتبع عمليات البيع، التعديلات المالية، إلغاء الفواتير، والرواتب
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="تصفية السجل بالإجراء أو المستخدم..."
            className="w-full pr-9 pl-4 py-2 bg-[#FFFBF7] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 text-purple-950 font-black border-b border-purple-100">
              <tr>
                <th className="p-3.5">التاريخ والوقت</th>
                <th className="p-3.5">المستخدم</th>
                <th className="p-3.5">نوع الإجراء (Action)</th>
                <th className="p-3.5">التفاصيل والوصف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 font-bold">
                    جاري تحميل سجل الأمان والتدقيق...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 font-bold">
                    لا توجد سجلات مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                    <td className="p-3.5 font-mono text-gray-500">
                      {new Date(log.createdAt).toLocaleString('ar-DZ')}
                    </td>
                    <td className="p-3.5 font-bold text-[#2A160A]">{log.userName}</td>
                    <td className="p-3.5">
                      <span className="bg-[#3D2314]/10 text-[#3D2314] px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-800 font-medium">{log.detailsAr}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
