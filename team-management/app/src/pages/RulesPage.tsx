import { useEffect, useState, useCallback } from 'react';
import { GitBranch, Plus, Search, Pencil, Trash2, Tag, X } from 'lucide-react';
import { fetchBusinessRules, createBusinessRule, updateBusinessRule, deleteBusinessRule, type BusinessRule } from '../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STORAGE_KEY = 'rule_categories';
const defaultCategories = ['人事管理', '财务管理', '开发规范', '客户管理'];

function loadCategories(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [...defaultCategories];
}
function saveCategories(cats: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
}

const statusConfig: Record<BusinessRule['status'], { label: string; bg: string; text: string; border: string }> = {
  not_started: { label: '未开始', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
  active:      { label: '已启用', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  inactive:    { label: '已停用', bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200' },
};

interface Props { isAdmin: boolean; }

export default function RulesPage({ isAdmin }: Props) {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessRule | null>(null);
  const [categories, setCategories] = useState<string[]>(loadCategories);
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [form, setForm] = useState<Pick<BusinessRule, 'name' | 'category' | 'description' | 'status'>>({
    name: '', category: '', description: '', status: 'not_started',
  });
  const [delTarget, setDelTarget] = useState<BusinessRule | null>(null);

  useEffect(() => { saveCategories(categories); }, [categories]);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const data = await fetchBusinessRules();
        if (!cancelled) {
          setRules(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load business rules:', err);
          setError('加载业务规则失败，请检查后端服务');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { return load(); }, [load]);

  const searchLower = search.toLowerCase();
  const filtered = rules.filter(r =>
    r.name.toLowerCase().includes(searchLower) ||
    r.category.toLowerCase().includes(searchLower) ||
    r.description.toLowerCase().includes(searchLower)
  );

  function openNew() {
    setEditing(null);
    setForm({ name: '', category: categories[0] || '', description: '', status: 'not_started' });
    setModalOpen(true);
  }
  function openEdit(rule: BusinessRule) {
    setEditing(rule);
    setForm({ name: rule.name, category: rule.category, description: rule.description, status: rule.status });
    setModalOpen(true);
  }
  function addCategory() {
    const name = newCatName.trim();
    if (!name || categories.includes(name)) return;
    setCategories(prev => [...prev, name]);
    setForm(f => ({ ...f, category: name }));
    setNewCatName('');
  }
  function removeCategory(cat: string) {
    const updated = categories.filter(c => c !== cat);
    setCategories(updated);
    if (form.category === cat) setForm(f => ({ ...f, category: updated[0] || '' }));
  }
  async function handleSave() {
    if (!form.name.trim()) { setError('规则名称不能为空'); return; }
    if (!form.category) { setError('请选择分类'); return; }
    try {
      const now = new Date().toISOString().slice(0, 10);
      if (editing) {
        await updateBusinessRule(editing.id, { ...form, updatedAt: now });
      } else {
        await createBusinessRule({ ...form, creator: 'admin', updatedAt: now });
      }
      setModalOpen(false);
      setError('');
      load();
    } catch (err) {
      console.error('Failed to save business rule:', err);
      setError(editing ? '更新规则失败' : '创建规则失败');
    }
  }
  async function handleDelete() {
    if (!delTarget) return;
    try {
      await deleteBusinessRule(delTarget.id);
      setDelTarget(null);
      load();
    } catch (err) {
      console.error('Failed to delete business rule:', err);
      setError('删除规则失败');
    }
  }
  async function handleStatusChange(rule: BusinessRule, newStatus: BusinessRule['status']) {
    try {
      await updateBusinessRule(rule.id, { status: newStatus, updatedAt: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err) {
      console.error('Failed to update rule status:', err);
      setError('更新状态失败');
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">业务规则</h1>
          <p className="text-sm text-slate-400 mt-1">团队业务规则配置与管理</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="flex items-center gap-1.5 gradient-primary text-white text-sm font-medium px-5 py-2 rounded-xl hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all duration-200">
            <Plus size={15} /> 新建规则
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 shadow-sm">{error}</div>
      )}

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索规则名称、分类或描述..." className="pl-9 bg-white/80" />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(rule => {
          const sc = statusConfig[rule.status];
          return (
            <div key={rule.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-slate-200/60">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-violet-50 text-violet-500">
                    <GitBranch size={14} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{rule.name}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 font-medium">{rule.category}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2.5 py-0.5 rounded-lg border font-medium ${sc.bg} ${sc.text} ${sc.border}`}>
                    {sc.label}
                  </span>
                  {isAdmin && (
                    <>
                      <Select value={rule.status} onValueChange={v => handleStatusChange(rule, v as BusinessRule['status'])}>
                        <SelectTrigger className="h-7 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">未开始</SelectItem>
                          <SelectItem value="active">已启用</SelectItem>
                          <SelectItem value="inactive">已停用</SelectItem>
                        </SelectContent>
                      </Select>
                      <button onClick={() => openEdit(rule)} className="p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-all"><Pencil size={14} /></button>
                      <button onClick={() => setDelTarget(rule)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 ml-8 mb-1">{rule.description}</p>
              <p className="text-xs text-slate-300 ml-8">更新于 {rule.updatedAt}</p>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-slate-400">
            {search ? '没有找到匹配的业务规则' : '暂无业务规则'}
          </div>
        )}
        {loading && <div className="text-center py-16 text-sm text-slate-400">加载中...</div>}
      </div>

      {/* 新建/编辑规则弹窗 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>{editing ? '编辑规则' : '新建规则'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium text-slate-500">规则名称 <span className="text-rose-500">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="规则名称" className="mt-1.5" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-medium text-slate-500">分类</Label>
                <button type="button" onClick={() => setShowCatMgr(!showCatMgr)} className="text-xs text-violet-500 hover:text-violet-600 flex items-center gap-0.5 font-medium transition-colors">
                  <Tag size={12} /> 管理分类
                </button>
              </div>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {showCatMgr && (
                <div className="mt-2.5 p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">管理分类（点击 x 删除）：</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(c => (
                      <span key={c} className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm">
                        {c}
                        <button type="button" onClick={() => removeCategory(c)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <Input
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
                      placeholder="新分类名称"
                      className="h-8 text-xs"
                    />
                    <button type="button" onClick={addCategory} disabled={!newCatName.trim()} className="h-8 px-3 text-xs gradient-primary text-white rounded-lg hover:shadow-md hover:shadow-violet-500/20 disabled:opacity-40 transition-all font-medium">
                      添加
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500">描述</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="规则描述..." rows={3} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500">状态</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as BusinessRule['status'] }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">未开始</SelectItem>
                  <SelectItem value="active">已启用</SelectItem>
                  <SelectItem value="inactive">已停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-medium">取消</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm rounded-xl gradient-primary text-white hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all font-medium">保存</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={!!delTarget} onOpenChange={() => setDelTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-4">确定要删除「{delTarget?.name}」吗？此操作不可撤销。</p>
          <DialogFooter>
            <button onClick={() => setDelTarget(null)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-medium">取消</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-lg hover:shadow-rose-500/25 active:scale-[0.98] transition-all font-medium">删除</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
