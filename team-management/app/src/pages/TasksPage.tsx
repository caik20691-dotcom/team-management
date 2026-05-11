import { useEffect, useState } from 'react';
import { Plus, Search, Circle, Clock, CheckCircle2, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { fetchTasks, createTask, updateTask, deleteTask, type Task } from '../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  todo: { label: '待开始', color: 'text-slate-500', icon: Circle },
  in_progress: { label: '进行中', color: 'text-blue-600', icon: Clock },
  review: { label: '审核中', color: 'text-amber-600', icon: AlertCircle },
  done: { label: '已完成', color: 'text-green-600', icon: CheckCircle2 },
};
const priorityColor: Record<string, string> = {
  high: 'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low: 'bg-green-50 text-green-600 border-green-200',
};
const priorityLabel: Record<string, string> = { high: '高', medium: '中', low: '低' };

interface Props { isAdmin: boolean; }

export default function TasksPage({ isAdmin }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<Pick<Task, 'title' | 'assignee' | 'priority' | 'status' | 'dueDate' | 'tags'>>({
    title: '', assignee: '', priority: 'medium', status: 'todo', dueDate: '', tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [delTarget, setDelTarget] = useState<Task | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchTasks();
        if (!cancelled) setTasks(data);
      } catch (err) {
        console.error('Failed to load tasks:', err);
        if (!cancelled) setError('加载任务数据失败，请检查后端服务');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const searchLower = search.toLowerCase();
  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(searchLower) || t.assignee.toLowerCase().includes(searchLower);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  function openNew() {
    setEditing(null);
    setForm({ title: '', assignee: '', priority: 'medium', status: 'todo', dueDate: '', tags: [] });
    setTagInput('');
    setModalOpen(true);
  }
  function openEdit(task: Task) {
    setEditing(task);
    setForm({ title: task.title, assignee: task.assignee, priority: task.priority, status: task.status, dueDate: task.dueDate, tags: [...task.tags] });
    setTagInput('');
    setModalOpen(true);
  }
  async function handleSave() {
    if (!form.title.trim()) {
      setError('请输入任务标题');
      return;
    }
    try {
      if (editing) {
        await updateTask(editing.id, form);
      } else {
        await createTask(form);
      }
      setModalOpen(false);
      setError('');
      load();
    } catch (err) {
      console.error('Failed to save task:', err);
      setError(editing ? '更新任务失败' : '创建任务失败');
    }
  }
  async function handleDelete() {
    if (!delTarget) return;
    try {
      await deleteTask(delTarget.id);
      setDelTarget(null);
      load();
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('删除任务失败');
    }
  }
  function addTag() {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm(f => ({ ...f, tags: [...f.tags, tag] }));
    }
    setTagInput('');
  }
  function removeTag(tag: string) {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  }
  async function toggleStatus(task: Task) {
    if (!isAdmin) return;
    const nextStatus: Record<string, Task['status']> = {
      todo: 'in_progress', in_progress: 'review', review: 'done', done: 'todo',
    };
    try {
      await updateTask(task.id, { status: nextStatus[task.status] });
      load();
    } catch (err) {
      console.error('Failed to toggle task status:', err);
      setError('更新任务状态失败');
    }
  }
  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('加载任务数据失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">任务管理</h1>
          <p className="text-sm text-slate-400 mt-0.5">团队任务分配与跟踪</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={15} /> 新建任务
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
      )}

      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          { key: 'all', label: '全部' },
          { key: 'todo', label: '待开始' },
          { key: 'in_progress', label: '进行中' },
          { key: 'review', label: '审核中' },
          { key: 'done', label: '已完成' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${statusFilter === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab.label} ({counts[tab.key as keyof typeof counts]})
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索任务标题或负责人..." className="pl-9" />
      </div>

      <div className="space-y-2">
        {filtered.map(task => {
          const st = statusConfig[task.status];
          const StIcon = st.icon;
          return (
            <div key={task.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleStatus(task)} disabled={!isAdmin} className={`shrink-0 ${isAdmin ? 'cursor-pointer hover:opacity-70' : 'cursor-default'}`}>
                  <StIcon size={16} className={st.color} />
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>{task.title}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${priorityColor[task.priority]}`}>{priorityLabel[task.priority]}</span>
                    {task.tags.map(tag => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-xs text-slate-700">{task.assignee}</p>
                  <p className="text-xs text-slate-400">截止：{task.dueDate}</p>
                  {isAdmin && (
                    <>
                      <button onClick={() => openEdit(task)} className="p-1 text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>
                      <button onClick={() => setDelTarget(task)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">
            {search || statusFilter !== 'all' ? '没有找到匹配的任务' : '暂无任务，点击右上角新建'}
          </div>
        )}
        {loading && <div className="text-center py-12 text-sm text-slate-400">加载中...</div>}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? '编辑任务' : '新建任务'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>任务标题 <span className="text-red-500">*</span></Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="任务标题" /></div>
            <div><Label>负责人</Label><Input value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} placeholder="负责人" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>优先级</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Task['priority'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>状态</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Task['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">待开始</SelectItem>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="review">审核中</SelectItem>
                    <SelectItem value="done">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>截止日期</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            <div>
              <Label>标签</Label>
              <div className="flex gap-2 items-center">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); }}} placeholder="输入标签后回车" className="flex-1" />
                <button type="button" onClick={addTag} className="text-xs px-2 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">添加</button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">取消</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">保存</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!delTarget} onOpenChange={() => setDelTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-4">确定要删除「{delTarget?.title}」吗？此操作不可撤销。</p>
          <DialogFooter>
            <button onClick={() => setDelTarget(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">取消</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">删除</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
