import { useState } from 'react';
import SOPPage from './SOPPage';
import PoliciesPage from './PoliciesPage';

const tabs = [
  { id: 'sop', label: '工作 SOP' },
  { id: 'policies', label: '制度文档' },
] as const;

interface Props { isAdmin: boolean; }

export default function StandardsPage({ isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<string>('sop');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">规范管理</h1>
        <p className="text-sm text-slate-400 mt-1">团队标准操作流程与制度文档</p>
      </div>
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-sm px-4 py-1.5 rounded-md transition-colors ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'sop' && <SOPPage isAdmin={isAdmin} />}
      {activeTab === 'policies' && <PoliciesPage isAdmin={isAdmin} />}
    </div>
  );
}
