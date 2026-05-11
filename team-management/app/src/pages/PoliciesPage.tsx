import { useEffect, useState } from 'react';
import { ScrollText, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { fetchPolicies, createPolicy, updatePolicy, deletePolicy, type Policy } from '../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusColor: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  draft: 'bg-amber-50 text-amber-700',
  expired: 'bg-slate-100 text-slate-500',
};
const statusLabel: Record<string, string> = { active: '生效中', draft: '草稿', expired: '已过期' };
const categoryOptions = ['行政管理', '信息安全', '开发规范', '财务管理'];

interface Props { isAdmin: boolean; }

export default function PoliciesPage({ isAdmin }: Props) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [form, setForm] = useState<Pick<Policy, 'title' | 'category' | 'department' | 'effectiveDate' | 'status' | 'summary'>>({
    title: '', category: '', department: '', effectiveDate: '', status: 'draft', summary: '',
  });
  const [delTarget, setDelTarget] = useState<Policy | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPolicies();
        if (!cancelled) setPolicies(data);
      } catch (err) {
        console.error('Failed to load policies:', err);
        if (!cancelled) setError('加载制度文档失败，请检查后端服务');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const searchLower = search.toLowerCase();
  const filtered = policies.filter(p => {
    const match = p.title.toLowerCase().includes(searchLower) || p.category.toLowerCase().includes(searchLower) || p.department.toLowerCase().includes(searchLower);
    return statusFilter ? match && p.status === statusFilter : match;
  });

  function openNew() {
    setEditing(null);
    setForm({ title: '', category: '', department: '', effectiveDate: '', status: 'draft', summary: '' });
    setModalOpen(true);
  }
  function openEdit(pol: Policy) {
    setEditing(pol);
    setForm({ title: pol.title, category: pol.category, department: pol.department, effectiveDate: pol.effectiveDate, status: pol.status, summary: pol.summary });
    setModalOpen(true);
  }
  async function handleSave() {
    if (!form.title.trim()) {
      setError('标题不能为空');
      return;
    }
    try {
      if (editing) {
        await updatePolicy(editing.id, form);
      } else {
        await createPolicy(form);
      }
      setModalOpen(false);
      setError('');
      load();
    } catch (err) {
      console.error('Failed to save policy:', err);
      setError(editing ? '更新文档失败' : '创建文档失败');
    }
  }
  async function handleDelete() {
    if (!delTarget) return;
    try {
      await deletePolicy(delTarget.id);
      setDelTarget(null);
      load();
    } catch (err) {
      console.error('Failed to delete policy:', err);
      setError('删除文档失败');
    }
  }
  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPolicies();
      setPolicies(data);
    } catch (err) {
      console.error('Failed to load policies:', err);
      setError('加载制度文档失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">制度文档</h1>
          <p className="text-sm text-slate-400 mt-0.5">团队制度和规范文件管理</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={15} /> 新建文档
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
      )}

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索文档标题、分类或部门..." className="pl-9" />
        </div>
        <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[140px] text-sm"><SelectValue placeholder="全部状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">生效中</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="expired">已过期</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-4 py-2.5 font-medium">文档标题</th>
              <th className="px-4 py-2.5 font-medium">分类</th>
              <th className="px-4 py-2.5 font-medium">发布部门</th>
              <th className="px-4 py-2.5 font-medium">生效日期</th>
              <th className="px-4 py-2.5 font-medium">状态</th>
              {isAdmin && <th className="px-4 py-2.5 font-medium">操作</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((pol, i) => (
              <tr key={pol.id} className={`hover:bg-slate-50 ${i < filtered.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ScrollText size={14} className="text-blue-500 shrink-0" />
                    <span className="font-medium text-slate-900">{pol.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 ml-6">{pol.summary}</p>
                </td>
                <td className="px-4 py-3 text-slate-500">{pol.category}</td>
                <td className="px-4 py-3 text-slate-500">{pol.department}</td>
                <td className="px-4 py-3 text-slate-500">{pol.effectiveDate}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[pol.status]}`}>{statusLabel[pol.status]}</span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(pol)} className="p-1 text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>
                      <button onClick={() => setDelTarget(pol)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">
            {search || statusFilter ? '没有找到匹配的文档' : '暂无制度文档，点击右上角新建'}
          </div>
        )}
        {loading && <div className="text-center py-12 text-sm text-slate-400">加载中...</div>}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? '编辑文档' : '新建文档'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>标题 <span className="text-red-500">*</span></Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="文档标题" /></div>
            <div>
              <Label>分类</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                <SelectContent>{categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>发布部门</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="发布部门" /></div>
            <div><Label>生效日期</Label><Input type="date" value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} /></div>
            <div>
              <Label>状态</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Policy['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="active">生效中</SelectItem>
                  <SelectItem value="expired">已过期</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>摘要</Label><Textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="文档摘要..." rows={3} /></div>
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
