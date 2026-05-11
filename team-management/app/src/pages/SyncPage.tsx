import { useEffect, useState } from 'react';
import { Bell, Plus, Search, CheckCircle, Clock, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { fetchSyncItems, createSyncItem, updateSyncItem, deleteSyncItem, type SyncItem } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusColor: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  read: 'bg-green-50 text-green-700 border-green-200',
};
const statusLabel: Record<string, string> = { pending: '待发送', sent: '已发送', read: '已读确认' };
const statusIcon: Record<string, any> = { pending: AlertCircle, sent: Clock, read: CheckCircle };
const countColorMap: Record<string, string> = { amber: 'text-amber-600', blue: 'text-blue-600', green: 'text-green-600' };

interface Props { isAdmin: boolean; }

export default function SyncPage({ isAdmin }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<SyncItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SyncItem | null>(null);
  const [form, setForm] = useState<Pick<SyncItem, 'title' | 'content' | 'author' | 'target' | 'status'>>({
    title: '', content: '', author: '', target: '', status: 'pending',
  });
  const [delTarget, setDelTarget] = useState<SyncItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchSyncItems();
        if (!cancelled) setItems(data);
      } catch (err) {
        console.error('Failed to load sync items:', err);
        if (!cancelled) setError('加载同步数据失败，请检查后端服务');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const searchLower = search.toLowerCase();
  const filtered = items.filter(s => s.title.toLowerCase().includes(searchLower) || s.content.toLowerCase().includes(searchLower) || s.target.toLowerCase().includes(searchLower));

  const counts = {
    pending: items.filter(s => s.status === 'pending').length,
    sent: items.filter(s => s.status === 'sent').length,
    read: items.filter(s => s.status === 'read').length,
  };

  function openNew() {
    setEditing(null);
    setForm({ title: '', content: '', author: user?.name || '', target: '', status: 'pending' });
    setModalOpen(true);
  }
  function openEdit(item: SyncItem) {
    setEditing(item);
    setForm({ title: item.title, content: item.content, author: item.author, target: item.target, status: item.status });
    setModalOpen(true);
  }
  async function handleSave() {
    if (!form.title.trim()) {
      setError('标题不能为空');
      return;
    }
    try {
      if (editing) {
        await updateSyncItem(editing.id, form);
      } else {
        await createSyncItem({ ...form, createdAt: new Date().toISOString().slice(0, 10) });
      }
      setModalOpen(false);
      setError('');
      load();
    } catch (err) {
      console.error('Failed to save sync item:', err);
      setError(editing ? '更新同步失败' : '创建同步失败');
    }
  }
  async function handleDelete() {
    if (!delTarget) return;
    try {
      await deleteSyncItem(delTarget.id);
      setDelTarget(null);
      load();
    } catch (err) {
      console.error('Failed to delete sync item:', err);
      setError('删除同步失败');
    }
  }
  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSyncItems();
      setItems(data);
    } catch (err) {
      console.error('Failed to load sync items:', err);
      setError('加载同步数据失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">信息同步</h1>
          <p className="text-sm text-slate-400 mt-0.5">团队通知与信息同步管理</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={15} /> 新建同步
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: '待发送', count: counts.pending, colorKey: 'amber' as const },
          { label: '已发送', count: counts.sent, colorKey: 'blue' as const },
          { label: '已确认', count: counts.read, colorKey: 'green' as const },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-xs text-slate-400">{stat.label}</p>
            <p className={`text-xl font-semibold ${countColorMap[stat.colorKey]}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索同步标题或内容..." className="pl-9" />
      </div>

      <div className="space-y-3">
        {filtered.map(item => {
          const StIcon = statusIcon[item.status];
          return (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-blue-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-slate-900">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusColor[item.status]}`}>
                    <StIcon size={11} />{statusLabel[item.status]}
                  </span>
                  {isAdmin && (
                    <>
                      <button onClick={() => openEdit(item)} className="p-1 text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>
                      <button onClick={() => setDelTarget(item)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-500 ml-6 mb-3">{item.content}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400 ml-6">
                <span>发布人：{item.author}</span>
                <span>目标：{item.target}</span>
                <span>时间：{item.createdAt}</span>
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">
            {search ? '没有找到匹配的同步记录' : '暂无同步记录，点击右上角新建'}
          </div>
        )}
        {loading && <div className="text-center py-12 text-sm text-slate-400">加载中...</div>}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? '编辑同步' : '新建同步'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>标题 <span className="text-red-500">*</span></Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="同步标题" /></div>
            <div><Label>内容</Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="同步内容..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>发布人</Label><Input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="发布人" /></div>
              <div><Label>目标</Label><Input value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} placeholder="目标群体" /></div>
            </div>
            <div>
              <Label>状态</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as SyncItem['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待发送</SelectItem>
                  <SelectItem value="sent">已发送</SelectItem>
                  <SelectItem value="read">已读确认</SelectItem>
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
