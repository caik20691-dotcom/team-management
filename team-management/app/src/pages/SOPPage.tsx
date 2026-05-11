import { useEffect, useState, useRef, useCallback } from 'react';
import mammoth from 'mammoth';
import {
  FileText, Plus, Search, Filter, ChevronDown, ChevronRight,
  Pencil, Trash2, History, Upload, Download, Eye, X, File,
  Image, FileSpreadsheet, Presentation, FileArchive, Paperclip,
  ChevronUp, Clock, User, Tag, ArrowUpCircle, ArrowRightCircle,
  Loader2,
} from 'lucide-react';
import {
  fetchSOPs, createSOP, updateSOP, deleteSOP,
  fetchSOPVersions, createSOPVersion,
  type SOP, type SOPVersion, type SOPAttachment,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props { isAdmin: boolean; }

const statusColor: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700',
  active: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-slate-100 text-slate-500',
};
const statusLabel: Record<string, string> = { draft: '草稿', active: '生效中', archived: '已归档' };
const categoryOptions = ['人事流程', '开发规范', '客户服务', '运维规范'];

// 版本号递增算法
function incrementVersion(current: string, type: 'minor' | 'major'): string {
  const match = current.match(/v(\d+)\.(\d+)/);
  if (!match) return 'v1.0';
  const maj = parseInt(match[1]);
  const min = parseInt(match[2]);
  return type === 'major' ? `v${maj + 1}.0` : `v${maj}.${min + 1}`;
}

