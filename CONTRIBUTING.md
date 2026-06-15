# 🎵 ScoreFlow 开发者协作手册

> AI 跨乐器乐谱转写 · GitHub: `wudizky/scoreflow` · 2026年6月15日

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [代码结构阅读指南](#3-代码结构阅读指南)
4. [环境搭建](#4-环境搭建)
5. [日常开发流程](#5-日常开发流程)
6. [后端核心模块详解](#6-后端核心模块详解)
7. [前端开发指南](#7-前端开发指南)
8. [常见修改场景](#8-常见修改场景)

---

## 1. 项目概述

ScoreFlow 是一个 AI 驱动的跨乐器乐谱转写工具。用户上传音频文件 → AI 识别音符 → 自动生成该乐器对应的乐谱（吉他出六线谱，钢琴出大谱表，其他出五线谱）→ 可导出为 PDF/MIDI。

**四步管线**：🔊 分离 → 🎯 识别 → 🔄 转换 → 📜 编排

**已部署**：阿里云 ECS `118.178.232.14`，Docker Compose 托管。

---

## 2. 技术架构

```
浏览器 (用户)
    ↓
Nginx :80 (反向代理)
    ├── /*        → static/ 目录 (纯 HTML/CSS/JS)
    └── /api/*    → Backend :8000 (FastAPI + ML 模型)
```

| 层 | 技术 | 说明 |
|---|------|------|
| 前端 | 原生 HTML + CSS + JS | `static/index.html` `script.js` `style.css`，零框架 |
| 后端 | FastAPI + Uvicorn | Python 3.12，路由在 `api.py` |
| 音频转写 | Basic Pitch (ONNX) + CREPE | 无 TensorFlow（用 ONNX 替代） |
| 乐谱渲染 | Verovio 6.2.1 | MusicXML → SVG（后端渲染，前端直显） |
| PDF 导出 | rsvg-convert | Verovio SVG → PDF |
| 音源分离 | Demucs (PyTorch) | 可选，子进程隔离防 OOM |
| 部署 | Docker Compose + ACR | 阿里云容器镜像仓库 |

---

## 3. 代码结构阅读指南

```
scoreflow/
│
├── static/                       ★ 生产前端（当前在用）
│   ├── index.html                入口页面，包含乐器选择器、上传区、按钮
│   ├── script.js                 所有前端逻辑：文件上传、API调用、乐谱展示
│   ├── style.css                 亮色主题样式
│   ├── osmd/                     OSMD 库（备选渲染，当前未使用）
│   └── verovio/                  Verovio WASM 库（备选，当前后端渲染）
│
├── backend/                      ★ 生产后端（当前在用）
│   ├── app/
│   │   ├── main.py               FastAPI 应用入口，注册路由，CORS 配置
│   │   ├── api.py                ★ 核心：所有 API 路由（转写/转换/导出）
│   │   ├── core/                 ★ ML 引擎核心
│   │   │   ├── __init__.py        TranscriptionService 管线编排器
│   │   │   ├── amt_engine.py      AMT 音频转音符（Basic Pitch + CREPE + 量化）
│   │   │   ├── audio_separator.py Demucs 音源分离封装
│   │   │   ├── musicxml_generator.py ★ MusicXML 生成（五线谱 + 六线谱TAB）
│   │   │   └── notation_renderer.py  Verovio 渲染（MusicXML → SVG / PDF）
│   │   └── uploads/              上传文件暂存目录（Docker volume）
│   ├── demo_assets/              ★ 演示模式预制 MusicXML（文件名含 Demo 触发）
│   │   └── Demo_Guitar.musicxml  卡农 C-G-Am-Em 8 小节吉他 TAB
│   ├── requirements.txt          Python 依赖列表
│   └── output/                   临时输出目录
│
├── engine/                       ★ 乐器规则引擎（自定义）
│   ├── registry.py               乐器注册表（7 种乐器）
│   ├── converter.py              跨乐器转换器
│   ├── instruments/              每种乐器的定义（id / 音域 / 调弦）
│   │   ├── base.py               基类 Instrument
│   │   ├── guitar.py             吉他 (E2-C6, 标准调弦)
│   │   ├── piano.py              钢琴 (A0-C8)
│   │   ├── violin.py             小提琴 (G3-G7)
│   │   ├── ukulele.py            尤克里里 (C4-C7)
│   │   ├── harp.py               竖琴 (C1-G7)
│   │   ├── guzheng.py            古筝 (21 弦)
│   │   └── suona.py              唢呐
│   ├── converters/
│   │   └── midi_utils.py         MIDI 文件生成工具
│   ├── notation/                 乐谱渲染引擎（后端 Python 版本）
│   │   ├── tab_generator.py      和弦检测 + TAB 品位计算
│   │   └── grand_staff.py        大谱表分割（高音/低音）
│   └── rules/                    转换规则
│       ├── base.py               基础规则类
│       └── presets.py            预设转换规则
│
├── web/                          ★ 原 Next.js 前端（已弃用，仅作参考）
│   ├── pages/                    Next.js 页面
│   ├── components/               React 组件
│   └── api.ts                    前端 API 调用（设计参考）
│
├── Dockerfile.backend            后端镜像构建文件
├── Dockerfile.frontend           前端镜像构建文件（已弃用）
├── docker-compose.prod.yml       ★ ECS 生产编排文件（最终版）
├── docker-compose.yml            本地开发编排文件
├── nginx.conf                    Nginx 配置（反向代理 + 静态文件）
├── preload_models.py             镜像构建时预加载 ML 模型
├── deploy.sh                     服务器一键部署脚本
├── start.bat                     Windows 本地一键启动
└── README.md                     项目 README
```

---

## 4. 环境搭建

### 4.1 克隆代码

```bash
git clone https://github.com/wudizky/scoreflow.git
cd scoreflow
```

### 4.2 本地开发（只改前端）

不需要装 Python/ML 依赖。改完 `static/` 下的文件后，直接 scp 到 ECS 测试：

```powershell
scp static\index.html root@118.178.232.14:scoreflow/static/
scp static\script.js root@118.178.232.14:scoreflow/static/
scp static\style.css root@118.178.232.14:scoreflow/static/
```

ECS 上重启：
```bash
docker restart scoreflow-nginx
```

### 4.3 本地开发（改后端）

需要 Python 3.12 + 安装依赖：

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
pip install verovio>=4.3.0
```

启动本地后端（无需 ML 模型测试 API 逻辑）：
```bash
uvicorn app.main:app --reload --port 8000
```

### 4.4 ECS 服务器

- **地址**：118.178.232.14
- **SSH**：`ssh root@118.178.232.14`
- **项目路径**：`~/scoreflow`
- **Docker 管理**：
  ```bash
  cd ~/scoreflow
  docker ps                                    # 看容器状态
  docker compose -f docker-compose.prod.yml ps # compose 状态
  docker logs scoreflow-backend --tail 20      # 后端日志
  docker restart scoreflow-backend             # 重启后端
  ```

---

## 5. 日常开发流程

### 5.1 修改前端 → 测试

```powershell
# 本机改完 static/ 文件后：
scp D:\scoreflow\static\index.html root@118.178.232.14:scoreflow/static/
scp D:\scoreflow\static\script.js root@118.178.232.14:scoreflow/static/
scp D:\scoreflow\static\style.css root@118.178.232.14:scoreflow/static/
```

```bash
# ECS 上：
docker restart scoreflow-nginx
```

### 5.2 修改后端 → 测试

```powershell
# 本机改完 backend/app/ 或 engine/ 文件后：
scp D:\scoreflow\backend\app\api.py root@118.178.232.14:scoreflow/backend/app/
scp D:\scoreflow\backend\app\core\musicxml_generator.py root@118.178.232.14:scoreflow/backend/app/core/
scp -r D:\scoreflow\engine root@118.178.232.14:scoreflow/
```

```bash
# ECS 上：
docker restart scoreflow-backend
```

### 5.3 重建镜像（改 Dockerfile 或 requirements 后）

```bash
# 本机（需 VPN）：
cd D:\scoreflow
docker compose build backend --no-cache
docker tag scoreflow-backend:latest crpi-es7e6vutqfirgn70.cn-hangzhou.personal.cr.aliyuncs.com/zky_personal/scoreflow:backend
docker push crpi-es7e6vutqfirgn70.cn-hangzhou.personal.cr.aliyuncs.com/zky_personal/scoreflow:backend

# ECS：
docker pull crpi-es7e6vutqfirgn70.cn-hangzhou.personal.cr.aliyuncs.com/zky_personal/scoreflow:backend
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

---

## 6. 后端核心模块详解

### 6.1 `api.py` — API 路由

整个项目的请求入口。关键路由：

| 方法 | 路径 | 作用 |
|------|------|------|
| GET | `/api/v1/instruments` | 返回 7 种乐器列表 |
| POST | `/api/v1/transcribe` | ★ 上传音频 → 返回转写结果（含 SVG） |
| POST | `/api/v1/convert` | 乐器转换（如吉他→钢琴） |
| POST | `/api/v1/convert-midi` | 导出 MIDI 文件 |
| POST | `/api/v1/export-pdf` | 导出 PDF 乐谱 |
| GET | `/health` | 健康检查 |

**Demo 拦截**（第 100-150 行）：如果上传文件名包含 `Demo_Guitar`、`demo_piano` 等关键词，后端等待 4 秒后直接返回 `demo_assets/` 中的预制完美 MusicXML，而非真实转写。用于答辩演示。

### 6.2 `musicxml_generator.py` — MusicXML 生成

核心类 `MusicXMLGenerator`，负责将 `[{midi, start, duration, velocity}, ...]` 格式的音符数据转为标准 MusicXML：

```
generate() → _group_into_measures() → _add_measure() → _add_note()
```

**关键逻辑**：
- `_group_into_measures()`：按 4/4 拍（2 秒/小节）分组 + 64 音符强分断 + gap 处理
- `_add_attributes()`：**根据乐器动态选择谱号** — 吉他/尤克里里 → TAB 谱号 + staff-details，其他 → G 高音谱号
- `_add_note()`：吉他模式时调用 `_midi_to_fret()` 计算品位指法，注入 `<technical><string><fret>` 标签
- `_midi_to_fret()`：绝对音高 → (弦号, 品位) 映射，优先 0-5 品低把位

### 6.3 `amt_engine.py` — 音频转音符引擎

`AMTEngine.transcribe(audio_path, separate_stems, instrument)`：
1. 可选：Demucs 去鼓声（`_separate_stems()`，子进程隔离防 OOM）
2. Basic Pitch ONNX 推理（onset=0.3, frame=0.15, min_note=58ms）
3. MIDI 量化（`_quantize_notes()`）：16 分音符网格对齐 + 三档噪声过滤（<40ms 时长 / <15 velocity / <0.2 置信度）

### 6.4 `notation_renderer.py` — 乐谱渲染

`render_musicxml_to_svg(musicxml, zoom)` → Verovio 渲染 SVG  
`render_musicxml_to_pdf(musicxml, output_path)` → Verovio SVG → rsvg-convert → PDF

Verovio 参数：`breaks: "auto"`, `pageWidth: 1200`, `adjustPageHeight: 1`

### 6.5 `engine/` — 乐器规则引擎

7 种乐器各有一个 `Instrument` dataclass 定义，包含 `id`, `name_zh`, `range`, `tuning`（吉他/尤克里里/小提琴有调弦），`conversion_difficulty`。

`notation/tab_generator.py` 包含和弦检测（10 种三和弦/七和弦模板）和指法优化算法。

---

## 7. 前端开发指南

### 7.1 文件说明

| 文件 | 作用 |
|------|------|
| `index.html` | DOM 结构：乐器按钮、上传区、进度条、终端动画、乐谱区、错误提示 |
| `script.js` | 全部交互逻辑 |
| `style.css` | 亮色主题（`:root` 变量控制主色调） |

### 7.2 script.js 关键函数

| 函数 | 作用 |
|------|------|
| `transcribe()` | 上传音频 → fetch API → 展示结果 |
| `displayResult(data, notes)` | 渲染 SVG + 和弦条 + 免责声明 |
| `showTerminal()/hideTerminal()` | 黑底绿字好莱坞日志动画 |
| `drawNotation(nd)` | 乐谱渲染调度（OSMD → SVG fallback） |
| `applyZoom()` | CSS transform 缩放乐谱 |
| `exportPdf()/exportMidi()` | 导出按钮逻辑 |

### 7.3 CSS 关键类名

| 类名 | 作用 |
|------|------|
| `.score-scroll` | 乐谱容器（纵向滚动） |
| `.score-render svg` | SVG 强制 `width:100%` + `height:auto` |
| `.terminal-overlay` | 黑底终端动画容器 |
| `.disclaimer-banner` | Raw AI 模式黄色警告条 |
| `.progress-bar` / `.progress-step` | 四步进度指示器 |

---

## 8. 常见修改场景

### 8.1 添加新乐器

1. 在 `engine/instruments/` 下新建 `xxx.py`，继承 `Instrument`，填写 `id`, `name_zh`, `range`, `tuning`
2. 在 `engine/instruments/__init__.py` 注册新类
3. 在 `static/index.html` 的 `.instrument-bar` 加一个按钮 `data-id="xxx"`
4. 如需要特殊谱号，在 `musicxml_generator.py` 的 `_TAB_INSTRUMENTS` 或 `_add_attributes()` 加判断

### 8.2 调优识别准确率

修改 `amt_engine.py` `_transcribe_basic_pitch()` 的参数：
- `onset_threshold`：降低 = 更敏感（更多音符但可能更多噪声）
- `frame_threshold`：降低 = 保持弱音
- `minimum_note_length`：降低 = 不丢短音

修改 `_quantize_notes()` 的过滤阈值。

### 8.3 修改乐谱样式

- Verovio 参数：改 `notation_renderer.py` 的 `tk.setOptions()`
- 前端 SVG 尺寸：改 `style.css` 的 `.score-render svg` 和 `.score-scroll`
- 和弦条样式：改 `style.css` 的 `.chord-chip`

### 8.4 添加新的音乐格式支持

在 `api.py` 的 `ALLOWED_AUDIO` 集合添加扩展名即可，解码由 librosa + ffmpeg 自动处理。

### 8.5 在容器中安装新系统包

```bash
docker exec -u root scoreflow-backend apt-get update
docker exec -u root scoreflow-backend apt-get install -y 包名
```

如需持久化，同时更新 `Dockerfile.backend`。

---

## 附录 A：ACR 镜像仓库信息

| 项目 | 值 |
|------|-----|
| Registry | `crpi-es7e6vutqfirgn70.cn-hangzhou.personal.cr.aliyuncs.com` |
| 命名空间 | `zky_personal` |
| 用户名 | `nick8258619478` |
| 密码 | Ask team lead for access |

## 附录 B：ECS 服务器信息

| 项目 | 值 |
|------|-----|
| IP | `118.178.232.14` |
| 系统 | Ubuntu 22.04, 2C4G |
| SSH | `ssh root@118.178.232.14` |
| 项目路径 | `~/scoreflow` |

---

> 最后更新：2026-06-15 · 版本 v1.0  
> 维护者：ScoreFlow 开发组
