import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen, Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import {
  fetchKBArticles, createKBArticle, updateKBArticle, deleteKBArticle,
  type KBArticle,
} from '../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const STORAGE_KEY = 'kb_categories';
const defaultCategories = ['技术文档', '团队规范', '产品说明', '踩坑记录', '最佳实践'];

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

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  draft:     { label: '草稿', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  published:  { label: '已发布', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
};

interface Props { isAdmin: boolean; }

interface KBForm {
  title: string;
  category: string;
  tags: string;
  content: string;
  status: KBArticle['status'];
}

const emptyForm: KBForm = { title: '', category: '', tags: '', content: '', status: 'draft' };

export default function KBPage({ isAdmin }: Props) {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KBArticle | null>(null);
  const [form, setForm] = useState<KBForm>(emptyForm);
  const [delTarget, setDelTarget] = useState<KBArticle | null>(null);
  const [viewing, setViewing] = useState<KBArticle | null>(null);
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [categories, setCategories] = useState<string[]>(loadCategories);

  useEffect(() => { saveCategories(categories); }, [categories]);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const data = await fetchKBArticles();
        if (!cancelled) {
          setArticles(data);
          const dbCats = [...new Set(data.map(a => a.category).filter(Boolean))];
          setCategories(prev => [...new Set([...prev, ...dbCats])]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load KB articles:', err);
        if (!cancelled) { setError('加载知识库失败'); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { return load(); }, [load]);

  const searchLower = search.toLowerCase();
  const filtered = articles.filter(a => {
    if (searchLower && !(
      a.title.toLowerCase().includes(searchLower) ||
      a.category.toLowerCase().includes(searchLower) ||
      a.author.toLowerCase().includes(searchLower) ||
      a.tags.some(t => t.toLowerCase().includes(searchLower))
    )) return false;
    if (filterCat !== 'all' && a.category !== filterCat) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, category: categories[0] || '' });
    setModalOpen(true);
  }

  function openEdit(article: KBArticle) {
    setEditing(article);
    setForm({
      title: article.title,
      category: article.category,
      tags: article.tags.join(', '),
      content: article.content,
      status: article.status,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('标题不能为空'); return; }
    if (!form.category) { setError('请选择分类'); return; }
    if (!form.content.trim()) { setError('内容不能为空'); return; }
    try {
      const now = new Date().toISOString().slice(0, 10);
      const payload = {
        title: form.title,
        category: form.category,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        content: form.content,
        status: form.status,
        author: editing ? editing.author : 'admin',
        createdAt: editing ? editing.createdAt : now,
        updatedAt: now,
        viewCount: editing ? editing.viewCount : 0,
      };
      if (editing) {
        await updateKBArticle(editing.id, payload);
      } else {
        await createKBArticle(payload);
      }
      setModalOpen(false);
      setError('');
      load();
    } catch (err) {
      console.error('Failed to save article:', err);
      setError(editing ? '更新文章失败' : '创建文章失败');
    }
  }

  async function handleDelete() {
    if (!delTarget) return;
    try {
      await deleteKBArticle(delTarget.id);
      setDelTarget(null);
      load();
    } catch (err) {
      console.error('Failed to delete article:', err);
      setError('删除文章失败');
    }
  }

  function handleView(article: KBArticle) {
    setViewing(article);
  }

  function insertMarkdown(before: string, after: string = '') {
    const ta = document.getElementById('kb-content-editor') as HTMLTextAreaElement;
    if (!ta) {
      setForm(f => ({ ...f, content: f.content + before + after }));
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = form.content.slice(start, end);
    const newContent = form.content.slice(0, start) + before + selected + after + form.content.slice(end);
    setForm(f => ({ ...f, content: newContent }));
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    }, 0);
  }

  const publishedCount = articles.filter(a => a.status === 'published').length;
  const totalViews = articles.reduce((s, a) => s + a.viewCount, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">知识库</h1>
          <p className="text-sm text-slate-400 mt-1">团队知识沉淀与文档共享</p>
        </div>
        {isAdmin && (
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 gradient-primary text-white text-sm font-medium px-5 py-2 rounded-xl hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all duration-200"
          >
            <Plus size={15} /> 新建文章
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 shadow-sm">{error}</div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
                <BookOpen size={16} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{articles.length}</p>
                <p className="text-xs text-slate-400">文章总数</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
                <BookOpen size={16} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{publishedCount}</p>
                <p className="text-xs text-slate-400">已发布</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
                <Eye size={16} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{totalViews}</p>
                <p className="text-xs text-slate-400">总阅读量</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索标题、分类、作者或标签..." className="pl-9 bg-white/80" />
        </div>
        <Select value={filterCat} onValueChange={v => setFilterCat(v)}>
          <SelectTrigger className="w-[130px] bg-white/80">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v)}>
          <SelectTrigger className="w-[110px] bg-white/80">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="published">已发布</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && <div className="text-center py-16 text-sm text-slate-400">加载中...</div>}

      {/* Article List */}
      {!loading && (
        <div className="space-y-3">
          {filtered.map(article => {
            const sc = statusConfig[article.status] || statusConfig.draft;
            return (
              <div key={article.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-slate-200/60 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-xl bg-violet-50 text-violet-500 shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button onClick={() => handleView(article)} className="text-sm font-semibold text-slate-800 hover:text-violet-600 transition-colors text-left truncate">
                          {article.title}
                        </button>
                        <span className={`text-[11px] px-2 py-0.5 rounded-lg font-medium border ${sc.bg} ${sc.text} ${sc.border}`}>
                          {sc.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{article.author}</span>
                        <span>更新于 {article.updatedAt}</span>
                        <span className="flex items-center gap-1"><Eye size={11} /> {article.viewCount}</span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(article)} className="p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-all"><Pencil size={13} /></button>
                      <button onClick={() => setDelTarget(article)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                {article.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {article.tags.map(tag => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-sm text-slate-400">
              {search || filterCat !== 'all' || filterStatus !== 'all' ? '没有找到匹配的文章' : '暂无知识库文章'}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader><DialogTitle>{editing ? '编辑文章' : '新建文章'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium text-slate-500">标题 <span className="text-rose-500">*</span></Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="文章标题" className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-500">分类</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="选择分类" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">状态</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Switch checked={form.status === 'published'} onCheckedChange={v => setForm(f => ({ ...f, status: v ? 'published' : 'draft' }))} />
                  <span className="text-xs text-slate-500">{form.status === 'published' ? '已发布' : '草稿'}</span>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500">标签</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="用逗号分隔，如：React, TypeScript, 入门" className="mt-1.5" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-medium text-slate-500">内容（Markdown） <span className="text-rose-500">*</span></Label>
                <div className="flex gap-0.5">
                  <button type="button" onClick={() => insertMarkdown('**', '**')} className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-all font-bold">B</button>
                  <button type="button" onClick={() => insertMarkdown('*', '*')} className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-all italic">I</button>
                  <button type="button" onClick={() => insertMarkdown('\n## ', '')} className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-all font-medium">H2</button>
                  <button type="button" onClick={() => insertMarkdown('`', '`')} className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-all font-mono">`</button>
                  <button type="button" onClick={() => insertMarkdown('\n```bash\n', '\n```')} className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-all">{'</>'}</button>
                </div>
              </div>
              <Textarea
                id="kb-content-editor"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="使用 Markdown 编写内容..."
                rows={14}
                className="mt-0 font-mono text-sm leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-medium">取消</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm rounded-xl gradient-primary text-white hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all font-medium">保存</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Article Dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
          {viewing && (
            <div>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <DialogTitle className="text-left">{viewing.title}</DialogTitle>
                  <span className={`text-[11px] px-2 py-0.5 rounded-lg font-medium border ${statusConfig[viewing.status].bg} ${statusConfig[viewing.status].text} ${statusConfig[viewing.status].border}`}>
                    {statusConfig[viewing.status].label}
                  </span>
                </div>
              </DialogHeader>
              <div className="flex items-center gap-3 text-xs text-slate-400 mb-4 pb-4 border-b border-slate-100">
                <span>{viewing.author}</span>
                <span>更新于 {viewing.updatedAt}</span>
                <span className="flex items-center gap-1"><Eye size={11} /> {viewing.viewCount + 1}</span>
                <div className="flex gap-1">
                  {viewing.tags.map(tag => (
                    <span key={tag} className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-code:text-violet-600 prose-code:bg-violet-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-li:text-slate-600 prose-a:text-violet-600">
                <ReactMarkdown>{viewing.content}</ReactMarkdown>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!delTarget} onOpenChange={() => setDelTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-4">确定要删除文章「{delTarget?.title}」吗？此操作不可撤销。</p>
          <DialogFooter>
            <button onClick={() => setDelTarget(null)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-medium">取消</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-lg hover:shadow-rose-500/25 active:scale-[0.98] transition-all font-medium">删除</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
