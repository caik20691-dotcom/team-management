import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const ok = await login(username, password);
      if (!ok) {
        setError('用户名或密码错误');
        setPassword('');
      }
    } catch (e) {
      setError('登录失败，请稍后重试');
      setPassword('');
      setLoading(false);
      return;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-gradient-to-br from-slate-900 via-violet-950 to-blue-950 overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center shadow-xl shadow-violet-500/30">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">团队管理系统</span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4">
            让团队协作<br />
            <span className="gradient-text">更高效</span>
          </h1>
          <p className="text-base text-white/40 max-w-md leading-relaxed">
            一站式管理团队的 SOP、任务、制度和规则，让每个成员都清楚自己的工作方向。
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {['SOP 管理', '任务分配', '制度文档', '信息同步', '业务规则'].map(tag => (
              <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-medium text-white/60 bg-white/[0.06] border border-white/[0.08]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50/30 p-6">
        {/* Mobile logo */}
        <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-base font-bold text-slate-800">团队管理系统</span>
        </div>

        <div className="w-full max-w-md relative">
          {/* Card glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/10 via-transparent to-blue-500/10 rounded-3xl blur-xl" />

          <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-900/[0.06] border border-white/60 p-8 sm:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">欢迎回来</h2>
              <p className="text-sm text-slate-400 mt-1.5">登录你的账号，开始新的一天</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">用户名</label>
                <input
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50/80 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50/80 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all placeholder:text-slate-300"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full gradient-primary text-white text-sm font-medium py-2.5 rounded-xl hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>登 录 <ArrowRight size={15} /></>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 text-center mb-2">演示账号</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="px-3 py-2 bg-slate-50/80 rounded-lg text-[11px] text-slate-500 text-center">
                  <span className="font-medium text-slate-700">管理员</span><br />
                  admin / admin123
                </div>
                <div className="px-3 py-2 bg-slate-50/80 rounded-lg text-[11px] text-slate-500 text-center">
                  <span className="font-medium text-slate-700">查阅者</span><br />
                  viewer / view123
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
