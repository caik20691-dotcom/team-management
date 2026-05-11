import { useState } from 'react';
import { LogOut, Sparkles } from 'lucide-react';
import type { Notification } from './api/client';
import { useAuth } from './context/AuthContext';
import { useIsAdmin } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MembersPage from './pages/MembersPage';
import FilesPage from './pages/FilesPage';
import KBPage from './pages/KBPage';
import TasksPage from './pages/TasksPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import NotificationBell from './components/NotificationBell';
import MyWorkspacePage from './pages/MyWorkspacePage';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import StandardsPage from './pages/StandardsPage';
import OperationsPage from './pages/OperationsPage';
import Login from './pages/Login';

function AppInner() {
  const { user, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':  return <Dashboard setActiveTab={setActiveTab} />;
      case 'stats':      return <DashboardPage />;
      case 'workspace':  return <MyWorkspacePage />;
      case 'tasks':      return <TasksPage isAdmin={isAdmin} />;
      case 'projects':   return <ProjectsPage isAdmin={isAdmin} />;
      case 'calendar':   return <CalendarPage isAdmin={isAdmin} onNavigate={setActiveTab} />;
      case 'members':    return <MembersPage isAdmin={isAdmin} />;
      case 'files':      return <FilesPage isAdmin={isAdmin} />;
      case 'knowledge':  return <KBPage isAdmin={isAdmin} />;
      case 'standards':  return <StandardsPage isAdmin={isAdmin} />;
      case 'announcements': return <AnnouncementsPage isAdmin={isAdmin} />;
      case 'operations': return <OperationsPage isAdmin={isAdmin} />;
      default:           return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  function handleNotificationClick(notif: Notification) {
    const tabMap: Record<string, string> = {
      announcement: 'announcements',
      task: 'tasks',
      sop: 'standards',
      policy: 'standards',
    };
    const tab = tabMap[notif.targetType];
    if (tab) setActiveTab(tab);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={logout}
      />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-violet-50/20">
        <header className="h-14 bg-white/70 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm shadow-slate-900/[0.03]">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Sparkles size={14} className="text-violet-400" />
            <span className="font-medium">团队管理系统</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell onNotificationClick={handleNotificationClick} />
            <div className="flex items-center gap-2.5 pl-2">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white shadow-md shadow-violet-500/20">
                {user.avatar}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700 leading-tight">{user.name}</span>
                <span className={`text-[10px] font-medium leading-tight ${
                  isAdmin
                    ? 'text-violet-500'
                    : 'text-slate-400'
                }`}>
                  {isAdmin ? '管理员' : '查阅者'}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all"
              title="退出登录"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
