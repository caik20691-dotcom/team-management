import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type Notification,
} from '../api/client';

const typeColor: Record<string, string> = {
  announcement: 'bg-rose-50 text-rose-700 border-rose-200',
  task: 'bg-blue-50 text-blue-700 border-blue-200',
  sop: 'bg-violet-50 text-violet-700 border-violet-200',
  policy: 'bg-amber-50 text-amber-700 border-amber-200',
  system: 'bg-slate-50 text-slate-400 border-slate-200',
};
const typeLabel: Record<string, string> = {
  announcement: '公告',
  task: '任务',
  sop: 'SOP',
  policy: '制度',
  system: '系统',
};

interface Props {
  onNotificationClick?: (notif: Notification) => void;
}

export default function NotificationBell({ onNotificationClick }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Load notifications when panel opens
  useEffect(() => {
    if (open && user) load();
  }, [open, user?.id]);

  async function load() {
    if (!user) return;
    try {
      const data = await fetchNotifications(user.id);
      setNotifs(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch {}
  }

  const handleMarkRead = useCallback(async (n: Notification) => {
    if (n.read) {
      onNotificationClick?.(n);
      setOpen(false);
      return;
    }
    try {
      await markNotificationRead(n.id);
      setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x));
    } catch {}
    onNotificationClick?.(n);
    setOpen(false);
  }, [onNotificationClick]);

  async function handleMarkAllRead() {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.id);
      setNotifs(ns => ns.map(n => ({ ...n, read: true })));
    } catch {}
  }

  async function handleDelete(e: React.MouseEvent, n: Notification) {
    e.stopPropagation();
    try {
      await deleteNotification(n.id);
      setNotifs(ns => ns.filter(x => x.id !== n.id));
    } catch {}
  }

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-400 hover:text-violet-500 rounded-xl hover:bg-violet-50 transition-all"
        title="消息通知"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 max-h-[420px] bg-white rounded-xl border border-slate-200 shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-900">消息通知</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-violet-600 hover:text-violet-700 flex items-center gap-1"
              >
                <CheckCheck size={12} /> 全部已读
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">暂无通知</div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-2.5 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50 transition-colors cursor-pointer ${n.read ? '' : 'bg-violet-50/30'}`}
                  onClick={() => handleMarkRead(n)}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${n.read ? 'bg-transparent' : 'bg-violet-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${typeColor[n.type] || 'bg-slate-50 text-slate-500'}`}>
                          {typeLabel[n.type] || n.type}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-auto shrink-0">{n.createdAt}</span>
                      </div>
                      <p className={`text-sm font-medium leading-snug ${n.read ? 'text-slate-500' : 'text-slate-900'}`}>{n.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, n)}
                      className="mt-1 shrink-0 p-1 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
