@echo off
chcp 65001 >nul
title ScoreFlow

echo ============================================
echo   ScoreFlow - AI 跨乐器乐谱转写工具
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未找到 Node.js，请先安装：https://nodejs.org
    pause
    exit /b 1
)

:: Check Python
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未找到 Python，请先安装：https://python.org
    pause
    exit /b 1
)

echo [1/3] 检查依赖...
if not exist "node_modules" (
    echo [2/3] 安装根目录依赖...
    call npm install
)

if not exist "web\node_modules" (
    echo [2/3] 安装前端依赖...
    cd web
    call npm install
    cd ..
)

if not exist "backend\.venv" (
    echo [2/3] 创建 Python 虚拟环境并安装依赖...
    cd backend
    python -m venv .venv
    call .venv\Scripts\pip install -r requirements.txt
    cd ..
)

echo [3/3] 启动服务...
echo.
echo   前端：http://localhost:3000
echo   后端：http://localhost:8000
echo.
echo   按 Ctrl+C 停止所有服务
echo ============================================
echo.

npm run dev
pause
