import {
  LayoutDashboard,
  Users,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  FolderOpen,
  BookOpen,
  Megaphone,
  UserCircle,
  CalendarDays,
  BarChart3,
  FolderKanban,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { User } from '../api/client';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: '总览',
    items: [
      { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
      { id: 'stats', label: '数据统计', icon: BarChart3 },
    ],
  },
  {
    label: '工作',
    items: [
      { id: 'workspace', label: '个人工作台', icon: UserCircle },
      { id: 'tasks', label: '任务管理', icon: CheckSquare },
      { id: 'projects', label: '项目管理', icon: FolderKanban },
      { id: 'calendar', label: '团队日历', icon: CalendarDays },
    ],
  },
  {
    label: '团队',
    items: [
      { id: 'members', label: '团队成员', icon: Users },
    ],
  },
  {
    label: '文档中心',
    items: [
      { id: 'files', label: '文件管理', icon: FolderOpen },
      { id: 'knowledge', label: '知识库', icon: BookOpen },
      { id: 'standards', label: '规范管理', icon: FileText },
      { id: 'announcements', label: '消息中心', icon: Megaphone },
    ],
  },
  {
    label: '管理',
    items: [
      { id: 'operations', label: '运营管理', icon: ShieldCheck },
    ],
  },
];

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  function handleLogout() {
    if (window.confirm('确定要退出登录吗？')) {
      onLogout();
    }
  }

  return (
    <div
      className={`flex flex-col h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 transition-all duration-300 relative ${
        collapsed ? 'w-[68px]' : 'w-[232px]'
      }`}
    >
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-violet-500/10 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-white/[0.06] relative z-10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white/90 truncate">
              团队管理系统
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Sparkles size={14} className="text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-all"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 relative z-10">
        {menuGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-5' : ''}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider px-3 mb-2">
                {group.label}
              </p>
            )}
            {collapsed && gi > 0 && (
              <div className="border-t border-white/[0.06] mx-2 mb-2" />
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 mb-0.5 relative group ${
                    isActive
                      ? 'bg-white/[0.1] text-white font-medium shadow-lg shadow-black/10'
                      : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-violet-400 to-blue-400" />
                  )}
                  <Icon
                    size={18}
                    className={`transition-colors ${isActive ? 'text-violet-400' : 'text-white/40 group-hover:text-white/60'}`}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/[0.06] space-y-1 relative z-10">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white shadow-md shadow-violet-500/20">
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-white/80 block truncate">{user.name}</span>
              <span className="text-[10px] text-white/30">{user.role === 'admin' ? '管理员' : '查阅者'}</span>
            </div>
          </div>
        )}
        {collapsed && user && (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white shadow-md shadow-violet-500/20">
              {user.avatar}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          title={collapsed ? '退出登录' : undefined}
        >
          <LogOut size={16} />
          {!collapsed && <span>退出登录</span>}
        </button>
      </div>
    </div>
  );
}
