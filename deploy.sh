#!/bin/bash
# ===============================================
# ScoreFlow - 云服务器一键部署脚本
# 适用: Alibaba Cloud Linux / Ubuntu / CentOS
# 用法: chmod +x deploy.sh && ./deploy.sh
# ===============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║   🎵 ScoreFlow 云端部署脚本         ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# ---- 1. 检测系统 ----
echo -e "${YELLOW}[1/5] 检测系统环境...${NC}"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}无法检测操作系统，请手动安装 Docker${NC}"
    exit 1
fi
echo "  系统: $OS"

# ---- 2. 安装 Docker ----
echo -e "${YELLOW}[2/5] 检查 Docker 安装...${NC}"
if ! command -v docker &> /dev/null; then
    echo "  Docker 未安装，正在安装..."

    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl
        sudo install -m 0755 -d /etc/apt/keyrings
        sudo curl -fsSL https://download.docker.com/linux/$OS/gpg -o /etc/apt/keyrings/docker.asc
        sudo chmod a+r /etc/apt/keyrings/docker.asc
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "rocky" ] || [ "$OS" = "alibaba" ] || [ "$OS" = "alinux" ]; then
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        sudo systemctl start docker
        sudo systemctl enable docker
    else
        echo -e "${RED}不支持的系统: $OS，请手动安装 Docker${NC}"
        exit 1
    fi

    echo -e "${GREEN}  Docker 安装完成 ✓${NC}"
else
    echo "  Docker 已安装: $(docker --version)"
fi

# 确保 Docker 服务运行
if ! docker info &> /dev/null; then
    sudo systemctl start docker
fi

# ---- 3. 检查 Docker Compose ----
if ! docker compose version &> /dev/null; then
    echo -e "${RED}需要 Docker Compose 插件，请手动安装${NC}"
    exit 1
fi
echo "  Docker Compose: $(docker compose version)"

# ---- 4. 克隆项目 ----
echo -e "${YELLOW}[3/5] 准备项目代码...${NC}"

PROJECT_DIR="$HOME/scoreflow"
REPO_URL="https://github.com/wudizky/scoreflow.git"

if [ -d "$PROJECT_DIR/.git" ]; then
    echo "  项目已存在，拉取最新代码..."
    cd "$PROJECT_DIR"
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null
else
    if [ -d "$PROJECT_DIR" ]; then
        echo "  备份旧目录..."
        mv "$PROJECT_DIR" "${PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    fi
    echo "  克隆项目..."
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# ---- 5. 构建 & 启动 ----
echo -e "${YELLOW}[4/5] 构建 Docker 镜像...${NC}"
echo "  这一步会下载 Python 依赖（TensorFlow/PyTorch 较大），"
echo "  可能需要 10-20 分钟（视网速和 CPU 性能而定）..."
echo ""

cd "$PROJECT_DIR"
sudo docker compose build --no-cache

echo ""
echo -e "${YELLOW}[5/5] 启动服务...${NC}"
sudo docker compose up -d

echo ""
echo -e "${GREEN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║   ✅ ScoreFlow 部署成功！           ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "  🌐 访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
echo ""
echo "  常用命令:"
echo "    cd $PROJECT_DIR"
echo "    sudo docker compose logs -f       # 查看日志"
echo "    sudo docker compose restart       # 重启服务"
echo "    sudo docker compose down          # 停止服务"
echo "    sudo docker compose up -d         # 启动服务"
echo "    sudo docker compose pull          # 拉取更新"
echo ""
