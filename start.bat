@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 交易看板

where python >nul 2>nul || (echo 未找到 Python，请先安装 Python 3.9+ ：https://www.python.org/downloads/ （安装时勾选 Add python.exe to PATH） & pause & exit /b)

rem 第一次运行时自动安装 pywebview（只装一次）
python -c "import webview" >nul 2>nul || (
  echo 第一次运行，正在安装桌面窗口组件 pywebview ...
  python -m pip install --user -r requirements.txt || (echo 安装失败，先用浏览器版打开。 & python server.py & pause & exit /b)
)

rem 用 pythonw 启动：没有黑色控制台窗口，这个 bat 窗口会马上关掉
where pythonw >nul 2>nul && (start "" pythonw desktop.py %* & exit /b)
python desktop.py %*
