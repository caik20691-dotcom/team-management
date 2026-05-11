import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Users, CheckSquare, Bell, CalendarDays,
  Activity, PieChart, BarChart as BarIcon, LineChart,
} from 'lucide-react';
import {
  PieChart as RPie, Pie, Cell,
  BarChart as RBar, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart as RLine, Line, Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import {
  fetchTasks, fetchUsers, fetchAnnouncements, fetchCalendarEvents,
  type Task, type User, type Announcement, type CalendarEvent,
} from '../api/client';

const C = {
  violet: '#7c3aed', indigo: '#6366f1', blue: '#3b82f6',
  green: '#10b981', amber: '#f59e0b', red: '#ef4444', slate: '#64748b',
};
const PIE_C = ['#7c3aed', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface StatCard {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [t, u, a, c] = await Promise.all([
          fetchTasks(), fetchUsers(), fetchAnnouncements(), fetchCalendarEvents(),
        ]);
        setTasks(t);
        setUsers(u);
        setAnnouncements(a);
        setEvents(c);
      } catch (e: any) {
        setError('数据加载失败，请检查后端服务是否运行');
        console.error('Dashboard fetch error:', e);
      } finally { setLoading(false); }
    })();
  }, []);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const review = tasks.filter(t => t.status === 'review').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const high = tasks.filter(t => t.priority === 'high').length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, review, todo, high, rate };
  }, [tasks]);

  const userData = useMemo(() => {
    const active = users.filter(u => u.status === 'active').length;
    const admins = users.filter(u => u.role === 'admin').length;
    const deptMap: Record<string, number> = {};
    users.forEach(u => { deptMap[u.department] = (deptMap[u.department] || 0) + 1; });
    return { active, admins, deptMap };
  }, [users]);

  const annStats = useMemo(() => {
    const total = announcements.length;
    const pub = announcements.filter(a => a.status === 'published').length;
    const pin = announcements.filter(a => a.pinned).length;
    return { total, pub, pin };
  }, [announcements]);

  const evtStats = useMemo(() => {
    const now = new Date();
    const mm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const mc = events.filter(e => e.date.startsWith(mm)).length;
    const typeMap: Record<string, number> = {};
    events.forEach(e => { typeMap[e.type] = (typeMap[e.type] || 0) + 1; });
    const linked = events.filter(e => e.relatedTaskId).length;
    return { total: events.length, mc, typeMap, linked };
  }, [events]);

  const statusPie = useMemo(() => [
    { name: '待办', value: taskStats.todo, color: '#64748b' },
    { name: '进行中', value: taskStats.inProgress, color: '#3b82f6' },
    { name: '审核中', value: taskStats.review, color: '#f59e0b' },
    { name: '已完成', value: taskStats.done, color: '#10b981' },
  ].filter(d => d.value > 0), [taskStats]);

  const prioPie = useMemo(() => [
    { name: '高', value: tasks.filter(t => t.priority === 'high').length, color: '#ef4444' },
    { name: '中', value: tasks.filter(t => t.priority === 'medium').length, color: '#f59e0b' },
    { name: '低', value: tasks.filter(t => t.priority === 'low').length, color: '#10b981' },
  ].filter(d => d.value > 0), [tasks]);

  const deptPie = useMemo(() =>
    Object.entries(userData.deptMap).map(([name, value]) => ({ name, value }))
  , [userData]);

  const workload = useMemo(() => {
    const m: Record<string, { total: number; done: number }> = {};
    tasks.forEach(t => {
      if (!m[t.assignee]) m[t.assignee] = { total: 0, done: 0 };
      m[t.assignee].total++;
      if (t.status === 'done') m[t.assignee].done++;
    });
    return Object.entries(m)
      .map(([name, d]) => ({ name, total: d.total, done: d.done, rate: Math.round((d.done / d.total) * 100) }))
      .sort((a, b) => b.total - a.total);
  }, [tasks]);

  const evtBar = useMemo(() => {
    const m: Record<string, number> = { meeting: 0, deadline: 0, milestone: 0, leave: 0, recurring: 0 };
    events.forEach(e => { m[e.type] = (m[e.type] || 0) + 1; });
    const L: Record<string, string> = { meeting: '会议', deadline: '截止', milestone: '里程碑', leave: '请假', recurring: '周期' };
    return Object.entries(m).map(([k, v]) => ({ name: L[k], value: v }));
  }, [events]);

  const trend = useMemo(() => {
    const m: Record<string, { created: number; done: number }> = {};
    tasks.forEach(t => {
      const d = t.dueDate ? t.dueDate.slice(0, 7) : "";
      if (d) {
        if (!m[d]) m[d] = { created: 0, done: 0 };
        m[d].created++;
        if (t.status === 'done') m[d].done++;
      }
    });
    return Object.entries(m)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, d]) => ({ month, created: d.created, done: d.done }));
  }, [tasks]);

  const cards: StatCard[] = [
    { label: '任务总数', value: taskStats.total, sub: `完成率 ${taskStats.rate}%`, icon: <CheckSquare size={20} />, color: C.violet },
    { label: '活跃成员', value: userData.active, sub: `${userData.admins} 位管理员`, icon: <Users size={20} />, color: C.blue },
    { label: '公告总数', value: annStats.total, sub: `${annStats.pub} 已发布 · ${annStats.pin} 置顶`, icon: <Bell size={20} />, color: C.amber },
    { label: '事件总数', value: evtStats.total, sub: `本月 ${evtStats.mc} 个`, icon: <CalendarDays size={20} />, color: C.green },
  ];

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <Activity size={20} className="text-red-400" />
          </div>
          <p className="text-sm font-medium text-red-500">{error}</p>
          <p className="text-xs text-slate-400">请确保 JSON Server (port 3001) 和 Vite (port 5175) 正在运行</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
          <span className="text-sm text-slate-400">加载仪表盘中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 size={24} className="text-violet-500" />
          数据统计仪表盘
        </h1>
        <p className="text-sm text-slate-400 mt-1">团队数据概览与趋势分析</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c, i) => (
          <div key={i} className="relative overflow-hidden bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
            <div className="p-2.5 rounded-xl mb-3" style={{ backgroundColor: `${c.color}15`, color: c.color }}>
              {c.icon}
            </div>
            <p className="text-2xl font-bold text-slate-800">{c.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{c.label}</p>
            <p className="text-[11px] mt-2" style={{ color: `${c.color}99` }}>{c.sub}</p>
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full -mr-6 -mt-6 opacity-5" style={{ backgroundColor: c.color }} />
          </div>
        ))}
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Task Status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <PieChart size={16} className="text-violet-500" />
            任务状态分布
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <RPie>
              <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" nameKey="name">
                {statusPie.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </RPie>
          </ResponsiveContainer>
        </div>

        {/* Task Priority */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <PieChart size={16} className="text-amber-500" />
            任务优先级分布
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <RPie>
              <Pie data={prioPie} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" nameKey="name">
                {prioPie.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </RPie>
          </ResponsiveContainer>
        </div>

        {/* Department */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-500" />
            部门人员分布
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <RPie>
              <Pie data={deptPie} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" nameKey="name">
                {deptPie.map((_, idx) => (
                  <Cell key={idx} fill={PIE_C[idx % PIE_C.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </RPie>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Workload */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <BarIcon size={16} className="text-violet-500" />
            成员工作负载
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <RBar data={workload} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="total" name="总任务" fill="#7c3aed" radius={[0, 4, 4, 0]} barSize={16} />
              <Bar dataKey="done" name="已完成" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
            </RBar>
          </ResponsiveContainer>
        </div>

        {/* Event Types */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-emerald-500" />
            日历事件类型分布
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <RBar data={evtBar}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="value" name="事件数" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
            </RBar>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <LineChart size={16} className="text-indigo-500" />
            任务创建/完成趋势
          </h3>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <RLine data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="created" name="创建" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="done" name="完成" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </RLine>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-sm text-slate-300">
              暂无趋势数据
            </div>
          )}
        </div>

        {/* Detail Stats */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-violet-500" />
            详细数据
          </h3>
          <div className="space-y-3">
            {/* Tasks */}
            <div className="p-3 rounded-xl bg-slate-50/80">
              <h4 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                <CheckSquare size={12} /> 任务明细
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">待办</span><span className="font-bold text-slate-400">{taskStats.todo}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">进行中</span><span className="font-bold text-blue-500">{taskStats.inProgress}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">审核中</span><span className="font-bold text-amber-500">{taskStats.review}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">已完成</span><span className="font-bold text-emerald-500">{taskStats.done}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">高优先级</span><span className="font-bold text-red-500">{taskStats.high}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">完成率</span><span className="font-bold text-violet-500">{taskStats.rate}%</span></div>
              </div>
            </div>
            {/* Announcements */}
            <div className="p-3 rounded-xl bg-slate-50/80">
              <h4 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                <Bell size={12} /> 公告明细
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">已发布</span><span className="font-bold text-emerald-500">{annStats.pub}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">置顶</span><span className="font-bold text-amber-500">{annStats.pin}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">关联任务</span><span className="font-bold text-blue-500">{evtStats.linked}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">事件类型</span><span className="font-bold text-violet-500">{Object.keys(evtStats.typeMap).length}</span></div>
              </div>
            </div>
            {/* Calendar */}
            <div className="p-3 rounded-xl bg-slate-50/80">
              <h4 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                <CalendarDays size={12} /> 日历明细
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">事件总数</span><span className="font-bold text-slate-700">{evtStats.total}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">本月新增</span><span className="font-bold text-violet-500">{evtStats.mc}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">关联任务</span><span className="font-bold text-blue-500">{evtStats.linked}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">类型数</span><span className="font-bold text-emerald-500">{Object.keys(evtStats.typeMap).length}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Member Table */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Users size={16} className="text-violet-500" />
          成员任务完成情况
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">成员</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500">总任务</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500">已完成</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500">完成率</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">进度</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((m, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-700">{m.name}</td>
                  <td className="text-center py-2.5 px-3 text-slate-600">{m.total}</td>
                  <td className="text-center py-2.5 px-3 text-emerald-600 font-semibold">{m.done}</td>
                  <td className="text-center py-2.5 px-3">
                    <span className={`font-bold ${m.rate >= 70 ? 'text-emerald-500' : m.rate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                      {m.rate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 w-32">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${m.rate >= 70 ? 'bg-emerald-400' : m.rate >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${m.rate}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {workload.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-300">暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
