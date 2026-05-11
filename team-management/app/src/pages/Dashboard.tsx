import { useEffect, useState } from 'react';
import { FileText, CheckSquare, Bell, ListTodo, GitBranch, Users, FolderOpen, BookOpen, ArrowUpRight, FolderKanban, CalendarDays, Megaphone } from 'lucide-react';
import { fetchSOPs, fetchTasks, fetchSyncItems, fetchChecklistItems, fetchFiles, fetchKBArticles } from '../api/client';

interface Props {
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ setActiveTab }: Props) {
  const [counts, setCounts] = useState({ sops: 0, tasks: 0, sync: 0, checklist: 0, files: 0, kb: 0 });
  const [recentTasks, setRecentTasks] = useState<Array<{ id: string; title: string; assignee: string; priority: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sops, tasks, sync, checklist, files, kbArticles] = await Promise.all([
          fetchSOPs(), fetchTasks(), fetchSyncItems(), fetchChecklistItems(),
          fetchFiles(), fetchKBArticles(),
        ]);
        if (!cancelled) {
          setCounts({
            sops: sops.filter(s => s.status === 'active').length,
            tasks: tasks.filter(t => t.status !== 'done').length,
            sync: sync.filter(s => s.status === 'pending').length,
            checklist: checklist.filter(c => c.status === 'overdue').length,
            files: files.length,
            kb: kbArticles.filter(a => a.status === 'published').length,
          });
          setRecentTasks(tasks.filter(t => t.status !== 'done').slice(0, 4));
          setError('');
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        if (!cancelled) setError('数据加载失败，请检查后端服务是否运行');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const statusMap: Record<string, string> = {
    todo: '待开始', in_progress: '进行中', review: '审核中', done: '已完成',
  };
  const priorityColor: Record<string, string> = {
    high: 'text-rose-600 bg-rose-50 border border-rose-100',
    medium: 'text-amber-600 bg-amber-50 border border-amber-100',
    low: 'text-emerald-600 bg-emerald-50 border border-emerald-100',
  };

  const stats = [
    { label: '进行中任务', value: counts.tasks, icon: CheckSquare, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20', bg: 'bg-violet-50' },
    { label: '生效SOP', value: counts.sops, icon: FileText, gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20', bg: 'bg-blue-50' },
    { label: '待处理同步', value: counts.sync, icon: Bell, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20', bg: 'bg-amber-50' },
    { label: '逾期清单项', value: counts.checklist, icon: ListTodo, gradient: 'from-rose-500 to-pink-500', shadow: 'shadow-rose-500/20', bg: 'bg-rose-50' },
  ];

  const quickLinks = [
    { label: '团队成员', desc: '组织架构与成员管理', icon: Users, tab: 'members', color: 'text-violet-500' },
    { label: '文件管理', desc: '团队文件上传与共享', icon: FolderOpen, tab: 'files', color: 'text-blue-500' },
    { label: '知识库', desc: '团队知识沉淀与共享', icon: BookOpen, tab: 'knowledge', color: 'text-emerald-500' },
    { label: '规范管理', desc: 'SOP流程与制度文档', icon: FileText, tab: 'standards', color: 'text-blue-500' },
    { label: '消息中心', desc: '公告发布与信息同步', icon: Megaphone, tab: 'announcements', color: 'text-purple-500' },
    { label: '运营管理', desc: '业务规则与工作清单', icon: GitBranch, tab: 'operations', color: 'text-pink-500' },
    { label: '任务管理', desc: '团队任务分配与跟踪', icon: CheckSquare, tab: 'tasks', color: 'text-emerald-500' },
    { label: '项目管理', desc: '团队项目跟踪与管理', icon: FolderKanban, tab: 'projects', color: 'text-cyan-500' },
    { label: '团队日历', desc: '日程安排与事件管理', icon: CalendarDays, tab: 'calendar', color: 'text-amber-500' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">仪表盘</h1>
        <p className="text-sm text-slate-400 mt-1">团队整体运营概况</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-sm text-rose-600 shadow-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse shadow-sm">
                <div className="h-4 bg-slate-100 rounded-lg w-20 mb-3" />
                <div className="h-8 bg-slate-100 rounded-lg w-10" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-slate-500 font-medium">{stat.label}</span>
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={16} className="text-white" />
                    </div>
                  </div>
                  <span className="text-3xl font-extrabold text-slate-900">{stat.value}</span>
                </div>
              );
            })}
          </div>

          {/* Recent Tasks */}
          <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">近期任务</h2>
              <button onClick={() => setActiveTab('tasks')} className="text-xs text-violet-500 hover:text-violet-600 font-medium flex items-center gap-1 transition-colors">
                查看全部 <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="space-y-1">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-lg font-medium ${priorityColor[task.priority] || ''}`}>
                      {task.priority === 'high' ? '高优先' : task.priority === 'medium' ? '中优先' : '低优先'}
                    </span>
                    <span className="text-sm text-slate-700">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{task.assignee}</span>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 font-medium">
                      {statusMap[task.status] || task.status}
                    </span>
                  </div>
                </div>
              ))}
              {recentTasks.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">暂无近期任务</p>}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3">快捷入口</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {quickLinks.map(link => {
                const Icon = link.icon;
                return (
                  <button key={link.tab} onClick={() => setActiveTab(link.tab)}
                    className="bg-white rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-300 text-left group border border-transparent hover:border-slate-200/60">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl bg-slate-50 ${link.color} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon size={18} />
                      </div>
                      <ArrowUpRight size={14} className="text-slate-300 group-hover:text-violet-400 transition-colors" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 block">{link.label}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{link.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
