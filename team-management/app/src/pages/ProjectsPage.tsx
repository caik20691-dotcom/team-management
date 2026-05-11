import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Users, Calendar, TrendingUp } from 'lucide-react';
import { fetchProjects, createProject, updateProject, deleteProject, type Project } from '../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  planning: { label: '规划中', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  in_progress: { label: '进行中', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  review: { label: '审核中', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  completed: { label: '已完成', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  cancelled: { label: '已取消', color: 'text-rose-600', bgColor: 'bg-rose-100' },
};

interface Props { isAdmin: boolean; }

export default function ProjectsPage({ isAdmin }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<Partial<Project>>({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    startDate: '',
    endDate: '',
    owner: '',
    members: [],
    progress: 0,
    relatedTasks: [],
  });
  const [memberInput, setMemberInput] = useState('');
  const [delTarget, setDelTarget] = useState<Project | null>(null);

  useEffect(() => {
    load();
  }, []);

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.owner.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: projects.length,
    planning: projects.filter(p => p.status === 'planning').length,
    in_progress: projects.filter(p => p.status === 'in_progress').length,
    review: projects.filter(p => p.status === 'review').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  function openNew() {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      startDate: '',
      endDate: '',
      owner: '',
      members: [],
      progress: 0,
      relatedTasks: [],
    });
    setMemberInput('');
    setModalOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setForm({
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate,
      endDate: project.endDate,
      owner: project.owner,
      members: [...project.members],
      progress: project.progress,
      relatedTasks: [...project.relatedTasks],
    });
    setMemberInput('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      setError('请输入项目名称');
      return;
    }
    try {
      if (editing) {
        await updateProject(editing.id, form);
      } else {
        const now = new Date().toISOString().split('T')[0];
        await createProject({
          name: form.name!,
          description: form.description || '',
          status: form.status as Project['status'],
          priority: form.priority as Project['priority'],
          startDate: form.startDate || now,
          endDate: form.endDate || now,
          owner: form.owner || '',
          members: form.members || [],
          progress: form.progress || 0,
          relatedTasks: form.relatedTasks || [],
          createdAt: now,
          updatedAt: now,
        });
      }
      setModalOpen(false);
      setError('');
      load();
    } catch (err) {
      console.error('Failed to save project:', err);
      setError(editing ? '更新项目失败' : '创建项目失败');
    }
  }

  async function handleDelete() {
    if (!delTarget) return;
    try {
      await deleteProject(delTarget.id);
      setDelTarget(null);
      load();
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('删除项目失败');
    }
  }

  function addMember() {
    const member = memberInput.trim();
    if (member && !form.members?.includes(member)) {
      setForm(f => ({ ...f, members: [...(f.members || []), member] }));
    }
    setMemberInput('');
  }

  function removeMember(member: string) {
    setForm(f => ({ ...f, members: f.members?.filter(m => m !== member) || [] }));
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('加载项目数据失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">项目管理</h1>
          <p className="text-sm text-slate-400 mt-1">团队项目跟踪与管理</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="flex items-center gap-1.5 gradient-primary text-white text-sm font-medium px-5 py-2 rounded-xl hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all duration-200">
            <Plus size={15} /> 新建项目
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 shadow-sm">{error}</div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { key: 'all', label: '全部项目', count: counts.all, color: 'bg-blue-500' },
          { key: 'planning', label: '规划中', count: counts.planning, color: 'bg-slate-400' },
          { key: 'in_progress', label: '进行中', count: counts.in_progress, color: 'bg-blue-500' },
          { key: 'review', label: '审核中', count: counts.review, color: 'bg-amber-500' },
          { key: 'completed', label: '已完成', count: counts.completed, color: 'bg-emerald-500' },
        ].map(stat => (
          <button key={stat.key} onClick={() => setStatusFilter(stat.key)}
            className={`text-left p-4 rounded-xl border transition-all ${statusFilter === stat.key ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${stat.color}`} />
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.count}</p>
          </button>
        ))}
      </div>

      {/* 筛选器 */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索项目名称、描述或负责人..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="planning">规划中</SelectItem>
            <SelectItem value="in_progress">进行中</SelectItem>
            <SelectItem value="review">审核中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 项目卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(project => {
          const st = statusConfig[project.status];
          return (
            <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-base flex-1 mr-2">{project.name}</h3>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${st.bgColor} ${st.color}`}>{st.label}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{project.description}</p>

              {/* 进度条 */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">进度</span>
                  <span className="text-xs font-medium text-slate-700">{project.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${project.progress >= 80 ? 'bg-emerald-500' : project.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Users size={12} />
                  <span>负责人：{project.owner}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar size={12} />
                  <span>{project.startDate} ~ {project.endDate}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <TrendingUp size={12} />
                  <span>成员：{project.members.length}人</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex gap-1">
                  {project.members.slice(0, 3).map((member, idx) => (
                    <div key={idx} className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-violet-400 flex items-center justify-center text-[10px] font-bold text-white">
                      {member[0]}
                    </div>
                  ))}
                  {project.members.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                      +{project.members.length - 3}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(project)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDelTarget(project)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-slate-400">
          {search || statusFilter !== 'all' ? '没有找到匹配的项目' : '暂无项目，点击右上角新建'}
        </div>
      )}
      {loading && <div className="text-center py-12 text-sm text-slate-400">加载中...</div>}

      {/* 新建/编辑模态框 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? '编辑项目' : '新建项目'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>项目名称 <span className="text-red-500">*</span></Label>
              <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="项目名称" />
            </div>
            <div>
              <Label>项目描述</Label>
              <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="项目描述" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>状态</Label>
                <Select value={form.status || 'planning'} onValueChange={v => setForm(f => ({ ...f, status: v as Project['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">规划中</SelectItem>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="review">审核中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>优先级</Label>
                <Select value={form.priority || 'medium'} onValueChange={v => setForm(f => ({ ...f, priority: v as Project['priority'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>开始日期</Label>
                <Input type="date" value={form.startDate || ''} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>截止日期</Label>
                <Input type="date" value={form.endDate || ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>负责人</Label>
              <Input value={form.owner || ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="负责人" />
            </div>
            <div>
              <Label>进度（0-100）</Label>
              <Input type="number" min="0" max="100" value={form.progress || 0} onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>项目成员</Label>
              <div className="flex gap-2 items-center">
                <Input value={memberInput} onChange={e => setMemberInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMember(); }}} placeholder="输入成员姓名后回车" className="flex-1" />
                <button type="button" onClick={addMember} className="text-xs px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">添加</button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.members?.map(member => (
                  <span key={member} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 flex items-center gap-1">
                    {member}
                    <button type="button" onClick={() => removeMember(member)} className="hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-medium">取消</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm rounded-xl gradient-primary text-white hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all font-medium">保存</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
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
