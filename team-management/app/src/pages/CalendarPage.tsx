import { useState, useEffect, useMemo } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X, Edit3, Trash2,
  Clock, Users as UsersIcon, Filter, List, CalendarDays,
  Link2, ArrowRight, CheckSquare, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
  fetchTasks, updateTask,
  type CalendarEvent, type Task,
} from '../api/client';

type EventType = CalendarEvent['type'];

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  meeting: '会议',
  deadline: '截止日期',
  milestone: '里程碑',
  leave: '请假',
  recurring: '周期事件',
};

const EVENT_TYPE_DEFAULTS: Record<EventType, string> = {
  meeting: '#6366f1',
  deadline: '#ef4444',
  milestone: '#f59e0b',
  leave: '#8b5cf6',
  recurring: '#10b981',
};

const TASK_STATUS_LABELS: Record<Task['status'], string> = {
  todo: '待办',
  in_progress: '进行中',
  review: '审核中',
  done: '已完成',
};

const TASK_STATUS_COLORS: Record<Task['status'], string> = {
  todo: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-100 text-blue-600',
  review: 'bg-amber-100 text-amber-600',
  done: 'bg-emerald-100 text-emerald-600',
};

const TASK_PRIORITY_LABELS: Record<Task['priority'], string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const TASK_PRIORITY_COLORS: Record<Task['priority'], string> = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-slate-400',
};

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

interface EventFormData {
  title: string;
  description: string;
  type: EventType;
  date: string;
  startTime: string;
  endTime: string;
  participants: string;
  color: string;
  relatedTaskId: string;
}

const emptyForm: EventFormData = {
  title: '', description: '', type: 'meeting',
  date: '', startTime: '09:00', endTime: '10:00',
  participants: '', color: EVENT_TYPE_DEFAULTS.meeting, relatedTaskId: '',
};

interface CalendarPageProps {
  isAdmin: boolean;
  onNavigate?: (tab: string) => void;
}

