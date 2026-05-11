import { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Search, Pencil, Trash2, LayoutGrid, List, Phone, Mail, Calendar, Shield } from 'lucide-react';
import { fetchUsers, createUser, updateUser, deleteUser, type User } from '../api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STORAGE_KEY = 'member_departments';
const defaultDepartments = ['技术部', '设计部', '测试部', '产品部', '人力资源部', '财务部'];

function loadDepartments(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [...defaultDepartments];
}
function saveDepartments(depts: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(depts));
}

const roleConfig: Record<User['role'], { label: string; bg: string; text: string; border: string }> = {
  admin:  { label: '管理员', bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  viewer: { label: '查阅者', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
};

const statusConfig: Record<User['status'], { label: string; dot: string }> = {
  active:   { label: '在职', dot: 'bg-emerald-400' },
  inactive: { label: '离职', dot: 'bg-slate-300' },
};

interface Props { isAdmin: boolean; }

interface MemberForm {
  name: string;
  username: string;
  password: string;
  role: User['role'];
  department: string;
  phone: string;
  email: string;
  joinDate: string;
  status: User['status'];
}

const emptyForm: MemberForm = {
  name: '', username: '', password: '', role: 'viewer',
  department: '', phone: '', email: '', joinDate: '', status: 'active',
};

export default function MembersPage({ isAdmin }: Props) {
  const [members, setMembers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [delTarget, setDelTarget] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterDept, setFilterDept] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [departments, setDepartments] = useState<string[]>(loadDepartments);

  useEffect(() => { saveDepartments(departments); }, [departments]);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const data = await fetchUsers();
        if (!cancelled) {
          setMembers(data);
          // auto-discover new departments
          const dbDepts = [...new Set(data.map(u => u.department).filter(Boolean))];
          setDepartments(prev => {
            const merged = [...new Set([...prev, ...dbDepts])];
            return merged;
          });
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load members:', err);
        if (!cancelled) {
          setError('加载成员数据失败，请检查后端服务');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { return load(); }, [load]);

  const searchLower = search.toLowerCase();
  const filtered = members.filter(m => {
    if (searchLower && !(
      m.name.toLowerCase().includes(searchLower) ||
      m.username.toLowerCase().includes(searchLower) ||
      m.department.toLowerCase().includes(searchLower) ||
      m.email.toLowerCase().includes(searchLower)
    )) return false;
    if (filterDept !== 'all' && m.department !== filterDept) return false;
    if (filterRole !== 'all' && m.role !== filterRole) return false;
    return true;
  });

  const deptCounts = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.department] = (acc[m.department] || 0) + 1;
    return acc;
  }, {});

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, department: departments[0] || '' });
    setModalOpen(true);
  }

  function openEdit(member: User) {
    setEditing(member);
    setForm({
      name: member.name,
      username: member.username,
      password: '',
      role: member.role,
      department: member.department,
      phone: member.phone,
      email: member.email,
      joinDate: member.joinDate,
      status: member.status,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('姓名不能为空'); return; }
    if (!form.username.trim()) { setError('用户名不能为空'); return; }
    if (!editing && !form.password.trim()) { setError('密码不能为空'); return; }
    if (!form.department) { setError('请选择部门'); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('邮箱格式不正确');
      return;
    }
    try {
      if (editing) {
        const patch: Partial<User> = {
          name: form.name, username: form.username, role: form.role,
          department: form.department, phone: form.phone, email: form.email,
          joinDate: form.joinDate, status: form.status,
        };
        if (form.password.trim()) patch.password = form.password;
        await updateUser(editing.id, patch);
      } else {
        await createUser({
          ...form,
          avatar: form.name.charAt(0),
        });
      }
      setModalOpen(false);
      setError('');
      load();
    } catch (err) {
      console.error('Failed to save member:', err);
      setError(editing ? '更新成员失败' : '添加成员失败');
    }
  }

  async function handleDelete() {
    if (!delTarget) return;
    try {
      await deleteUser(delTarget.id);
      setDelTarget(null);
      load();
    } catch (err) {
      console.error('Failed to delete member:', err);
      setError('删除成员失败');
    }
  }

  const activeCount = members.filter(m => m.status === 'active').length;
  const adminCount = members.filter(m => m.role === 'admin').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">团队成员</h1>
          <p className="text-sm text-slate-400 mt-1">组织架构与成员信息管理</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="flex items-center gap-1.5 gradient-primary text-white text-sm font-medium px-5 py-2 rounded-xl hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all duration-200">
            <Plus size={15} /> 添加成员
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 shadow-sm">{error}</div>
      )}

      {/* Stats bar */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
                <Users size={16} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{members.length}</p>
                <p className="text-xs text-slate-400">全部成员</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
                <Shield size={16} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{activeCount}</p>
                <p className="text-xs text-slate-400">在职成员</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
                <Calendar size={16} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{Object.keys(deptCounts).length}</p>
                <p className="text-xs text-slate-400">部门数量</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索姓名、用户名、部门或邮箱..." className="pl-9 bg-white/80" />
        </div>
        <Select value={filterDept} onValueChange={v => setFilterDept(v)}>
          <SelectTrigger className="w-[130px] bg-white/80">
            <SelectValue placeholder="全部部门" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部部门</SelectItem>
            {Object.entries(deptCounts).sort().map(([dept, count]) => (
              <SelectItem key={dept} value={dept}>{dept} ({count})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={v => setFilterRole(v)}>
          <SelectTrigger className="w-[110px] bg-white/80">
            <SelectValue placeholder="全部角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            <SelectItem value="admin">管理员 ({adminCount})</SelectItem>
            <SelectItem value="viewer">查阅者 ({members.length - adminCount})</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex bg-white rounded-xl border border-slate-200/60 p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-violet-50 text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-violet-50 text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && <div className="text-center py-16 text-sm text-slate-400">加载中...</div>}

      {/* Grid View */}
      {!loading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(member => {
            const rc = roleConfig[member.role];
            const sc = statusConfig[member.status];
            return (
              <div key={member.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-slate-200/60 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-base font-bold text-white shadow-lg shadow-violet-500/20">
                      {member.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{member.name}</span>
                        <span className={`w-2 h-2 rounded-full ${sc.dot}`} title={sc.label} />
                      </div>
                      <span className="text-[11px] text-slate-400">@{member.username}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(member)} className="p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-all"><Pencil size={13} /></button>
                      <button onClick={() => setDelTarget(member)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-lg font-medium ${rc.bg} ${rc.text} border ${rc.border}`}>{rc.label}</span>
                    <span className="inline-flex px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 font-medium">{member.department}</span>
                  </div>
                  {member.email && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail size={12} /> <span>{member.email}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone size={12} /> <span>{member.phone}</span>
                    </div>
                  )}
                  {member.joinDate && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar size={12} /> <span>入职 {member.joinDate}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && (
        <div className="space-y-2">
          {filtered.map(member => {
            const rc = roleConfig[member.role];
            const sc = statusConfig[member.status];
            return (
              <div key={member.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-slate-200/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-white shadow-md shadow-violet-500/20 relative">
                      {member.avatar}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${sc.dot} ring-2 ring-white`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold text-slate-800">{member.name}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-lg font-medium ${rc.bg} ${rc.text} border ${rc.border}`}>{rc.label}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 font-medium">{member.department}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                        {member.email && <span className="flex items-center gap-1"><Mail size={11} />{member.email}</span>}
                        {member.phone && <span className="flex items-center gap-1"><Phone size={11} />{member.phone}</span>}
                        {member.joinDate && <span className="flex items-center gap-1"><Calendar size={11} />入职 {member.joinDate}</span>}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(member)} className="p-2 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-all"><Pencil size={14} /></button>
                      <button onClick={() => setDelTarget(member)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-sm text-slate-400">
          {search || filterDept !== 'all' || filterRole !== 'all'
            ? '没有找到匹配的成员'
            : '暂无团队成员'}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>{editing ? '编辑成员' : '添加成员'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-500">姓名 <span className="text-rose-500">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="成员姓名" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">用户名 <span className="text-rose-500">*</span></Label>
                <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="登录用户名" className="mt-1.5" disabled={!!editing} />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500">
                密码 {editing ? <span className="text-slate-400 font-normal">（留空则不修改）</span> : <span className="text-rose-500">*</span>}
              </Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editing ? '留空则保持原密码' : '登录密码'} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-500">角色</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as User['role'] }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理员</SelectItem>
                    <SelectItem value="viewer">查阅者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">部门</Label>
                <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="选择部门" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-500">邮箱</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@team.com" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">电话</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="138-xxxx-xxxx" className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-500">入职日期</Label>
                <Input type="date" value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500">状态</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as User['status'] }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">在职</SelectItem>
                    <SelectItem value="inactive">离职</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
          <p className="text-sm text-slate-600 py-4">确定要删除成员「{delTarget?.name}」吗？此操作不可撤销。</p>
          <DialogFooter>
            <button onClick={() => setDelTarget(null)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-medium">取消</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-lg hover:shadow-rose-500/25 active:scale-[0.98] transition-all font-medium">删除</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
