import React, { useEffect, useState } from 'react';
import { Bell, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../../api/client';
import { SystemNotification } from '../../types';

export const NotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  const markRead = async (id: string) => {
    await api.markNotificationRead(id);
    loadNotifications();
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-black text-purple-950 flex items-center gap-2">
          <Bell className="w-6 h-6 text-amber-500" />
          مركز الإشعارات والتنبيهات الإدارية
        </h1>
        <p className="text-xs text-slate-500 font-bold mt-1">
          تنبيهات انخفاض المخزون، قرب انتهاء تواريخ الصلاحية، الديون المستحقة والاعتمادات
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-purple-100 shadow-xs divide-y divide-purple-50">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            onClick={() => markRead(notif.id)}
            className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
              notif.isRead ? 'bg-white' : 'bg-amber-50/50 font-bold'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-purple-950">{notif.titleAr}</h4>
                <p className="text-xs text-slate-600 font-bold mt-0.5">{notif.messageAr}</p>
                <span className="text-[10px] text-slate-400 font-mono font-bold mt-1 block">
                  {new Date(notif.createdAt).toLocaleString('ar-DZ')}
                </span>
              </div>
            </div>

            {!notif.isRead && (
              <span className="text-[10px] bg-gradient-to-r from-amber-500 to-rose-500 text-white px-2.5 py-1 rounded-full font-black shadow-xs">
                جديد ✨
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
