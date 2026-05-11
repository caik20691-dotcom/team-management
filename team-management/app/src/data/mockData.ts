import type { SOP, Policy, Task, SyncItem, BusinessRule, ChecklistItem, TeamMember } from '../types';

export const teamMembers: TeamMember[] = [
  { id: '1', name: '张明', role: '项目经理', avatar: 'ZM' },
  { id: '2', name: '李婷', role: '前端开发', avatar: 'LT' },
  { id: '3', name: '王强', role: '后端开发', avatar: 'WQ' },
  { id: '4', name: '赵雪', role: 'UI设计师', avatar: 'ZX' },
  { id: '5', name: '陈磊', role: '测试工程师', avatar: 'CL' },
];

export const sops: SOP[] = [
  {
    id: 'sop-1',
    title: '新成员入职流程',
    category: '人事流程',
    owner: '张明',
    status: 'active',
    version: 'v2.1',
    updatedAt: '2026-04-15',
    content: '1. 准备工位和设备\n2. 发送欢迎邮件\n3. 安排入职培训\n4. 分配导师\n5. 完成入职检查清单',
  },
  {
    id: 'sop-2',
    title: '代码审查流程',
    category: '开发规范',
    owner: '王强',
    status: 'active',
    version: 'v1.5',
    updatedAt: '2026-03-20',
    content: '1. 创建PR\n2. 至少一名审核人批准\n3. 通过CI/CD检查\n4. 解决所有评论\n5. 合并到主分支',
  },
  {
    id: 'sop-3',
    title: '客户支持响应流程',
    category: '客户服务',
    owner: '李婷',
    status: 'draft',
    version: 'v0.8',
    updatedAt: '2026-04-28',
    content: '1. 接收客户工单\n2. 分类优先级\n3. 24小时内首次响应\n4. 解决问题或升级\n5. 后续跟进',
  },
  {
    id: 'sop-4',
    title: '发布上线流程',
    category: '运维规范',
    owner: '王强',
    status: 'active',
    version: 'v3.0',
    updatedAt: '2026-02-10',
    content: '1. 代码冻结\n2. 预发布环境验证\n3. 备份当前版本\n4. 执行上线\n5. 线上验证\n6. 监控告警检查',
  },
];

export const policies: Policy[] = [
  {
    id: 'pol-1',
    title: '远程办公管理制度',
    category: '行政管理',
    department: '人力资源部',
    effectiveDate: '2026-01-01',
    status: 'active',
    summary: '规范远程办公的申请、执行和考核标准，保障远程办公效率与团队协作质量。',
  },
  {
    id: 'pol-2',
    title: '信息安全管理办法',
    category: '信息安全',
    department: '技术部',
    effectiveDate: '2026-02-01',
    status: 'active',
    summary: '明确信息安全管理职责，规范信息处理行为，防止信息泄露、丢失和损坏。',
  },
  {
    id: 'pol-3',
    title: '代码提交规范',
    category: '开发规范',
    department: '技术部',
    effectiveDate: '2025-11-01',
    status: 'active',
    summary: '统一代码提交信息格式，规范分支管理策略，提高代码协作效率。',
  },
  {
    id: 'pol-4',
    title: '报销管理制度',
    category: '财务管理',
    department: '财务部',
    effectiveDate: '2025-06-01',
    status: 'expired',
    summary: '规范费用报销流程，明确报销标准和审批权限。',
  },
];

export const tasks: Task[] = [
  { id: 'task-1', title: '完成用户管理模块开发', assignee: '李婷', priority: 'high', status: 'in_progress', dueDate: '2026-05-10', tags: ['前端', '用户模块'] },
  { id: 'task-2', title: 'API接口压力测试', assignee: '王强', priority: 'medium', status: 'todo', dueDate: '2026-05-15', tags: ['后端', '测试'] },
  { id: 'task-3', title: '设计系统V3改版', assignee: '赵雪', priority: 'high', status: 'review', dueDate: '2026-05-08', tags: ['设计', 'V3'] },
  { id: 'task-4', title: 'Q2测试用例编写', assignee: '陈磊', priority: 'medium', status: 'todo', dueDate: '2026-05-20', tags: ['测试'] },
  { id: 'task-5', title: '项目里程碑汇报材料', assignee: '张明', priority: 'low', status: 'done', dueDate: '2026-04-30', tags: ['管理', '汇报'] },
  { id: 'task-6', title: '修复登录页面兼容性问题', assignee: '李婷', priority: 'high', status: 'in_progress', dueDate: '2026-05-05', tags: ['前端', 'Bug'] },
];

