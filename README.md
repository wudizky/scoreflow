# ScoreFlow

AI 跨乐器乐谱转写工具 — 上传音频，自动转录为乐谱，自由转换到其他乐器。

**只需三步：** `git clone` → `npm run install:all` → `npm run dev`

---

## 界面预览

```
┌─────────────────────────────────────────────────────┐
│  ● ● ● ● ●                                         │
│  上传 → 转写 → 查看 → 转换 → 对比 → 导出            │
│                                                     │
│  🎹 钢琴    🎸 吉他    🎻 小提琴    🪕 尤克里里    │
│  🎼 竖琴    🏯 古筝    📯 唢呐                      │
└─────────────────────────────────────────────────────┘
```

---

## 快速开始

### 环境要求

| 软件 | 版本要求 | 下载 |
|------|---------|------|
| Python | >= 3.10（推荐 3.12） | https://python.org |
| Node.js | >= 18（推荐 20+） | https://nodejs.org |

安装完成后，打开终端验证：

```bash
python --version
# Python 3.12.x 或更高

node --version
# v20.x.x 或更高
```

### 1. 克隆项目

```bash
git clone https://github.com/wudizky/scoreflow.git
cd scoreflow
```

> 没有 Git？先装 https://git-scm.com/downloads

### 2. 一键安装全部依赖

```bash
npm run install:all
```

这个命令会自动：
1. 安装 Python 后端依赖（音频处理 + AI 模型）
2. 安装 Node.js 前端依赖

> 如果 pip 安装缓慢，可以换国内镜像：
> ```bash
> pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
> ```

### 3. 启动

```bash
npm run dev
```

启动后终端会显示：
- ✅ **前端**：http://localhost:3000 — 浏览器打开，网页界面
- ✅ **后端**：http://localhost:8000 — API 服务（一般不需要手动访问）

### 4. 使用

1. 浏览器打开 http://localhost:3000
2. 上传一个 MP3 或 WAV 文件
3. 等待 AI 自动转录 → 查看五线谱 → 试听 → 转换乐器 → 导出

---

## 🐳 Docker 部署（云服务器）

将 ScoreFlow 部署到自己的云服务器，随时随地使用。

### 服务器要求

| 资源 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核+ |
| 内存 | 4 GB | 8 GB+ |
| 磁盘 | 20 GB | 40 GB+（ML 模型约 3GB） |
| 系统 | Ubuntu 20.04+ / CentOS 8+ / Alibaba Linux |
| 软件 | Docker + Docker Compose 插件 |

### 一键部署

```bash
# 1. SSH 登录服务器
ssh root@你的服务器IP

# 2. 下载部署脚本
wget https://raw.githubusercontent.com/wudizky/scoreflow/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

脚本会自动：安装 Docker → 克隆项目 → 构建镜像 → 启动服务。

### 手动部署

```bash
# 1. 安装 Docker（如已安装可跳过）
curl -fsSL https://get.docker.com | bash

# 2. 克隆项目
git clone https://github.com/wudizky/scoreflow.git
cd scoreflow

# 3. 构建并启动
sudo docker compose build
sudo docker compose up -d

# 4. 查看日志
sudo docker compose logs -f
```

### 服务端口

| 服务 | 容器内端口 | 宿主机端口 | 说明 |
|------|-----------|-----------|------|
| Nginx | 80 | 80 | 统一入口（反向代理） |
| Backend | 8000 | — | FastAPI（不对外暴露） |
| Frontend | 3000 | — | Next.js（不对外暴露） |

### 常用管理命令

```bash
sudo docker compose restart    # 重启所有服务
sudo docker compose down       # 停止服务
sudo docker compose up -d      # 后台启动
sudo docker compose logs -f    # 查看日志（Ctrl+C 退出）
sudo docker compose ps         # 查看运行状态
```

### 更新项目

```bash
cd ~/scoreflow
git pull
sudo docker compose build --no-cache
sudo docker compose up -d
```

### 注意事项

- **首次转录较慢**：ML 模型首次加载时会自动下载（约 2-3GB），之后缓存到 Docker volume 持久保存
- **音频上传限制**：默认 50MB，可在 `nginx.conf` 中调整 `client_max_body_size`
- **GPU 加速**：如有 NVIDIA GPU，在 `docker-compose.yml` 中取消 GPU 相关注释
- **HTTPS**：建议在前面加一层 Nginx/Caddy 反代并配置 SSL 证书

---

## 技术原理（四步管线）

ScoreFlow 的技术路径分为四个关键步骤：

```
🎵 输入音频
    │
    ▼
