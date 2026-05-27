# ScoreFlow

AI 跨乐器乐谱转写工具 — 上传音频，自动转录为乐谱，自由转换到其他乐器。

## 功能预览

- **音频转录**：上传 MP3/WAV → AI 识别音符 → 生成五线谱 + MIDI
- **乐器转换**：7 种乐器互转（钢琴 → 古筝、吉他 → 尤克里里等），自动移调适配音域
- **乐谱渲染**：VexFlow 五线谱绘制（谱号 / 调号 / 升降号）
- **MIDI 回放**：Web Audio 合成播放（4 种波形），支持调速
- **并排对比**：原谱 vs 转换谱对比，各自独立播放
- **格式导出**：MIDI / MusicXML

支持乐器：钢琴 · 吉他 · 尤克里里 · 小提琴 · 竖琴 · 古筝 · 唢呐

---

## 快速开始（本地部署）

### 环境要求

- **Node.js** >= 18（推荐 20+）
- **Python** >= 3.10
- **npm** >= 9

### 1. 克隆

```bash
git clone https://github.com/wudizky/scoreflow.git
cd scoreflow
```

### 2. 一键安装

```bash
# 安装 Python 依赖 + Node.js 依赖
npm run install:all
```

或手动分步安装：

```bash
# 后端
cd backend
pip install -r requirements.txt
cd ..

# 前端
cd web
npm install
cd ..
```

### 3. 启动

```bash
npm run dev
```

前后端同时启动：
- 前端：http://localhost:3000
- 后端：http://localhost:8000

> 第一次打开页面后，上传任意音频文件即可体验。未安装 ML 库时会自动使用演示模式（生成 C 大调音阶）。

---

## 启用真实 AI 转录（可选）

默认使用演示模式。如需真实音频转录，安装 ML 依赖：

```bash
pip install basic-pitch librosa crepe torch
```

安装完成后重启后端，上传音频即可自动调用 AI 模型进行音符识别。

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/instruments` | 获取支持乐器列表 |
| GET | `/api/v1/conversion-pairs` | 获取转换对及难度 |
| POST | `/api/v1/transcribe` | 上传音频 → 转写为乐谱 |
| POST | `/api/v1/convert` | 乐器间音符转换 |
| POST | `/api/v1/convert-midi` | MIDI 文件 → 目标乐器 |
| POST | `/api/v1/audio-to-converted` | 端到端：音频 → 转写 → 转换 |

---

## 项目结构

```
scoreflow/
├── engine/                  # 核心业务逻辑（Python）
│   ├── instruments/         # 7 种乐器定义（音域、调弦）
│   ├── rules/               # 转换规则（预设映射、移调）
│   └── converters/          # MIDI / MusicXML 工具
├── backend/                 # FastAPI 后端
│   └── app/
│       ├── core/            # AMT 引擎、音频分离
│       └── api.py           # REST API 路由
├── web/                     # Next.js 前端
│   ├── components/          # React 组件
│   │   ├── steps/           # 6 步工作流组件
│   │   └── ui/              # 基础 UI 组件
│   ├── lib/                 # 核心工具（播放器、渲染引擎、动画）
│   ├── pages/               # 页面路由
│   └── styles/              # 全局样式
└── package.json             # 根配置（一键启动脚本）
```

---

## 技术栈

- **引擎**：Python — 乐器定义、转换规则、MIDI 工具
- **后端**：FastAPI + Uvicorn
- **前端**：Next.js 14 + React 18 + TypeScript
- **乐谱**：VexFlow 5（五线谱渲染）
- **音频**：Web Audio API（MIDI 回放）
- **动效**：framer-motion
- **ML**（可选）：basic-pitch + librosa + demucs + torch

---

## License

MIT
