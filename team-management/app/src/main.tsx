import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'

try {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('找不到 #root 元素');
  }

  const root = createRoot(container);

  root.render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>,
  );

  console.log('✅ React app mounted successfully');
} catch (err) {
  console.error('❌ React mount failed:', err);
  const container = document.getElementById('root');
  if (container) {
    container.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f87171;font-family:monospace;padding:20px;">
        <div style="max-width:600px;width:100%">
          <h2 style="color:#fbbf24;margin-bottom:12px;">🚨 启动错误</h2>
          <pre style="background:#1e293b;padding:16px;border-radius:8px;overflow:auto;font-size:13px;line-height:1.5;">${err instanceof Error ? err.stack || err.message : String(err)}</pre>
          <button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;">刷新页面</button>
        </div>
      </div>
    `;
  }
}