① Demucs 主旋律分离
    │  从混合音频中精准剥离主旋律
    │  （支持钢琴/吉他/人声/弦乐分离）
    ▼
② CREPE + Basic Pitch 音高识别
    │  将音频转换为精确的 MIDI 音符数据
    │  （音高 + 时长 + 力度 + 置信度）
    ▼
③ 智能乐器转换核心引擎
    │  根据目标乐器物理特性自适应移调
    │  （7 种乐器预设规则 + 音域兼容检测）
    ▼
④ AI 多声部编排（开发中）
    │  智能声部分配，确保重奏和谐
    ▼
🎶 输出：五线谱 / MIDI / MusicXML
```

---

## 支持乐器

| 乐器 | 音域 | 难度 | 类型 |
|------|------|------|------|
| 钢琴 | A0–C8 | 参考基准 | 键盘 |
| 吉他 | E2–C6 | 简单 | 弦乐 |
| 尤克里里 | C4–C7 | 简单 | 弦乐 |
| 小提琴 | G3–G7 | 中等 | 弦乐 |
| 竖琴 | C1–G7 | 中等 | 拨弦 |
| 古筝 | C4–A7 | 困难 | 拨弦 |
| 唢呐 | A#3–C7 | 困难 | 管乐 |

---

## 项目结构

```
scoreflow/
├── engine/                     # 核心业务逻辑（Python）
│   ├── instruments/            # 7 种乐器定义
│   ├── rules/                  # 转换规则
│   └── converters/             # MIDI / MusicXML 工具
├── backend/                    # FastAPI 后端
│   └── app/
│       ├── core/               # AI 引擎 + 音频处理
│       └── api.py              # API 路由
├── web/                        # Next.js 前端
│   ├── components/
│   │   ├── steps/              # 6 步工作流
│   │   └── ui/                 # 通用组件
│   ├── lib/                    # 核心工具
│   └── pages/                  # 页面
├── Dockerfile.backend          # 后端 Docker 镜像
├── Dockerfile.frontend         # 前端 Docker 镜像
├── docker-compose.yml          # Docker 编排
├── nginx.conf                  # Nginx 反向代理配置
├── deploy.sh                   # 服务器一键部署脚本
├── start.bat                   # Windows 一键启动
└── package.json                # 根配置
```

---

## 常见问题

### Q: 上传 MP3 后只显示 C 大调音阶？
A: 这是**演示模式**。未安装 AI 模型时会生成假数据。运行 `pip install basic-pitch` 后重启即可启用真实转录。

### Q: 装依赖时提示错误？
- Python 报错：确保 Python 版本 >= 3.10
- 前端报错：删除 `web/node_modules` 和 `web/package-lock.json`，重新 `npm install`

### Q: 能导出 PDF 吗？
A: 需要安装 LilyPond。安装后 PDF 导出自动可用。

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/instruments` | 获取乐器列表 |
| POST | `/api/v1/transcribe` | 上传音频 → 转写为乐谱 |
| POST | `/api/v1/convert` | 乐器间音符转换 |
| POST | `/api/v1/convert-midi` | MIDI 文件 → 目标乐器 |
| POST | `/api/v1/audio-to-converted` | 音频 → 转写 → 转换一步完成 |

---

## 技术栈

- **引擎**：Python（乐器定义 / 转换规则 / MIDI 工具）
- **后端**：FastAPI + Uvicorn
- **前端**：Next.js 14 + React 18 + TypeScript
- **乐谱渲染**：VexFlow 5
- **音频回放**：Web Audio API
- **动效**：framer-motion
- **AI 模型**：Basic Pitch (Spotify) / CREPE / Demucs (Meta) / librosa
