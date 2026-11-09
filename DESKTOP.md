# 交易看板桌面版（原生窗口）

不再打开浏览器：看板显示在一个独立的 Windows 窗口里，用的是系统自带的 Edge WebView2 内核，
不额外打包浏览器，所以很轻（pywebview 只有几 MB，内存比开一个 Chrome 标签页还少）。

## 用法
1. 装 Python 3.9+（安装时勾选 "Add python.exe to PATH"）。
2. 双击 `start.bat`。
   - 第一次会自动 `pip install pywebview`，大约半分钟，只装一次。
   - 之后每次双击直接弹出窗口，没有黑色控制台窗口。
3. 关闭窗口即退出，后台服务端一起结束。

想把它放到桌面或任务栏：右键 `start.bat` → 发送到 → 桌面快捷方式；或者按下面的方法打成 exe 后把 exe 固定到任务栏。

## 窗口特性
- **深色标题栏**：Windows 11 上标题栏是纯黑底、琥珀色标题字（Bloomberg 风格）；Windows 10 上是系统深色标题栏。
- **记住窗口**：大小、位置、是否最大化保存在 `%APPDATA%\TradingBoard\window.json`。副屏拔掉后会自动回到主屏居中。
- **启动不闪白**：窗口底色是黑色。
- **自选股和设置保留**：网页数据存在 `%APPDATA%\TradingBoard\webview\`（关掉了 pywebview 默认的无痕模式）。
- 自选股导出（watchlist.txt 下载）、导入（选文件）在窗口里照常可用。

> 注意：之前在浏览器版里建的自选股存在浏览器里，不会自动搬过来。在浏览器版点「导出」，再在桌面版点「导入」即可。

## 参数
| 命令 | 作用 |
|---|---|
| `start.bat` | 原生窗口（默认） |
| `start.bat --browser` | 退回浏览器版 |
| `start.bat --debug` | 窗口里可按 F12 打开开发者工具 |
| `set BOARD_PORT=8800` 后再运行 | 换端口（8765 被别的程序占用时；换端口后自选股需重新导入） |

已经有一个看板在跑（比如开着浏览器版）时，桌面版会直接复用它，不会报端口冲突。
出错时会弹窗提示，详细日志在 `%APPDATA%\TradingBoard\desktop.log`。

## 打包成一个 exe（可选，不装 Python 也能用）
在这台装了 Python 的电脑上，打开本目录的命令行，执行：

```bat
python -m pip install -r requirements.txt pyinstaller
python -m PyInstaller --noconfirm --onefile --windowed --name TradingBoard ^
  --add-data "static;static" --hidden-import server desktop.py
```

生成的 `dist\TradingBoard.exe`（约 15–25 MB）可以单独拷到任何 Windows 10/11 电脑上双击运行。

- `--windowed`：不带控制台窗口。想加图标就再加 `--icon board.ico`。
- 单文件 exe 每次启动要先解压，约慢 1–2 秒。想秒开就把 `--onefile` 换成 `--onedir`，得到一个文件夹，运行里面的 `TradingBoard.exe`。
- exe 依赖 WebView2 运行时：Windows 11 自带；Windows 10 一般已随 Edge 装好，没有的话从微软官网装 "WebView2 Runtime Evergreen"。
- 改了 `server.py` 或 `static/` 之后，重新执行上面的打包命令即可。
- 有些杀毒软件会误报 PyInstaller 打的单文件 exe，加白名单或改用 `--onedir`。

## 文件
- `desktop.py`：桌面窗口启动器（在后台线程里运行 `server.py` 的 `main()`，再打开原生窗口）
- `requirements.txt`：只有 pywebview
- `start.bat`：一键启动（自动安装依赖；装不上时退回浏览器版）
- `server.py`、`static/`：看板本体，桌面版和浏览器版共用
