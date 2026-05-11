import { useEffect, useState, useCallback } from 'react';
import {
  FileText, Plus, Search, Trash2, LayoutGrid, List,
  Download, File as FileIcon, FileSpreadsheet, Presentation, Pencil,
} from 'lucide-react';
import { fetchFiles, createFile, updateFile, deleteFile, type FileItem } from '../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STORAGE_KEY = 'file_categories';
const defaultCategories = ['产品文档', '技术文档', '设计资源', '测试文档', '会议记录'];

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

const typeColors: Record<string, string> = {
  pdf:  'from-rose-500 to-pink-500',
  docx:  'from-blue-500 to-sky-500',
  xlsx:  'from-emerald-500 to-teal-500',
  pptx:  'from-amber-500 to-orange-500',
  default: 'from-slate-400 to-slate-500',
};

function FileTypeIcon({ type, size = 20 }: { type: string; size?: number }) {
  if (type === 'pdf')  return <FileIcon size={size} className="text-rose-500" />;
  if (type === 'docx') return <FileIcon size={size} className="text-blue-500" />;
  if (type === 'xlsx') return <FileSpreadsheet size={size} className="text-emerald-500" />;
  if (type === 'pptx') return <Presentation size={size} className="text-amber-500" />;
  return <FileIcon size={size} className="text-slate-400" />;
}

function FileTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    pdf:  { label: 'PDF',  bg: 'bg-rose-50',  text: 'text-rose-600' },
    docx: { label: 'Word', bg: 'bg-blue-50',  text: 'text-blue-600' },
    xlsx: { label: 'Excel', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    pptx: { label: 'PPT',  bg: 'bg-amber-50',  text: 'text-amber-600' },
  };
  const conf = map[type] || { label: type.toUpperCase(), bg: 'bg-slate-50', text: 'text-slate-500' };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${conf.bg} ${conf.text} border border-current/20`}>
      {conf.label}
    </span>
  );
}

interface Props { isAdmin: boolean; }

interface FileForm {
  name: string;
  category: string;
  type: string;
  size: string;
  url: string;
  description: string;
}

const emptyForm: FileForm = { name: '', category: '', type: 'pdf', size: '', url: '', description: '' };

export default function FilesPage({ isAdmin }: Props) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FileItem | null>(null);
  const [form, setForm] = useState<FileForm>(emptyForm);
  const [delTarget, setDelTarget] = useState<FileItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCat, setFilterCat] = useState('all');
  const [categories, setCategories] = useState<string[]>(loadCategories);

  useEffect(() => { saveCategories(categories); }, [categories]);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const data = await fetchFiles();
        if (!cancelled) {
          setFiles(data);
          const dbCats = [...new Set(data.map(f => f.category).filter(Boolean))];
          setCategories(prev => [...new Set([...prev, ...dbCats])]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load files:', err);
        if (!cancelled) {
          setError('加载文件数据失败');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { return load(); }, [load]);

  const searchLower = search.toLowerCase();
  const filtered = files.filter(f => {
    if (searchLower && !(
      f.name.toLowerCase().includes(searchLower) ||
      f.category.toLowerCase().includes(searchLower) ||
      f.uploader.toLowerCase().includes(searchLower)
    )) return false;
    if (filterCat !== 'all' && f.category !== filterCat) return false;
    return true;
  });

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, category: categories[0] || '' });
    setModalOpen(true);
  }

  function openEdit(file: FileItem) {
    setEditing(file);
    setForm({
      name: file.name,
      category: file.category,
      type: file.type,
      size: file.size,
      url: file.url,
      description: file.description,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('文件名不能为空'); return; }
    if (!form.category) { setError('请选择分类'); return; }
    if (!form.url.trim()) { setError('请输入文件链接'); return; }
    try {
      const payload = {
        name: form.name,
        category: form.category,
        type: form.type,
        size: form.size || '—',
        url: form.url,
        description: form.description,
        uploader: editing ? editing.uploader : 'admin',
        uploadDate: editing ? editing.uploadDate : new Date().toISOString().slice(0, 10),
      };
      if (editing) {
        await updateFile(editing.id, payload);
      } else {
        await createFile(payload);
      }
      setModalOpen(false);
      setError('');
      load();
    } catch (err) {
      console.error('Failed to save file:', err);
      setError(editing ? '更新文件失败' : '添加文件失败');
    }
  }

  async function handleDelete() {
    if (!delTarget) return;
    try {
      await deleteFile(delTarget.id);
      setDelTarget(null);
      load();
    } catch (err) {
      console.error('Failed to delete file:', err);
      setError('删除文件失败');
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">文件管理</h1>
          <p className="text-sm text-slate-400 mt-1">团队文件上传与共享</p>
        </div>
        {isAdmin && (
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 gradient-primary text-white text-sm font-medium px-5 py-2 rounded-xl hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all duration-200"
          >
            <Plus size={15} /> 上传文件
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
                <FileText size={16} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{files.length}</p>
                <p className="text-xs text-slate-400">文件总数</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
                <FileIcon size={16} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{[...new Set(files.map(f => f.type))].length}</p>
                <p className="text-xs text-slate-400">文件类型</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20">
                <Download size={16} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{categories.length}</p>
                <p className="text-xs text-slate-400">分类数量</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索文件名、分类或上传者..." className="pl-9 bg-white/80" />
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
        <div className="flex bg-white rounded-xl border border-slate-200/60 p-0.5">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-violet-50 text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-violet-50 text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-16 text-sm text-slate-400">加载中...</div>}

      {/* Grid View */}
      {!loading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(file => (
            <div key={file.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-slate-200/60 group">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${typeColors[file.type] || typeColors.default} shadow-lg`}>
                  <FileTypeIcon type={file.type} size={22} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => window.open(file.url, '_blank')} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Download size={13} /></button>
                  {isAdmin && (
                    <>
                      <button onClick={() => openEdit(file)} className="p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-all"><Pencil size={13} /></button>
                      <button onClick={() => setDelTarget(file)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1 truncate">{file.name}</h3>
              <p className="text-xs text-slate-400 mb-3 line-clamp-2">{file.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <FileTypeBadge type={file.type} />
                <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 font-medium">{file.category}</span>
              </div>
              <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
                <span>{file.uploader}</span>
                <span>{file.uploadDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && (
        <div className="space-y-2">
          {filtered.map(file => (
            <div key={file.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-slate-200/60">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${typeColors[file.type] || typeColors.default} shadow-lg`}>
                  <FileTypeIcon type={file.type} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 truncate">{file.name}</span>
                    <FileTypeBadge type={file.type} />
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 text-xs text-slate-400">
                    <span>{file.category}</span>
                    <span>{file.size}</span>
                    <span>{file.uploader}</span>
                    <span>{file.uploadDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => window.open(file.url, '_blank')} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="下载"><Download size={14} /></button>
                  {isAdmin && (
                    <>
                      <button onClick={() => openEdit(file)} className="p-2 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-all"><Pencil size={14} /></button>
                      <button onClick={() => setDelTarget(file)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-sm text-slate-400">
          {search || filterCat !== 'all' ? '没有找到匹配的文件' : '暂无文件'}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>{editing ? '编辑文件' : '上传文件'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium text-slate-500">文件名 <span className="text-rose-500">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="文件名（含扩展名）" className="mt-1.5" />
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
                <Label className="text-xs font-medium text-slate-500">文件类型</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">Word (docx)</SelectItem>
                    <SelectItem value="xlsx">Excel (xlsx)</SelectItem>
                    <SelectItem value="pptx">PowerPoint (pptx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500">文件链接 <span className="text-rose-500">*</span></Label>
              <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com/files/..." className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-500">文件大小</Label>
                <Input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="如 3.2MB" className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500">描述</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="文件说明..." rows={3} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-medium">取消</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm rounded-xl gradient-primary text-white hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all font-medium">保存</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!delTarget} onOpenChange={() => setDelTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-4">确定要删除文件「{delTarget?.name}」吗？此操作不可撤销。</p>
          <DialogFooter>
            <button onClick={() => setDelTarget(null)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-medium">取消</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-lg hover:shadow-rose-500/25 active:scale-[0.98] transition-all font-medium">删除</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
