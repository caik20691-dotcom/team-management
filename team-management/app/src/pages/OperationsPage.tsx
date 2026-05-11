import { useState } from 'react';
import RulesPage from './RulesPage';
import ChecklistPage from './ChecklistPage';

const tabs = [
  { id: 'rules', label: '业务规则' },
  { id: 'checklist', label: '工作清单' },
] as const;

interface Props { isAdmin: boolean; }

export default function OperationsPage({ isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<string>('rules');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">运营管理</h1>
        <p className="text-sm text-slate-400 mt-1">业务规则配置与定期工作事项跟踪</p>
      </div>
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-sm px-4 py-1.5 rounded-md transition-colors ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'rules' && <RulesPage isAdmin={isAdmin} />}
      {activeTab === 'checklist' && <ChecklistPage isAdmin={isAdmin} />}
    </div>
  );
}
