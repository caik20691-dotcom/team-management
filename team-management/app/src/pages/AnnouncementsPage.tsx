import { useState } from 'react';
import AnnouncementsPageInner from './AnnouncementsPageInner';
import SyncPage from './SyncPage';

const tabs = [
  { id: 'announcements', label: '公告通知' },
  { id: 'sync', label: '信息同步' },
] as const;

interface Props { isAdmin: boolean; }

export default function AnnouncementsPage({ isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<string>('announcements');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">消息中心</h1>
        <p className="text-sm text-slate-400 mt-1">团队公告发布与信息同步</p>
      </div>
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-sm px-4 py-1.5 rounded-md transition-colors ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'announcements' && <AnnouncementsPageInner isAdmin={isAdmin} />}
      {activeTab === 'sync' && <SyncPage isAdmin={isAdmin} />}
    </div>
  );
}
