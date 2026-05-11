import { useEffect, useState } from 'react';
import { UserCircle, Mail, Phone, Building2, Save, Star, Clock, FileText, Megaphone, BookOpen, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIsAdmin } from '../context/AuthContext';
import { fetchTasks, fetchAnnouncements, fetchKBArticles, updateUser, fetchUsers } from '../api/client';
import type { Task, Announcement, KBArticle, User } from '../api/client';

// Recently viewed doc type
interface RecentDoc {
  id: string;
  title: string;
  type: 'kb' | 'sop' | 'policy' | 'announcement';
  viewedAt: string;
}

// Favorite item type
interface FavoriteItem {
  id: string;
  title: string;
  type: 'kb' | 'sop' | 'policy' | 'announcement';
}

const RECENT_KEY = 'tm_recent_docs';
const FAVORITE_KEY = 'tm_favorites';

function getRecentDocs(): RecentDoc[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveRecentDocs(docs: RecentDoc[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(docs.slice(0, 20)));
}
function getFavorites(): FavoriteItem[] {
  try { return JSON.parse(localStorage.getItem(FAVORITE_KEY) || '[]'); } catch { return []; }
}
function saveFavorites(items: FavoriteItem[]) {
  localStorage.setItem(FAVORITE_KEY, JSON.stringify(items));
}

export default function MyWorkspacePage() {
  const { user, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Data
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myAnnouncements, setMyAnnouncements] = useState<Announcement[]>([]);
  const [kbArticles, setKbArticles] = useState<KBArticle[]>([]);

  // Personal info form
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Recent & Favorites (from localStorage)
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department,
      });
    }
  }, [user]);

  useEffect(() => {
    loadData();
    setRecentDocs(getRecentDocs());
    setFavorites(getFavorites());
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tasks, announcements, articles] = await Promise.all([
        fetchTasks(),
        fetchAnnouncements(),
        fetchKBArticles(),
      ]);
      // Filter my tasks
      setMyTasks(tasks.filter(t => t.assignee === user?.name));
      // Show published announcements, sorted by date
      setMyAnnouncements(
        announcements
          .filter(a => a.status === 'published')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 5)
      );
      setKbArticles(articles.filter(a => a.status === 'published'));
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const updated = await updateUser(user.id, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        department: form.department,
      });
      // Update localStorage and context
      const savedUser = { ...user, ...updated };
      localStorage.setItem('tm_user', JSON.stringify(savedUser));
      window.location.reload(); // Simple way to refresh context
    } catch (err) {
      setSaveMsg('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  function removeFavorite(id: string) {
    const next = favorites.filter(f => f.id !== id);
    setFavorites(next);
    saveFavorites(next);
  }

  function clearRecent() {
    setRecentDocs([]);
    saveRecentDocs([]);
  }

  const todoTasks = myTasks.filter(t => t.status !== 'done');
  const doneTasks = myTasks.filter(t => t.status === 'done');
  const urgentTasks = myTasks.filter(t => t.priority === 'high' && t.status !== 'done');

  const typeLabel: Record<string, string> = {
    kb: '知识库',
    sop: 'SOP',
    policy: '制度',
    announcement: '公告',
  };
  const typeColor: Record<string, string> = {
    kb: 'text-violet-600 bg-violet-50',
    sop: 'text-blue-600 bg-blue-50',
    policy: 'text-amber-600 bg-amber-50',
    announcement: 'text-rose-600 bg-rose-50',
  };
  const statusColor: Record<string, string> = {
    todo: 'text-slate-500',
    in_progress: 'text-blue-600',
    review: 'text-amber-600',
    done: 'text-emerald-600',
  };
  const statusLabel: Record<string, string> = {
    todo: '待处理',
    in_progress: '进行中',
    review: '审核中',
    done: '已完成',
  };

  if (loading) {
    return <div className="p-6 text-center text-sm text-slate-400 py-20">加载中...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">个人工作台</h1>
      <p className="text-sm text-slate-400 mb-6">欢迎回来，{user?.name}！以下是你的工作概览</p>

      {/* Top: Personal Info + Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Personal Info Card */}
        <div className="col-span-1 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-white shadow-md shadow-violet-500/20">
              {user?.avatar}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.role === 'admin' ? '管理员' : '成员'} · {user?.department}</p>
            </div>
          </div>
          {!editing ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Mail size={13} /> {user?.email || '未设置邮箱'}
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Phone size={13} /> {user?.phone || '未设置电话'}
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Building2 size={13} /> {user?.department || '未设置部门'}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="mt-3 w-full py-1.5 text-xs rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors"
              >
                编辑个人信息
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-slate-500">姓名</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full mt-0.5 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">邮箱</label>
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full mt-0.5 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">电话</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full mt-0.5 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">部门</label>
                <input
                  value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full mt-0.5 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-400"
                />
              </div>
              {saveMsg && <p className="text-xs text-rose-500">{saveMsg}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  <Save size={12} /> {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => { setEditing(false); setSaveMsg(''); }}
                  className="flex-1 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="col-span-2 grid grid-cols-4 gap-3">
          {[
            { label: '待处理任务', count: todoTasks.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: '紧急任务', count: urgentTasks.length, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: '已完成', count: doneTasks.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: '收藏文档', count: favorites.length, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-xl border border-transparent p-4 text-center`}>
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Two columns */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left: My Tasks */}
        <div className="col-span-1 bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Clock size={15} className="text-violet-500" />
            <span className="text-sm font-semibold text-slate-900">我的任务</span>
            <span className="ml-auto text-xs text-slate-400">{todoTasks.length} 项待处理</span>
          </div>
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {myTasks.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">暂无任务</p>
            )}
            {myTasks.map(task => (
              <div key={task.id} className={`p-2.5 rounded-lg border text-sm ${task.status === 'done' ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor[task.status]} bg-slate-50`}>{statusLabel[task.status]}</span>
                  {task.priority === 'high' && <span className="text-xs px-1.5 py-0.5 rounded bg-rose-50 text-rose-600">紧急</span>}
                </div>
                <p className={`font-medium text-slate-900 ${task.status === 'done' ? 'line-through opacity-50' : ''}`}>{task.title}</p>
                <p className="text-xs text-slate-400 mt-1">截止：{task.dueDate}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Recent Announcements */}
        <div className="col-span-1 bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Megaphone size={15} className="text-rose-500" />
            <span className="text-sm font-semibold text-slate-900">最新公告</span>
          </div>
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {myAnnouncements.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">暂无公告</p>
            )}
            {myAnnouncements.map(ann => (
              <div key={ann.id} className="p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                <p className="text-sm font-medium text-slate-900 truncate">{ann.title}</p>
                <p className="text-xs text-slate-400 mt-1">{ann.createdAt} · {ann.author}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Favorites + Recent */}
        <div className="col-span-1 space-y-4">
          {/* Favorites */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Star size={15} className="text-amber-500" />
              <span className="text-sm font-semibold text-slate-900">我的收藏</span>
              <span className="ml-auto text-xs text-slate-400">{favorites.length} 项</span>
            </div>
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {favorites.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">暂无收藏</p>
              )}
              {favorites.map(item => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 group">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${typeColor[item.type]}`}>{typeLabel[item.type]}</span>
                  <span className="text-xs text-slate-700 flex-1 truncate">{item.title}</span>
                  <button
                    onClick={() => removeFavorite(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-rose-500 transition-all"
                    title="取消收藏"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Viewed */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Clock size={15} className="text-blue-500" />
              <span className="text-sm font-semibold text-slate-900">最近浏览</span>
              {recentDocs.length > 0 && (
                <button onClick={clearRecent} className="ml-auto text-xs text-slate-400 hover:text-rose-500">清空</button>
              )}
            </div>
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {recentDocs.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">暂无记录</p>
              )}
              {recentDocs.slice(0, 10).map(doc => (
                <div key={`${doc.type}-${doc.id}`} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${typeColor[doc.type]}`}>{typeLabel[doc.type]}</span>
                  <span className="text-xs text-slate-700 flex-1 truncate">{doc.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
