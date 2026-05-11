import { useEffect, useState } from 'react';
import { Plus, Search, Pin, PinOff, AlertTriangle, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type Announcement,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const priorityColor: Record<string, string> = {
  normal: 'bg-slate-50 text-slate-600 border-slate-200',
  important: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
};
const priorityLabel: Record<string, string> = {
  normal: '普通',
  important: '重要',
  urgent: '紧急',
};
const statusColor: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500 border-slate-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const statusLabel: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
};

interface Props {
  isAdmin: boolean;
}

export default function AnnouncementsPageInner({ isAdmin }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<Omit<Announcement, 'id'>>({
    title: '',
    content: '',
    author: '',
    priority: 'normal',
    pinned: false,
    status: 'draft',
    createdAt: '',
    updatedAt: '',
  });
  const [delTarget, setDelTarget] = useState<Announcement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const searchLower = search.toLowerCase();
  const filtered = items.filter(
    (a) =>
      a.title.toLowerCase().includes(searchLower) ||
      a.content.toLowerCase().includes(searchLower)
  );

  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAnnouncements();
      setItems(data);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setError('加载公告失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm({
      title: '',
      content: '',
      author: user?.name || '',
      priority: 'normal',
      pinned: false,
      status: 'draft',
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditing(item);
    setForm({
      title: item.title,
      content: item.content,
      author: item.author,
      priority: item.priority,
      pinned: item.pinned,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('标题不能为空');
      return;
    }
    try {
      if (editing) {
        await updateAnnouncement(editing.id, form);
      } else {
        await createAnnouncement(form);
      }
      setModalOpen(false);
      setError('');
      load();
    } catch (err) {
      console.error('Failed to save announcement:', err);
      setError(editing ? '更新公告失败' : '创建公告失败');
    }
  }

  async function handleDelete() {
    if (!delTarget) return;
    try {
      await deleteAnnouncement(delTarget.id);
      setDelTarget(null);
      load();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      setError('删除公告失败');
    }
  }

  async function togglePin(item: Announcement) {
    try {
      await updateAnnouncement(item.id, { pinned: !item.pinned });
      load();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  }

  async function toggleStatus(item: Announcement) {
    const newStatus = item.status === 'draft' ? 'published' : 'draft';
    try {
      await updateAnnouncement(item.id, { status: newStatus, updatedAt: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">公告列表</h2>
          <p className="text-sm text-slate-400 mt-0.5">团队公告发布与管理</p>
        </div>
        {isAdmin && (
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 bg-violet-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus size={15} /> 发布公告
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          {
            label: '已发布',
            count: items.filter((a) => a.status === 'published').length,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: '草稿',
            count: items.filter((a) => a.status === 'draft').length,
            color: 'text-slate-500',
            bg: 'bg-slate-50',
          },
          {
            label: '置顶公告',
            count: items.filter((a) => a.pinned).length,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            label: '紧急公告',
            count: items.filter((a) => a.priority === 'urgent').length,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
          },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl border border-transparent p-3 text-center`}>
            <p className="text-xs text-slate-400">{stat.label}</p>
            <p className={`text-xl font-semibold ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索公告标题或内容..."
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        {sorted.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-xl border transition-all ${
              item.pinned ? 'border-amber-200 shadow-sm' : 'border-slate-200'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.pinned && (
                    <Pin size={14} className="text-amber-500 shrink-0" />
                  )}
                  {item.priority === 'urgent' && (
                    <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-slate-900 truncate">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor[item.priority]}`}>
                    {priorityLabel[item.priority]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[item.status]}`}>
                    {statusLabel[item.status]}
                  </span>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => togglePin(item)}
                        className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
                        title={item.pinned ? '取消置顶' : '置顶'}
                      >
                        {item.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1 text-slate-400 hover:text-violet-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDelTarget(item)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p
                className={`text-sm text-slate-500 whitespace-pre-line ${
                  expandedId === item.id ? '' : 'line-clamp-2'
                }`}
              >
                {item.content}
              </p>
              {(item.content.length > 100 || item.content.includes('\n')) && (
                <button
                  onClick={() =>
                    setExpandedId(expandedId === item.id ? null : item.id)
                  }
                  className="text-xs text-violet-500 hover:text-violet-700 mt-1 flex items-center gap-1"
                >
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`}
                  />
                  {expandedId === item.id ? '收起' : '展开全文'}
                </button>
              )}
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                <span>发布人：{item.author}</span>
                <span>创建：{item.createdAt}</span>
                {item.updatedAt !== item.createdAt && <span>更新：{item.updatedAt}</span>}
                {isAdmin && (
                  <button
                    onClick={() => toggleStatus(item)}
                    className={`ml-auto text-xs px-2 py-0.5 rounded-lg transition-colors ${
                      item.status === 'draft'
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {item.status === 'draft' ? '发布' : '撤回'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && sorted.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">
            {search ? '没有找到匹配的公告' : '暂无公告，点击右上角发布新公告'}
          </div>
        )}
        {loading && <div className="text-center py-12 text-sm text-slate-400">加载中...</div>}
      </div>

      {/* Edit/Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑公告' : '发布公告'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>标题 <span className="text-rose-500">*</span></Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="公告标题"
              />
            </div>
            <div>
              <Label>内容</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="公告内容..."
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>发布人</Label>
                <Input
                  value={form.author}
                  onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                  placeholder="发布人"
                />
              </div>
              <div>
                <Label>优先级</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v as Announcement['priority'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">普通</SelectItem>
                    <SelectItem value="important">重要</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>状态</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as Announcement['status'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="published">直接发布</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.pinned}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, pinned: checked }))}
                />
                <Label className="cursor-pointer" onClick={() => setForm((f) => ({ ...f, pinned: !f.pinned }))}>
                  置顶公告
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700"
            >
              保存
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!delTarget} onOpenChange={() => setDelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-4">
            确定要删除公告「{delTarget?.title}」吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <button
              onClick={() => setDelTarget(null)}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              删除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