export default function CalendarPage({ isAdmin, onNavigate }: CalendarPageProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [showTaskFilter, setShowTaskFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventFormData>(emptyForm);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [dayDetailDate, setDayDetailDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [eventsData, tasksData] = await Promise.all([
        fetchCalendarEvents(),
        fetchTasks(),
      ]);
      setEvents(eventsData);
      setTasks(tasksData);
    } catch {
      // error handled silently
    } finally {
      setLoading(false);
    }
  }

  // Task helpers
  const taskMap = useMemo(() => {
    const map: Record<string, Task> = {};
    tasks.forEach(t => { map[t.id] = t; });
    return map;
  }, [tasks]);

  // Tasks with due dates that haven't been explicitly added to calendar
  const taskDueDates = useMemo(() => {
    const existingIds = new Set(events.filter(e => e.relatedTaskId).map(e => e.relatedTaskId));
    return tasks.filter(t => t.dueDate && !existingIds.has(t.id));
  }, [events, tasks]);

  // Combine calendar events with unlinked task due dates
  const allItems = useMemo(() => {
    const calendarItems = events.map(e => ({
      ...e,
      _source: 'calendar' as const,
      _task: e.relatedTaskId ? taskMap[e.relatedTaskId] : null,
    }));

    const taskItems = taskDueDates.map(t => ({
      id: `task-${t.id}`,
      title: t.title,
      description: `任务截止日期 · ${t.assignee}`,
      type: 'deadline' as EventType,
      date: t.dueDate,
      startTime: '23:59',
      endTime: '23:59',
      organizer: t.assignee,
      participants: [t.assignee],
      color: '#ef4444',
      relatedTaskId: t.id,
      createdAt: '',
      _source: 'task' as const,
      _task: t,
    }));

    return [...calendarItems, ...taskItems];
  }, [events, taskDueDates, taskMap]);

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startPadding; i++) cells.push(null);
    for (let i = 1; i <= totalDays; i++) cells.push(i);
    return cells;
  }, [year, month]);

  const filteredItems = useMemo(() => {
    let result = allItems;
    if (typeFilter !== 'all') {
      result = result.filter(e => e.type === typeFilter);
    }
    if (showTaskFilter) {
      result = result.filter(e => e.relatedTaskId);
    }
    return result.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [allItems, typeFilter, showTaskFilter]);

  const itemsByDay = useMemo(() => {
    const map: Record<string, typeof allItems> = {};
    filteredItems.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filteredItems]);

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function isToday(day: number) {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  }

  function isPast(day: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d < today;
  }

  function navigate(delta: number) {
    setCurrentDate(new Date(year, month + delta, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  // CRUD
  function openCreateModal(day?: number, prefillTask?: Task) {
    setEditingEvent(null);
    const d = day ? dateStr(day) : new Date().toISOString().slice(0, 10);
    setForm({
      ...emptyForm,
      date: d,
      color: EVENT_TYPE_DEFAULTS.meeting,
      relatedTaskId: prefillTask?.id || '',
      title: prefillTask?.title || '',
      description: prefillTask ? `关联任务: ${prefillTask.title}` : '',
      participants: prefillTask?.assignee || '',
    });
    setShowModal(true);
  }

  function openEditModal(event: CalendarEvent) {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description,
      type: event.type,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      participants: event.participants.join(', '),
      color: event.color,
      relatedTaskId: event.relatedTaskId || '',
    });
    setShowModal(true);
    setShowDayDetail(false);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.date) return;
    try {
      const participantList = form.participants
        .split(/[,，、]/)
        .map(s => s.trim())
        .filter(Boolean);
      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        participants: participantList,
        color: form.color,
        relatedTaskId: form.relatedTaskId || null,
      };
      if (editingEvent) {
        await updateCalendarEvent(editingEvent.id, payload);
      } else {
        await createCalendarEvent({
          ...payload,
          organizer: user?.name || '',
          createdAt: new Date().toISOString().slice(0, 10),
        });
      }
      setShowModal(false);
      await loadData();
    } catch {
      // error
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('确定删除该事件？')) return;
    try {
      await deleteCalendarEvent(id);
      setShowDayDetail(false);
      await loadData();
    } catch {
      // error
    }
  }

  function openDayDetail(day: number) {
    const ds = dateStr(day);
    setSelectedDate(ds);
    setDayDetailDate(`${month + 1}月${day}日`);
    setShowDayDetail(true);
  }

  function handleQuickAddFromTask(task: Task) {
    openCreateModal(undefined, task);
  }

  // Stats
  const monthEventCount = events.filter(e => e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayItems = allItems.filter(e => e.date === todayStr);
  const linkedCount = events.filter(e => e.relatedTaskId).length;
  const unlinkedTasks = taskDueDates.length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-violet-200 border-t-violet-500 animate-spin" />
          <span className="text-sm text-slate-400">加载日历中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={24} className="text-violet-500" />
            团队日历
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            共 {events.length} 个事件 · 本月 {monthEventCount} 个 · 今日 {todayItems.length} 个
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => openCreateModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-sm font-medium shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 transition-all"
            >
              <Plus size={16} />
              新建事件
            </button>
          )}
        </div>
      </div>

      {/* Task Link Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Stats overview */}
        {(['meeting', 'deadline', 'milestone', 'leave'] as EventType[]).map(type => {
          const count = events.filter(e => e.type === type).length;
          const color = EVENT_TYPE_DEFAULTS[type];
          const linked = events.filter(e => e.type === type && e.relatedTaskId).length;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200 border-2 ${
                typeFilter === type
                  ? 'border-white shadow-lg scale-[1.02]'
                  : 'border-transparent hover:scale-[1.01] hover:shadow-md'
              }`}
              style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500 block">{EVENT_TYPE_LABELS[type]}</span>
                  {linked > 0 && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                      <Link2 size={10} /> {linked}个关联任务
                    </span>
                  )}
                </div>
                <span className="text-xl font-bold" style={{ color }}>{count}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Unlinked Tasks Reminder */}
      {unlinkedTasks > 0 && isAdmin && (
        <div className="mb-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle size={16} className="text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-amber-800">
                {unlinkedTasks} 个任务截止日期未同步到日历
              </h3>
              <p className="text-xs text-amber-600 mt-0.5 mb-2">以下任务的截止日期未关联到日历事件，可以快速添加</p>
              <div className="flex flex-wrap gap-2">
                {taskDueDates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleQuickAddFromTask(t)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-xs text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all"
                  >
                    <Plus size={12} />
                    {t.title}
                    <span className={`font-medium ${TASK_PRIORITY_COLORS[t.priority]}`}>
                      ({TASK_PRIORITY_LABELS[t.priority]})
                    </span>
                    <span className="text-amber-400">{t.dueDate}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-all">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-bold text-slate-700 min-w-[140px] text-center">
            {year}年{month + 1}月
          </h2>
          <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-all">
            <ChevronRight size={18} />
          </button>
          <button onClick={goToday} className="ml-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-all">
            今天
          </button>
        </div>
        <div className="flex items-center gap-2">
          {typeFilter !== 'all' && (
            <button
              onClick={() => setTypeFilter('all')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
            >
              <Filter size={12} />
              清除: {EVENT_TYPE_LABELS[typeFilter]}
            </button>
          )}
          <button
            onClick={() => setShowTaskFilter(!showTaskFilter)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              showTaskFilter
                ? 'bg-blue-100 text-blue-600'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Link2 size={12} />
            {showTaskFilter ? '仅看关联' : '关联任务'}
            {linkedCount > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                showTaskFilter ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {linkedCount}
              </span>
            )}
          </button>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'month' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <CalendarDays size={14} />
              月视图
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={14} />
              列表
            </button>
          </div>
        </div>
      </div>

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100">
            {WEEKDAY_NAMES.map((name, i) => (
              <div key={i} className={`py-2.5 text-center text-xs font-semibold ${
                i === 0 || i === 6 ? 'text-red-400 bg-red-50/30' : 'text-slate-400'
              }`}>
                {name}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {daysInMonth.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="min-h-[120px] border-b border-r border-slate-50 bg-slate-50/30" />;
              }
              const ds = dateStr(day);
              const dayItems = itemsByDay[ds] || [];
              const today = isToday(day);
              const past = isPast(day);
              const hasLinkedTask = dayItems.some(item => item.relatedTaskId);

              return (
                <div
                  key={ds}
                  onClick={() => dayItems.length > 0 ? openDayDetail(day) : isAdmin && openCreateModal(day)}
                  className={`min-h-[120px] border-b border-r border-slate-50 p-1.5 cursor-pointer transition-all hover:bg-violet-50/30 ${
                    today ? 'bg-blue-50/50' : past ? 'bg-slate-50/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-medium inline-flex w-7 h-7 items-center justify-center rounded-full ${
                        today
                          ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30'
                          : past
                            ? 'text-slate-300'
                            : 'text-slate-600'
                      }`}>
                        {day}
                      </span>
                      {hasLinkedTask && (
                        <CheckSquare size={11} className="text-blue-400" />
                      )}
                    </div>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-medium">{dayItems.length}</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map(item => {
                      const task = item._task;
                      return (
                        <div
                          key={item.id}
                          className={`px-1.5 py-0.5 rounded-md text-[11px] font-medium truncate shadow-sm flex items-center gap-1 ${
                            item._source === 'task'
                              ? 'bg-red-50 text-red-500 border border-red-200'
                              : 'text-white/90'
                          }`}
                          style={item._source === 'calendar' ? { backgroundColor: item.color } : undefined}
                          title={`${item.startTime} ${item.title}${task ? ` [${TASK_STATUS_LABELS[task.status]}]` : ''}`}
                        >
                          {item.relatedTaskId && (
                            <Link2 size={9} className={item._source === 'task' ? 'text-red-400' : 'text-white/60'} />
                          )}
                          <span className="truncate">{item.title}</span>
                        </div>
                      );
                    })}
                    {dayItems.length > 3 && (
                      <div className="text-[11px] text-slate-400 pl-1">+{dayItems.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">暂无事件</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredItems.map(item => {
                const task = item._task;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 hover:bg-slate-50/50 transition-all cursor-pointer"
                    onClick={() => {
                      const day = parseInt(item.date.split('-')[2]);
                      if (day > 0 && day <= 31) openDayDetail(day);
                    }}
                  >
                    <div className="w-1 h-full min-h-[60px] rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                          style={{ backgroundColor: item.color }}
                        >
                          {EVENT_TYPE_LABELS[item.type]}
                        </span>
                        <span className="text-xs text-slate-400">{item.date}</span>
                        {task && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TASK_STATUS_COLORS[task.status]}`}>
                            {TASK_STATUS_LABELS[task.status]}
                          </span>
                        )}
                        {item.relatedTaskId && (
                          <span className="flex items-center gap-0.5 text-[10px] text-blue-400">
                            <Link2 size={10} />
                            {item._source === 'task' ? '任务截止日' : '已关联任务'}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700 truncate">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</p>
                      )}
                      {/* Linked task info */}
                      {task && (
                        <div className="mt-2 p-2 rounded-lg bg-slate-50/80 border border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs">
                              <CheckSquare size={12} className="text-violet-400" />
                              <span className="font-medium text-slate-600">{task.title}</span>
                              <span className={`font-semibold ${TASK_PRIORITY_COLORS[task.priority]}`}>
                                {TASK_PRIORITY_LABELS[task.priority]}优先级
                              </span>
                              <span className="text-slate-400">{task.assignee}</span>
                            </div>
                            {onNavigate && (
                              <button
                                onClick={e => { e.stopPropagation(); onNavigate('tasks'); }}
                                className="flex items-center gap-1 text-[10px] text-violet-500 hover:text-violet-600 font-medium"
                              >
                                查看任务 <ArrowRight size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={12} /> {item.startTime} - {item.endTime}</span>
                        <span className="flex items-center gap-1"><UsersIcon size={12} /> {item.organizer}</span>
                        <span className="flex items-center gap-1"><UsersIcon size={12} /> {item.participants.length}人</span>
                      </div>
                    </div>
                    {item._source === 'calendar' && isAdmin && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); openEditModal(item as CalendarEvent); }}
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-300 hover:text-violet-500 transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                {editingEvent ? '编辑事件' : '新建事件'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">事件标题 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="输入事件标题"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                />
              </div>
              {/* Type & Date Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">事件类型</label>
                  <select
                    value={form.type}
                    onChange={e => {
                      const t = e.target.value as EventType;
                      setForm({ ...form, type: t, color: EVENT_TYPE_DEFAULTS[t] });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-white"
                  >
                    {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">日期 *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                  />
                </div>
              </div>
              {/* Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">开始时间</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">结束时间</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                  />
                </div>
              </div>
              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">颜色</label>
                <div className="flex gap-2">
                  {Object.values(EVENT_TYPE_DEFAULTS).map(c => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        form.color === c ? 'ring-2 ring-offset-2 ring-violet-400 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              {/* Related Task */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <Link2 size={14} className="text-blue-400" />
                  关联任务（可选）
                </label>
                <select
                  value={form.relatedTaskId}
                  onChange={e => {
                    const taskId = e.target.value;
                    const task = taskId ? taskMap[taskId] : null;
                    setForm({
                      ...form,
                      relatedTaskId: taskId,
                      ...(task && !form.title ? {
                        title: task.title,
                        description: `关联任务: ${task.title}`,
                        date: task.dueDate || form.date,
                        participants: task.assignee,
                      } : {}),
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-white"
                >
                  <option value="">不关联任务</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>
                      [{TASK_STATUS_LABELS[t.status]}] {t.title} — {t.assignee} ({t.dueDate})
                    </option>
                  ))}
                </select>
                {form.relatedTaskId && taskMap[form.relatedTaskId] && (
                  <div className="mt-2 p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckSquare size={12} className="text-blue-400" />
                      <span className="font-medium text-blue-700">{taskMap[form.relatedTaskId].title}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TASK_STATUS_COLORS[taskMap[form.relatedTaskId].status]}`}>
                        {TASK_STATUS_LABELS[taskMap[form.relatedTaskId].status]}
                      </span>
                      <span className={`font-semibold ${TASK_PRIORITY_COLORS[taskMap[form.relatedTaskId].priority]}`}>
                        {TASK_PRIORITY_LABELS[taskMap[form.relatedTaskId].priority]}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">描述</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="事件描述（可选）"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none"
                />
              </div>
              {/* Participants */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">参与人</label>
                <input
                  type="text"
                  value={form.participants}
                  onChange={e => setForm({ ...form, participants: e.target.value })}
                  placeholder="用逗号分隔，如：张明, 李婷, 王强"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || !form.date}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-indigo-500 shadow-md shadow-violet-500/20 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingEvent ? '保存修改' : '创建事件'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Detail Panel */}
      {showDayDetail && selectedDate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {dayDetailDate} 事件详情
                {(itemsByDay[selectedDate] || []).some(i => i.relatedTaskId) && (
                  <span className="text-xs font-medium text-blue-400 flex items-center gap-0.5">
                    <Link2 size={12} /> 含关联任务
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowDayDetail(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              {(itemsByDay[selectedDate] || []).length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar size={36} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400">当天暂无事件</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(itemsByDay[selectedDate] || []).map(item => {
                    const task = item._task;
                    const isFromTask = item._source === 'task';
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-4 hover:shadow-md transition-all ${
                          isFromTask ? 'border-dashed border-red-200 bg-red-50/30' : 'border-slate-100'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                              style={{ backgroundColor: item.color }}
                            >
                              {isFromTask ? '任务截止' : EVENT_TYPE_LABELS[item.type]}
                            </span>
                            {task && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TASK_STATUS_COLORS[task.status]}`}>
                                {TASK_STATUS_LABELS[task.status]}
                              </span>
                            )}
                            {item.relatedTaskId && (
                              <Link2 size={11} className="text-blue-400" />
                            )}
                          </div>
                          {isFromTask ? (
                            <button
                              onClick={() => { setShowDayDetail(false); handleQuickAddFromTask(task!); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] text-slate-500 hover:bg-violet-50 hover:text-violet-500 hover:border-violet-200 transition-all"
                            >
                              <Plus size={10} /> 创建事件
                            </button>
                          ) : isAdmin && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditModal(item as CalendarEvent)}
                                className="p-1 rounded-lg hover:bg-violet-50 text-slate-300 hover:text-violet-500 transition-all"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-700 mb-1">{item.title}</h4>
                        {item.description && (
                          <p className="text-xs text-slate-400 mb-2">{item.description}</p>
                        )}
                        {/* Linked task detail card */}
                        {task && (
                          <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-100 mb-2">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckSquare size={14} className="text-violet-500" />
                              <span className="text-xs font-bold text-slate-700">{task.title}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span className={`px-2 py-0.5 rounded-full font-medium ${TASK_STATUS_COLORS[task.status]}`}>
                                {TASK_STATUS_LABELS[task.status]}
                              </span>
                              <span className={`font-semibold ${TASK_PRIORITY_COLORS[task.priority]}`}>
                                {TASK_PRIORITY_LABELS[task.priority]}优先级
                              </span>
                              <span className="text-slate-500">负责人: {task.assignee}</span>
                              <span className="text-slate-500">截止: {task.dueDate}</span>
                              {task.tags.length > 0 && (
                                <span className="text-slate-400">
                                  {task.tags.map(t => `#${t}`).join(' ')}
                                </span>
                              )}
                            </div>
                            {onNavigate && (
                              <button
                                onClick={() => { setShowDayDetail(false); onNavigate('tasks'); }}
                                className="mt-2 flex items-center gap-1 text-xs text-violet-500 hover:text-violet-600 font-medium"
                              >
                                跳转到任务管理 <ArrowRight size={12} />
                              </button>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-300" />
                            {item.startTime} - {item.endTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <UsersIcon size={12} className="text-slate-300" />
                            组织者: {item.organizer}
                          </span>
                        </div>
                        {item.participants.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.participants.map(p => (
                              <span
                                key={p}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  p === user?.name
                                    ? 'bg-violet-100 text-violet-600'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {isAdmin && (
                <button
                  onClick={() => { setShowDayDetail(false); openCreateModal(parseInt(selectedDate.split('-')[2])); }}
                  className="w-full mt-4 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/30 transition-all"
                >
                  <Plus size={16} />
                  添加事件
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