export const syncItems: SyncItem[] = [
  { id: 'sync-1', title: '本周五产品评审会议通知', content: '本周五（5月8日）下午2点，在三楼会议室进行产品评审，请各模块负责人准备好演示材料。', author: '张明', target: '全员', status: 'sent', createdAt: '2026-05-03' },
  { id: 'sync-2', title: '新版本发布计划更新', content: 'V2.8版本发布时间调整为5月15日，请各开发同学注意调整任务排期。', author: '王强', target: '开发团队', status: 'read', createdAt: '2026-05-02' },
  { id: 'sync-3', title: '设计资源库迁移通知', content: '设计稿已从Figma迁移至MasterGo，请各位设计师更新链接书签。', author: '赵雪', target: '设计团队', status: 'pending', createdAt: '2026-05-03' },
  { id: 'sync-4', title: '五一假期后工作安排', content: '假期后第一天（5月4日）上午10点全体站会，请准时参加。', author: '张明', target: '全员', status: 'sent', createdAt: '2026-05-01' },
];

export const businessRules: BusinessRule[] = [
  {
    id: 'rule-1',
    name: '请假审批规则',
    category: '人事管理',
    description: '根据请假天数自动路由到不同审批人',
    condition: '请假天数 ≤ 2天',
    action: '直属主管审批',
    status: 'active',
    updatedAt: '2026-03-01',
  },
  {
    id: 'rule-2',
    name: '请假审批规则',
    category: '人事管理',
    description: '根据请假天数自动路由到不同审批人',
    condition: '请假天数 3-5天',
    action: '部门经理审批',
    status: 'active',
    updatedAt: '2026-03-01',
  },
  {
    id: 'rule-3',
    name: '费用报销规则',
    category: '财务管理',
    description: '不同金额区间的报销审批流程',
    condition: '报销金额 ≤ ¥500',
    action: '自动通过（需票据）',
    status: 'active',
    updatedAt: '2026-02-15',
  },
  {
    id: 'rule-4',
    name: '代码合并规则',
    category: '开发规范',
    description: '主分支合并权限控制',
    condition: '合并到main分支',
    action: '需要至少2名审核人批准 + CI通过',
    status: 'active',
    updatedAt: '2026-04-01',
  },
  {
    id: 'rule-5',
    name: '客户等级规则',
    category: '客户管理',
    description: '根据年消费额自动划定客户等级',
    condition: '年消费额 ≥ ¥500,000',
    action: '标记为VIP客户，分配专属客户经理',
    status: 'inactive',
    updatedAt: '2026-01-20',
  },
];

export const checklistItems: ChecklistItem[] = [
  { id: 'chk-1', title: '每日站会', description: '参加每日15分钟站会，同步工作进展和阻碍', responsible: '全员', frequency: 'daily', status: 'completed', lastDone: '2026-05-03' },
  { id: 'chk-2', title: '周报提交', description: '每周五下班前提交本周工作总结和下周计划', responsible: '全员', frequency: 'weekly', status: 'pending', lastDone: '2026-04-25' },
  { id: 'chk-3', title: '代码备份检查', description: '检查代码仓库备份状态，确保数据安全', responsible: '王强', frequency: 'weekly', status: 'completed', lastDone: '2026-05-02' },
  { id: 'chk-4', title: '上月绩效考核', description: '完成上月员工绩效考核评分', responsible: '张明', frequency: 'monthly', status: 'overdue', lastDone: '2026-03-31' },
  { id: 'chk-5', title: '设计评审', description: '对新设计方案进行团队评审', responsible: '赵雪', frequency: 'on_demand', status: 'pending', lastDone: null },
  { id: 'chk-6', title: '安全漏洞扫描', description: '对生产环境进行安全漏洞扫描并生成报告', responsible: '王强', frequency: 'monthly', status: 'completed', lastDone: '2026-04-28' },
];
