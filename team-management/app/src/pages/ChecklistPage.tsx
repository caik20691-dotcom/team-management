import { useEffect, useState } from 'react';
import { Plus, Search, CheckCircle, Circle, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { fetchChecklistItems, createChecklistItem, updateChecklistItem, deleteChecklistItem, type ChecklistItem } from '../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const frequencyLabel: Record<string, string> = { daily: '每日', weekly: '每周', monthly: '每月', on_demand: '按需' };
const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: '待完成', color: 'text-amber-600 bg-amber-50', icon: Circle },
  completed: { label: '已完成', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  overdue: { label: '已逾期', color: 'text-red-600 bg-red-50', icon: AlertTriangle },
};

interface Props { isAdmin: boolean; }

export default function ChecklistPage({ isAdmin }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterFreq, setFilterFreq] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistItem | null>(null);
  const [form, setForm] = useState<Pick<ChecklistItem, 'title' | 'description' | 'responsible' | 'frequency' | 'status'>>({
    title: '', description: '', responsible: '', frequency: 'daily', status: 'pending',
  });
  const [delTarget, setDelTarget] = useState<ChecklistItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchChecklistItems();
        if (!cancelled) setItems(data);
      } catch (err) {
        console.error('Failed to load checklist items:', err);
        if (!cancelled) setError('加载清单数据失败，请检查后端服务');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const searchLower = search.toLowerCase();
  const filtered = items.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(searchLower) || c.description.toLowerCase().includes(searchLower);
    const matchFreq = filterFreq === 'all' || c.frequency === filterFreq;
    return matchSearch && matchFreq;
  });

  const counts = {
    all: items.length,
    pending: items.filter(c => c.status === 'pending').length,
    completed: items.filter(c => c.status === 'completed').length,
    overdue: items.filter(c => c.status === 'overdue').length,
  };

  function openNew() {
    setEditing(null);
    setForm({ title: '', description: '', responsible: '', frequency: 'daily', status: 'pending' });
    setModalOpen(true);
  }
  function openEdit(item: ChecklistItem) {
    setEditing(item);
    setForm({ title: item.title, description: item.description, responsible: item.responsible, frequency: item.frequency, status: item.status });
    setModalOpen(true);
  }
  async function handleSave() {
    if (!form.title.trim()) {
      setError('标题不能为空');
      return;
    }
    try {
      if (editing) {
        await updateChecklistItem(editing.id, form);
      } else {
        await createChecklistItem({ ...form, lastDone: null });
      }
      setModalOpen(false);
      setError('');
      load();
    } catch (err) {
      console.error('Failed to save checklist item:', err);
      setError(editing ? '更新清单项失败' : '创建清单项失败');
    }
  }
  async function handleDelete() {
    if (!delTarget) return;
    try {
      await deleteChecklistItem(delTarget.id);
      setDelTarget(null);
      load();
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
      setError('删除清单项失败');
    }
  }
  async function toggleStatus(item: ChecklistItem) {
    if (!isAdmin) return;
    const nextStatus: Record<string, ChecklistItem['status']> = {
      pending: 'completed', completed: 'pending', overdue: 'completed',
    };
    const lastDone = nextStatus[item.status] === 'completed' ? new Date().toISOString().slice(0, 10) : item.lastDone;
    try {
      await updateChecklistItem(item.id, { status: nextStatus[item.status], lastDone });
      load();
    } catch (err) {
      console.error('Failed to toggle checklist status:', err);
      setError('更新清单状态失败');
    }
  }
  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchChecklistItems();
      setItems(data);
    } catch (err) {
      console.error('Failed to load checklist items:', err);
      setError('加载清单数据失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">工作清单</h1>
          <p className="text-sm text-slate-400 mt-0.5">定期工作事项跟踪与管理</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={15} /> 新建清单项
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: '总计', count: counts.all, color: 'text-slate-600', bg: 'bg-white' },
          { label: '待完成', count: counts.pending, color: 'text-amber-600', bg: 'bg-amber-50/50' },
          { label: '已完成', count: counts.completed, color: 'text-green-600', bg: 'bg-green-50/50' },
          { label: '已逾期', count: counts.overdue, color: 'text-red-600', bg: 'bg-red-50/50' },
        ].map(card => (
          <div key={card.label} className={`rounded-xl border border-slate-200 p-3 ${card.bg}`}>
            <p className="text-xs text-slate-400">{card.label}</p>
            <p className={`text-xl font-semibold ${card.color}`}>{card.count}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索清单项..." className="pl-9" />
        </div>
        <Select value={filterFreq} onValueChange={v => setFilterFreq(v === 'all' ? 'all' : v)}>
          <SelectTrigger className="w-[130px] text-sm"><SelectValue placeholder="全部频率" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部频率</SelectItem>
            <SelectItem value="daily">每日</SelectItem>
            <SelectItem value="weekly">每周</SelectItem>
            <SelectItem value="monthly">每月</SelectItem>
            <SelectItem value="on_demand">按需</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map(item => {
          const st = statusConfig[item.status];
          const StIcon = st.icon;
          return (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <button onClick={() => toggleStatus(item)} disabled={!isAdmin} className={`shrink-0 ${isAdmin ? 'cursor-pointer hover:opacity-70' : 'cursor-default'}`}>
                <StIcon size={18} className={st.color.split(' ')[0]} />
              </button>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${item.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.title}</span>
                <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{frequencyLabel[item.frequency]}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                <span className="text-xs text-slate-400">{item.responsible}</span>
                {isAdmin && (
                  <>
                    <button onClick={() => openEdit(item)} className="p-1 text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>
                    <button onClick={() => setDelTarget(item)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">
            {search || filterFreq !== 'all' ? '没有找到匹配的清单项' : '暂无清单项，点击右上角新建'}
          </div>
        )}
        {loading && <div className="text-center py-12 text-sm text-slate-400">加载中...</div>}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? '编辑清单项' : '新建清单项'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>标题 <span className="text-red-500">*</span></Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="清单项标题" /></div>
            <div><Label>描述</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="描述..." rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>负责人</Label><Input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} placeholder="负责人" /></div>
              <div>
                <Label>频率</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v as ChecklistItem['frequency'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">每日</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="monthly">每月</SelectItem>
                    <SelectItem value="on_demand">按需</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>状态</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ChecklistItem['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待完成</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="overdue">已逾期</SelectItem>
                </SelectContent>
              </Select>
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
