#!/bin/bash
# ==========================================
# 团队管理系统 — 服务器端一键安装脚本
# 用法: echo "PASSWORD" | sudo -S bash setup.sh
# ==========================================

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_SUPPRESS=1

set -e

echo "=========================================="
echo "  Team Management System - Server Setup"
echo "=========================================="

# ==========================================
# Step 1: Install Node.js 20.x
# ==========================================
echo ""
echo "STEP 1/6: Node.js ..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null
  sudo apt-get install -y nodejs 2>/dev/null
fi
echo "Node: $(node --version 2>/dev/null || echo N/A)"
echo "NPM: $(npm --version 2>/dev/null || echo N/A)"

# ==========================================
# Step 2: Install Nginx + PM2
# ==========================================
echo ""
echo "STEP 2/6: Nginx + PM2 ..."
sudo apt-get install -y nginx 2>/dev/null
sudo npm install -g pm2 2>/dev/null
echo "Nginx + PM2 installed"

# ==========================================
# Step 3: Deploy frontend
# ==========================================
echo ""
echo "STEP 3/6: Frontend ..."
sudo mkdir -p /var/www/team-app
if [ -f /tmp/dist.tar.gz ]; then
  cd /tmp && sudo tar -xzf dist.tar.gz -C /var/www/team-app --strip-components=1
  echo "Frontend extracted"
  sudo ls /var/www/team-app/ | head -5
else
  echo "WARNING: /tmp/dist.tar.gz not found"
fi

# ==========================================
# Step 4: Configure Nginx
# ==========================================
echo ""
echo "STEP 4/6: Nginx config ..."
sudo cp /tmp/nginx-site.conf /etc/nginx/sites-available/team-app 2>/dev/null || true
sudo ln -sf /etc/nginx/sites-available/team-app /etc/nginx/sites-enabled/team-app 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
if sudo nginx -t 2>/dev/null; then
  sudo systemctl restart nginx 2>/dev/null || true
  sudo systemctl enable nginx 2>/dev/null || true
  echo "Nginx restarted"
else
  echo "Nginx config test failed"
fi

# ==========================================
# Step 5: Deploy backend
# ==========================================
echo ""
echo "STEP 5/6: Backend ..."
sudo mkdir -p /opt/team-app-server
if [ -d /tmp/server ]; then
  sudo cp -r /tmp/server/* /opt/team-app-server/ 2>/dev/null || true
  sudo chown -R $USER:$USER /opt/team-app-server 2>/dev/null || true
  cd /opt/team-app-server
  npm install 2>/dev/null || true
  echo "Backend deps installed"
else
  echo "WARNING: /tmp/server not found"
fi

# Start backend with PM2
cd /opt/team-app-server
pm2 delete team-api 2>/dev/null || true
pm2 start "npx json-server --watch db.json --port 3001 --host 127.0.0.1" --name team-api 2>/dev/null
pm2 save 2>/dev/null || true
pm2 startup 2>/dev/null || true
echo "Backend started"

# ==========================================
# Step 6: Verify
# ==========================================
echo ""
echo "STEP 6/6: Verify ..."
sleep 3
curl -s "<http://127.0.0.1:3001/users>" 2>/dev/null | head -c 100 || echo "Backend not responding"
echo ""
curl -s "<http://127.0.0.1>" 2>/dev/null | head -c 100 || echo "Nginx not responding"
echo ""

echo ""
echo "=========================================="
echo "  DONE!"
echo "=========================================="
echo ""
echo "Frontend: <http://1.12.56.124>"
echo "Backend:  <http://1.12.56.124:3001>"
echo ""
echo "Commands: pm2 logs team-api / pm2 restart team-api / pm2 status"
echo ""