// 文件图标映射
function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.includes('pdf')) return FileText;
  if (type.includes('word') || type.includes('document')) return FileText;
  if (type.includes('sheet') || type.includes('excel')) return FileSpreadsheet;
  if (type.includes('presentation') || type.includes('powerpoint')) return Presentation;
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return FileArchive;
  return File;
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 预览/下载文件
function openFile(attachment: SOPAttachment) {
  const byteChars = atob(attachment.data.split(',')[1] || attachment.data);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: attachment.type });
  const url = URL.createObjectURL(blob);

  // 图片和 PDF 在新标签页预览
  if (attachment.type.startsWith('image/') || attachment.type.includes('pdf')) {
    window.open(url, '_blank');
  } else {
    // 其他类型触发下载
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function SOPPage({ isAdmin }: Props) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 列表状态
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<SOP | null>(null);

  // 编辑/新建状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SOP | null>(null);
  const [form, setForm] = useState<Pick<SOP, 'title' | 'category' | 'content' | 'status'>>({
    title: '', category: '', content: '', status: 'draft',
  });
  const [changeType, setChangeType] = useState<'minor' | 'major'>('minor');
  const [changeNote, setChangeNote] = useState('');
  const [formAttachments, setFormAttachments] = useState<SOPAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // 版本历史状态
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [versionSopId, setVersionSopId] = useState<string | null>(null);
  const [versionSopTitle, setVersionSopTitle] = useState('');
  const [versions, setVersions] = useState<SOPVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [viewVersion, setViewVersion] = useState<SOPVersion | null>(null);

  // 文件预览状态
  const [previewAtt, setPreviewAtt] = useState<SOPAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewError, setPreviewError] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewText, setPreviewText] = useState<string>('');

  // 预览附件时创建 blob URL，卸载时释放；对 Word/Excel 做内容解析
  useEffect(() => {
    if (!previewAtt) {
      setPreviewUrl('');
      setPreviewError('');
      setPreviewHtml('');
      setPreviewText('');
      setPreviewLoading(false);
      return;
    }

    let blobUrl = '';
    try {
      const base64 = previewAtt.data.split(',')[1] || previewAtt.data;
      const byteNumbers = new Array(base64.length);
      for (let i = 0; i < base64.length; i++) byteNumbers[i] = base64.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: previewAtt.type });
      blobUrl = URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
      setPreviewError('');

      // 对 Word 文档做 HTML 内容解析
      if (previewAtt.type.includes('word') || previewAtt.type.includes('document')) {
        setPreviewLoading(true);
        mammoth.convertToHtml({ arrayBuffer: byteArray.buffer as ArrayBuffer })
          .then(result => {
            setPreviewHtml(result.value);
            if (result.messages.length > 0) {
              console.warn('Mammoth warnings:', result.messages);
            }
          })
          .catch(err => {
            console.error('Word preview failed:', err);
            setPreviewHtml('');
            setPreviewError('Word 文档解析失败，请尝试下载后查看');
          })
          .finally(() => setPreviewLoading(false));
      }

      // 对 Excel/CSV 做表格解析
      if (previewAtt.type.includes('sheet') || previewAtt.type.includes('excel') || previewAtt.type.includes('csv') || previewAtt.type.includes('spreadsheet')) {
        setPreviewLoading(true);
        // 用 FileReader 读取为文本 (CSV/TSV) 或尝试简单解析 xlsx
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          if (text) {
            // 尝试按行分割生成简易表格
            const rows = text.split('\n').filter(r => r.trim());
            if (rows.length > 0) {
              const tableHtml = rows.map(row => {
                const cells = row.split('\t').length > 1 ? row.split('\t') : row.split(',');
                return '<tr>' + cells.map(c => `<td style="border:1px solid #e2e8f0;padding:6px 10px;font-size:13px;white-space:nowrap;">${c.trim()}</td>`).join('') + '</tr>';
              }).join('');
              setPreviewHtml(`<table style="border-collapse:collapse;width:100%;">${tableHtml}</table>`);
            }
          }
          setPreviewLoading(false);
        };
        reader.onerror = () => {
          setPreviewError('表格文件解析失败，请尝试下载后查看');
          setPreviewLoading(false);
        };
        reader.readAsText(blob);
      }

      // 对纯文本文件
      if (previewAtt.type.startsWith('text/') || previewAtt.name.endsWith('.txt') || previewAtt.name.endsWith('.md') || previewAtt.name.endsWith('.json') || previewAtt.name.endsWith('.xml') || previewAtt.name.endsWith('.log')) {
        setPreviewLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setPreviewText(text || '');
          setPreviewLoading(false);
        };
        reader.onerror = () => {
          setPreviewError('文本文件读取失败');
          setPreviewLoading(false);
        };
        reader.readAsText(blob);
      }

      return () => URL.revokeObjectURL(blobUrl);
    } catch {
      setPreviewError('文件预览失败，请尝试下载后查看');
    }
  }, [previewAtt]);

  // 加载 SOP 列表
  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSOPs();
      setSOPs(data);
    } catch (err) {
      console.error('Failed to load SOPs:', err);
      setError('加载SOP数据失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchSOPs();
        if (!cancelled) setSOPs(data);
      } catch (err) {
        console.error('Failed to load SOPs:', err);
        if (!cancelled) setError('加载SOP数据失败，请检查后端服务');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const searchLower = search.toLowerCase();
  const filtered = sops.filter(s => {
    const match = s.title.toLowerCase().includes(searchLower) || s.category.toLowerCase().includes(searchLower);
    return filterCat ? match && s.category === filterCat : match;
  });

  // 新建 SOP
  function openNew() {
    setEditing(null);
    setForm({ title: '', category: '', content: '', status: 'draft' });
    setChangeType('minor');
    setChangeNote('');
    setFormAttachments([]);
    setModalOpen(true);
  }

  // 编辑 SOP
  function openEdit(sop: SOP) {
    setEditing(sop);
    setForm({ title: sop.title, category: sop.category, content: sop.content, status: sop.status });
    setChangeType('minor');
    setChangeNote('');
    setFormAttachments([...(sop.attachments || [])]);
    setModalOpen(true);
  }

  // 文件上传处理
  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newAttachments: SOPAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_FILE_SIZE) {
          setError(`文件 "${file.name}" 超过 10MB 限制，已跳过`);
          continue;
        }
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newAttachments.push({
          id: `att-${Date.now()}-${i}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          data: base64,
          uploadedAt: new Date().toISOString().slice(0, 10),
          uploadedBy: user?.name || '未知',
        });
      }
      setFormAttachments(prev => [...prev, ...newAttachments]);
    } catch (err) {
      console.error('File upload failed:', err);
      setError('文件上传失败');
    } finally {
      setUploading(false);
    }
  }

  // 移除表单中的附件
  function removeFormAttachment(attId: string) {
    setFormAttachments(prev => prev.filter(a => a.id !== attId));
  }

  // 保存 SOP
  async function handleSave() {
    if (!form.title.trim()) {
      setError('标题不能为空');
      return;
    }
    try {
      if (editing) {
        // 编辑模式：先快照旧版本，再更新
        const newVersion = incrementVersion(editing.version, changeType);
        await createSOPVersion({
          sopId: editing.id,
          version: editing.version,
          title: editing.title,
          category: editing.category,
          content: editing.content,
          attachments: editing.attachments || [],
          status: editing.status,
          updatedBy: user?.name || '未知',
          updatedAt: new Date().toISOString().slice(0, 10),
          changeType,
          changeNote: changeNote || (changeType === 'major' ? '重大更新' : '常规更新'),
        });
        await updateSOP(editing.id, {
          ...form,
          version: newVersion,
          attachments: formAttachments,
          updatedAt: new Date().toISOString().slice(0, 10),
        });
      } else {
        // 新建模式
        await createSOP({
          ...form,
          owner: user?.name || '未知',
          version: 'v1.0',
          updatedAt: new Date().toISOString().slice(0, 10),
          attachments: formAttachments,
        });
      }
      setModalOpen(false);
      setError('');
      load();
    } catch (err) {
      console.error('Failed to save SOP:', err);
      setError(editing ? '更新SOP失败' : '创建SOP失败');
    }
  }

  // 删除 SOP
  async function handleDelete() {
    if (!delTarget) return;
    try {
      await deleteSOP(delTarget.id);
      setDelTarget(null);
      load();
    } catch (err) {
      console.error('Failed to delete SOP:', err);
      setError('删除SOP失败');
    }
  }

  // 打开版本历史
  async function openVersionHistory(sop: SOP) {
    setVersionSopId(sop.id);
    setVersionSopTitle(sop.title);
    setVersionDrawerOpen(true);
    setVersionsLoading(true);
    setViewVersion(null);
    try {
      const data = await fetchSOPVersions(sop.id);
      setVersions(data);
    } catch (err) {
      console.error('Failed to load versions:', err);
      setError('加载版本历史失败');
    } finally {
      setVersionsLoading(false);
    }
  }

  // 附件列表组件
  function AttachmentList({ attachments, canRemove, onRemove, onPreview }: {
    attachments: SOPAttachment[];
    canRemove?: boolean;
    onRemove?: (id: string) => void;
    onPreview?: (att: SOPAttachment) => void;
  }) {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="mt-3 space-y-1.5">
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Paperclip size={12} /> 附件 ({attachments.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {attachments.map(att => {
            const Icon = getFileIcon(att.type);
            const isPreviewable = att.type.startsWith('image/') || att.type.includes('pdf');
            return (
              <div
                key={att.id}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs group hover:border-violet-300 transition-colors"
              >
                <Icon size={14} className="text-violet-500 shrink-0" />
                <span className="text-slate-700 font-medium max-w-[120px] truncate" title={att.name}>{att.name}</span>
                <span className="text-slate-400">{formatFileSize(att.size)}</span>
                {onPreview && (
                  <button
                    onClick={() => onPreview(att)}
                    className={`p-1 transition-colors ${
                      isPreviewable
                        ? 'text-violet-500 hover:text-violet-700'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={isPreviewable ? '预览文件' : '查看文件信息'}
                  >
                    <Eye size={15} />
                  </button>
                )}
                <button
                  onClick={() => {
                    const byteChars = atob(att.data.split(',')[1] || att.data);
                    const byteNumbers = new Array(byteChars.length);
                    for (let i = 0; i < byteNumbers.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
                    const blob = new Blob([new Uint8Array(byteNumbers)], { type: att.type });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = att.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                  }}
                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                  title="下载"
                >
                  <Download size={15} />
                </button>
                {canRemove && onRemove && (
                  <button
                    onClick={() => onRemove(att.id)}
                    className="p-1 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="移除"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">工作 SOP</h1>
          <p className="text-sm text-slate-400 mt-0.5">标准操作流程管理 · 版本控制与文档管理</p>
        </div>
        {isAdmin && (
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <Plus size={15} /> 新建SOP
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索SOP标题或分类..." className="pl-9" />
        </div>
        <Select value={filterCat} onValueChange={v => setFilterCat(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[140px] text-sm">
            <Filter size={14} className="mr-1 text-slate-400" />
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(sop => {
          const isExpanded = expandedId === sop.id;
          const attCount = sop.attachments?.length || 0;
          return (
            <div key={sop.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
              {/* SOP Header Row */}
              <div className="flex items-center justify-between px-4 py-3">
                <button onClick={() => setExpandedId(isExpanded ? null : sop.id)} className="flex-1 flex items-center gap-3 min-w-0 text-left">
                  <FileText size={16} className="text-violet-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-900 truncate block">{sop.title}</span>
                    <span className="text-xs text-slate-400">{sop.category} · {sop.owner}</span>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">v{sop.version}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[sop.status]}`}>{statusLabel[sop.status]}</span>
                  {attCount > 0 && (
                    <span className="text-xs text-slate-400 flex items-center gap-0.5" title={`${attCount} 个附件`}>
                      <Paperclip size={11} /> {attCount}
                    </span>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(sop); }}
                        className="p-1 text-slate-400 hover:text-violet-600 transition-colors"
                        title="编辑"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDelTarget(sop); }}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  {isExpanded
                    ? <ChevronUp size={14} className="text-slate-400" />
                    : <ChevronDown size={14} className="text-slate-400" />
                  }
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                  <div className="bg-slate-50 rounded-lg p-3 mt-3">
                    <p className="text-xs text-slate-500 mb-1">流程内容</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{sop.content}</p>
                  </div>

                  {/* Attachments */}
                  <AttachmentList attachments={sop.attachments || []} onPreview={setPreviewAtt} />

                  {/* Meta info + Version History button */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><User size={11} /> {sop.owner}</span>
                      <span className="flex items-center gap-1"><Clock size={11} /> {sop.updatedAt}</span>
                      <span className="flex items-center gap-1"><Tag size={11} /> {sop.category}</span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => openVersionHistory(sop)}
                        className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 transition-colors"
                      >
                        <History size={13} /> 版本历史
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">
            {search || filterCat ? '没有找到匹配的SOP记录' : '暂无SOP记录，点击右上角新建'}
          </div>
        )}
        {loading && <div className="text-center py-12 text-sm text-slate-400">加载中...</div>}
      </div>

      {/* ===== New/Edit Modal ===== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑SOP' : '新建SOP'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>标题 <span className="text-rose-500">*</span></Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="SOP标题" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>分类</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                  <SelectContent>{categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>状态</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as SOP['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="active">生效中</SelectItem>
                    <SelectItem value="archived">已归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>流程内容</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="每行一个步骤..." rows={5} />
            </div>

            {/* Version management (edit mode only) */}
            {editing && (
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
                <p className="text-xs font-medium text-slate-600">版本控制</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>变更类型</Label>
                    <Select value={changeType} onValueChange={v => setChangeType(v as 'minor' | 'major')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">
                          <span className="flex items-center gap-1.5">
                            <ArrowRightCircle size={13} className="text-violet-500" /> 小更新 (+0.1)
                          </span>
                        </SelectItem>
                        <SelectItem value="major">
                          <span className="flex items-center gap-1.5">
                            <ArrowUpCircle size={13} className="text-amber-500" /> 重大更新 (+1.0)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>新版本号</Label>
                    <div className="h-9 px-3 flex items-center bg-white border border-slate-200 rounded-lg text-sm font-mono text-violet-600">
                      {incrementVersion(editing.version, changeType)}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>变更说明</Label>
                  <Input
                    value={changeNote}
                    onChange={e => setChangeNote(e.target.value)}
                    placeholder="描述本次变更内容..."
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {/* File Upload */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600">附件上传</p>
                <span className="text-xs text-slate-400">单个文件不超过 10MB</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => handleFileUpload(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs text-violet-500 hover:text-violet-700 border border-dashed border-violet-300 rounded-lg px-3 py-2 w-full justify-center hover:bg-violet-50 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>上传中...</>
                ) : (
                  <><Upload size={13} /> 点击上传文件（支持全格式）</>
                )}
              </button>
              {formAttachments.length > 0 && (
                  <AttachmentList
                    attachments={formAttachments}
                    canRemove
                    onRemove={removeFormAttachment}
                    onPreview={setPreviewAtt}
                  />
              )}
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">取消</button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm rounded-xl text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            >
              {editing ? `保存并升级为 ${incrementVersion(editing.version, changeType)}` : '创建'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirm ===== */}
      <Dialog open={!!delTarget} onOpenChange={() => setDelTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-4">确定要删除「{delTarget?.title}」吗？此操作不可撤销，所有版本历史也将一并删除。</p>
          <DialogFooter>
            <button onClick={() => setDelTarget(null)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">取消</button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm rounded-xl text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:shadow-lg hover:shadow-rose-500/25 transition-all"
            >
              删除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Version History Drawer (Dialog) ===== */}
      <Dialog open={versionDrawerOpen} onOpenChange={setVersionDrawerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <History size={18} className="text-violet-500" />
                版本历史 — {versionSopTitle}
              </span>
            </DialogTitle>
          </DialogHeader>

          {versionsLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">加载版本历史...</div>
          ) : versions.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">暂无版本历史</div>
          ) : viewVersion ? (
            /* Version Detail View */
            <div className="space-y-4 py-2">
              <button
                onClick={() => setViewVersion(null)}
                className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 transition-colors"
              >
                <ChevronRight size={13} /> 返回版本列表
              </button>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-900">{viewVersion.title}</span>
                  <span className="text-xs font-mono text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                    {viewVersion.version}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1"><User size={11} /> {viewVersion.updatedBy}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {viewVersion.updatedAt}</span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    viewVersion.changeType === 'major'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-violet-50 text-violet-600'
                  }`}>
                    {viewVersion.changeType === 'major' ? '重大更新' : '常规更新'}
                  </span>
                </div>
                {viewVersion.changeNote && (
                  <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3">
                    {viewVersion.changeNote}
                  </p>
                )}
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">流程内容</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{viewVersion.content}</p>
                </div>
                <AttachmentList attachments={viewVersion.attachments || []} onPreview={setPreviewAtt} />
              </div>
            </div>
          ) : (
            /* Version Timeline */
            <div className="py-2 space-y-0">
              {versions.map((v, idx) => (
                <div
                  key={v.id}
                  className="relative flex gap-3 pb-4 last:pb-0 cursor-pointer group"
                  onClick={() => setViewVersion(v)}
                >
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      idx === 0
                        ? 'bg-violet-100 text-violet-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {v.changeType === 'major' ? <ArrowUpCircle size={16} /> : <ArrowRightCircle size={16} />}
                    </div>
                    {idx < versions.length - 1 && (
                      <div className="w-px flex-1 bg-slate-200 mt-1" />
                    )}
                  </div>
                  {/* Version card */}
                  <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3 hover:border-violet-300 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">{v.version}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{v.updatedAt}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          v.changeType === 'major'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-slate-50 text-slate-500'
                        }`}>
                          {v.changeType === 'major' ? '重大' : '常规'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{v.changeNote}</p>
                    <p className="text-xs text-slate-400 mt-0.5">修改人：{v.updatedBy}</p>
                    {v.attachments && v.attachments.length > 0 && (
                      <span className="text-xs text-slate-400 flex items-center gap-0.5 mt-1">
                        <Paperclip size={10} /> {v.attachments.length} 个附件
                      </span>
                    )}
                    {idx === 0 && (
                      <span className="absolute top-2 right-2 text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">
                        当前
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== 文件预览对话框 ===== */}
      <Dialog open={!!previewAtt} onOpenChange={() => setPreviewAtt(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate flex items-center gap-2">
              {previewAtt && (() => { const Icon = getFileIcon(previewAtt.type); return <Icon size={18} className="text-violet-500 shrink-0" />; })()}
              {previewAtt?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-2 px-1">
            {/* Loading */}
            {previewLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 size={32} className="text-violet-500 animate-spin mb-3" />
                <p className="text-sm text-slate-500">正在解析文档内容...</p>
              </div>
            )}

            {/* 图片预览 */}
            {!previewLoading && previewAtt && previewUrl && previewAtt.type.startsWith('image/') && (
              <img src={previewUrl} alt={previewAtt.name} className="max-w-full max-h-[70vh] object-contain mx-auto block rounded-lg" />
            )}

            {/* PDF 预览 */}
            {!previewLoading && previewAtt && previewUrl && previewAtt.type.includes('pdf') && (
              <iframe src={previewUrl} title={previewAtt.name} className="w-full h-[70vh] rounded-lg border-0" />
            )}

            {/* Word 文档预览 */}
            {!previewLoading && previewHtml && previewAtt && (previewAtt.type.includes('word') || previewAtt.type.includes('document')) && (
              <div className="bg-white rounded-lg border border-slate-200 p-5">
                <div
                  className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            )}

            {/* Excel/CSV 表格预览 */}
            {!previewLoading && previewHtml && previewAtt && (previewAtt.type.includes('sheet') || previewAtt.type.includes('excel') || previewAtt.type.includes('csv') || previewAtt.type.includes('spreadsheet')) && (
              <div className="bg-white rounded-lg border border-slate-200 p-4 overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            )}

            {/* 纯文本文件预览 */}
            {!previewLoading && previewText && previewAtt && (
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-[70vh]">{previewText}</pre>
              </div>
            )}

            {/* PPT/其他不支持预览的文件 */}
            {!previewLoading && previewAtt && previewUrl && !previewHtml && !previewText && !(previewAtt.type.startsWith('image/') || previewAtt.type.includes('pdf') || previewAtt.type.includes('word') || previewAtt.type.includes('document') || previewAtt.type.includes('sheet') || previewAtt.type.includes('excel') || previewAtt.type.includes('csv') || previewAtt.type.includes('spreadsheet') || previewAtt.type.startsWith('text/')) && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  {(() => { const Icon = getFileIcon(previewAtt.type); return <Icon size={28} className="text-slate-400" />; })()}
                </div>
                <p className="text-sm font-medium text-slate-700">{previewAtt.name}</p>
                <p className="text-xs text-slate-400 mt-1">{previewAtt.type} · {formatFileSize(previewAtt.size)}</p>
                <p className="text-xs text-slate-400 mt-2">该文件类型暂不支持在线预览，请下载后查看</p>
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = previewUrl;
                    a.download = previewAtt!.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                >
                  <Download size={14} /> 下载文件
                </button>
              </div>
            )}

            {previewError && (
              <div className="text-center py-8">
                <p className="text-rose-500 text-sm mb-3">{previewError}</p>
                {previewUrl && (
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = previewUrl;
                      a.download = previewAtt!.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <Download size={14} /> 下载文件查看
                  </button>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => setPreviewAtt(null)}
              className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              关闭
            </button>
            {previewAtt && previewUrl && (
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = previewUrl;
                  a.download = previewAtt!.name;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="px-4 py-2 text-sm rounded-xl text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
              >
                <Download size={14} className="inline mr-1" /> 下载原件
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
