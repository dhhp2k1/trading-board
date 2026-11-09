"""交易看板桌面版：把本地服务端装进一个原生窗口（Edge WebView2），不再用浏览器。

运行：双击 start.bat，或  pythonw desktop.py
参数：
  --browser   不开原生窗口，退回用浏览器打开（等同旧版 python server.py）
  --debug     打开 WebView2 开发者工具（F12）

窗口大小、位置、是否最大化保存在 %APPDATA%\\TradingBoard\\window.json；
自选股等网页设置（localStorage）保存在 %APPDATA%\\TradingBoard\\webview\\。
"""
import json
import os
import socket
import sys
import threading
import time
import traceback
import urllib.request

APP_NAME = "TradingBoard"
TITLE = "交易看板"
HOST = "127.0.0.1"
# 端口固定：网页设置（自选股）按 http://127.0.0.1:端口 保存，换端口就看不到旧设置。
PORT = int(os.environ.get("BOARD_PORT", "8765"))
os.environ["BOARD_PORT"] = str(PORT)

DEFAULT_W, DEFAULT_H = 1440, 900
MIN_W, MIN_H = 960, 600

# Bloomberg 风格标题栏：纯黑底、琥珀色标题字（Windows 11 才支持改颜色，Windows 10 只变成深色）
CAPTION_RGB = (0x00, 0x00, 0x00)
TEXT_RGB = (0xFF, 0xA0, 0x28)
BORDER_RGB = (0x30, 0x30, 0x30)


def app_dir():
    base = os.environ.get("APPDATA") or os.path.expanduser("~/.config")
    path = os.path.join(base, APP_NAME)
    os.makedirs(path, exist_ok=True)
    return path


def log_path():
    return os.path.join(app_dir(), "desktop.log")


def log(msg):
    try:
        with open(log_path(), "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + msg + "\n")
    except OSError:
        pass


def alert(msg):
    """pythonw 没有控制台，出错时弹窗提示。"""
    log(msg)
    if sys.platform == "win32":
        import ctypes
        ctypes.windll.user32.MessageBoxW(None, msg, TITLE, 0x10)
    else:
        print(msg, file=sys.stderr)


# ---------------- 窗口状态 ----------------
STATE_FILE = None


def load_state():
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            s = json.load(f)
        w = max(MIN_W, int(s.get("width", DEFAULT_W)))
        h = max(MIN_H, int(s.get("height", DEFAULT_H)))
        x, y = s.get("x"), s.get("y")
        if x is not None and y is not None and not on_screen(int(x), int(y), w, h):
            x = y = None  # 上次在副屏、副屏拔掉了：回到默认居中
        return {"width": w, "height": h, "x": x, "y": y, "maximized": bool(s.get("maximized"))}
    except (OSError, ValueError, TypeError):
        return {"width": DEFAULT_W, "height": DEFAULT_H, "x": None, "y": None, "maximized": False}


def save_state(state):
    try:
        tmp = STATE_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(state, f)
        os.replace(tmp, STATE_FILE)
    except OSError as e:
        log(f"save_state failed: {e}")


def on_screen(x, y, w, h):
    """标题栏至少有一块落在当前虚拟桌面里才算有效。"""
    if sys.platform != "win32":
        return True
    import ctypes
    gsm = ctypes.windll.user32.GetSystemMetrics
    vx, vy, vw, vh = gsm(76), gsm(77), gsm(78), gsm(79)
    return x + w - 100 > vx and x + 100 < vx + vw and vy <= y + 10 < vy + vh


# ---------------- 深色标题栏 ----------------
def colorref(rgb):
    r, g, b = rgb
    return r | (g << 8) | (b << 16)


def style_title_bar(window):
    if sys.platform != "win32":
        return
    try:
        import ctypes
        from ctypes import wintypes
        hwnd = None
        try:
            hwnd = int(window.native.Handle.ToInt64())
        except Exception:  # noqa: BLE001
            hwnd = ctypes.windll.user32.FindWindowW(None, TITLE)
        if not hwnd:
            log("style_title_bar: window handle not found")
            return
        dwm = ctypes.windll.dwmapi.DwmSetWindowAttribute
        dwm.argtypes = [wintypes.HWND, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD]

        def set_attr(attr, value):
            v = ctypes.c_int(value)
            return dwm(hwnd, attr, ctypes.byref(v), ctypes.sizeof(v))

        # 20 = DWMWA_USE_IMMERSIVE_DARK_MODE（Win10 20H1+）；19 是更早的 Win10 版本
        if set_attr(20, 1) != 0:
            set_attr(19, 1)
        set_attr(35, colorref(CAPTION_RGB))  # DWMWA_CAPTION_COLOR（Win11）
        set_attr(36, colorref(TEXT_RGB))     # DWMWA_TEXT_COLOR
        set_attr(34, colorref(BORDER_RGB))   # DWMWA_BORDER_COLOR
        # Win10 上要强制重绘一次非客户区，标题栏才会立刻变黑
        SWP_NOSIZE, SWP_NOMOVE, SWP_NOZORDER, SWP_FRAMECHANGED = 0x1, 0x2, 0x4, 0x20
        ctypes.windll.user32.SetWindowPos(
            hwnd, None, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOZORDER | SWP_FRAMECHANGED)
    except Exception:  # noqa: BLE001
        log("style_title_bar failed:\n" + traceback.format_exc())


# ---------------- 本地服务端 ----------------
def port_open():
    try:
        with socket.create_connection((HOST, PORT), timeout=0.3):
            return True
    except OSError:
        return False


def is_our_board():
    try:
        with urllib.request.urlopen(f"http://{HOST}:{PORT}/", timeout=1) as r:
            return TITLE in r.read(4096).decode("utf-8", "ignore")
    except Exception:  # noqa: BLE001
        return False


def running_version():
    """端口上的看板版本；旧版没有 /api/version 时返回 ""，不是看板返回 None。"""
    try:
        with urllib.request.urlopen(f"http://{HOST}:{PORT}/api/version", timeout=1) as r:
            return json.loads(r.read().decode("utf-8")).get("version", "")
    except Exception:  # noqa: BLE001
        return "" if is_our_board() else None


def kill_port_owner():
    """Windows：结束占用端口的旧 python / pythonw 进程（只杀 Python，不碰别的程序）。"""
    if os.name != "nt":
        return
    import subprocess
    flags = 0x08000000  # CREATE_NO_WINDOW
    try:
        out = subprocess.run(["netstat", "-ano", "-p", "TCP"], capture_output=True, text=True,
                             creationflags=flags, timeout=5).stdout
        # 不依赖 "LISTENING" 字样（非英文 Windows 会本地化），只看本地地址列是 127.0.0.1:端口
        pids = set()
        for line in out.splitlines():
            cols = line.split()
            if len(cols) >= 4 and cols[1] == f"{HOST}:{PORT}" and cols[-1].isdigit():
                pids.add(cols[-1])
        for pid in pids:
            if not pid.isdigit() or int(pid) == os.getpid():
                continue
            info = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
                                  capture_output=True, text=True, creationflags=flags, timeout=5).stdout.lower()
            if "python" in info or "tradingboard" in info:  # 源码版或 PyInstaller 打包版
                subprocess.run(["taskkill", "/PID", pid, "/F"], capture_output=True, creationflags=flags, timeout=5)
                log(f"killed old board process {pid}")
    except Exception:  # noqa: BLE001
        log("kill_port_owner failed:\n" + traceback.format_exc())


def wait_port_closed(seconds):
    for _ in range(int(seconds / 0.1)):
        if not port_open():
            return True
        time.sleep(0.1)
    return False


def start_server():
    """在后台线程里跑 server.main()。端口上已有同版本看板就复用；是旧版本就先让它退出。"""
    import server  # noqa: E402  同目录的 server.py
    if port_open():
        rv = running_version()
        if rv == server.VERSION:
            log(f"reusing board v{rv} already running on {PORT}")
            return True
        if rv is None:
            alert(f"端口 {PORT} 被别的程序占用了。\n可以关掉那个程序，或设置环境变量 BOARD_PORT 换一个端口"
                  f"（换端口后需要重新导入自选股）。")
            return False
        log(f"old board v{rv or '<0.4'} on {PORT}, replacing with v{server.VERSION}")
        try:
            req = urllib.request.Request(f"http://{HOST}:{PORT}/api/shutdown", data=b"", method="POST")
            urllib.request.urlopen(req, timeout=2).read()
        except Exception:  # noqa: BLE001
            pass
        if not wait_port_closed(2):
            kill_port_owner()
            if not wait_port_closed(3):
                alert(f"旧版本看板还在运行，没能自动关闭。\n请在任务管理器里结束 python / pythonw 进程后重新打开。")
                return False

    if "--no-browser" not in sys.argv:
        sys.argv.append("--no-browser")
    if getattr(sys, "frozen", False):
        server.ROOT = sys._MEIPASS  # PyInstaller 单文件：static/ 被解压到这里

    def run():
        try:
            server.main()
        except Exception:  # noqa: BLE001
            log("server crashed:\n" + traceback.format_exc())

    threading.Thread(target=run, name="board-server", daemon=True).start()
    for _ in range(100):
        if port_open():
            return True
        time.sleep(0.05)
    alert("本地服务端没能启动，详情见 " + log_path())
    return False


# ---------------- 主程序 ----------------
def main():
    global STATE_FILE
    if getattr(sys, "frozen", False):
        os.chdir(sys._MEIPASS)
    else:
        here = os.path.dirname(os.path.abspath(__file__))
        os.chdir(here)
        sys.path.insert(0, here)

    if "--browser" in sys.argv:
        sys.argv.remove("--browser")
        import server
        server.main()
        return

    try:
        import webview
    except ImportError:
        alert("缺少 pywebview。请双击 start.bat 自动安装，或运行：\n  python -m pip install -r requirements.txt")
        return

    if not start_server():
        return

    STATE_FILE = os.path.join(app_dir(), "window.json")
    state = load_state()
    url = f"http://{HOST}:{PORT}/"

    webview.settings["ALLOW_DOWNLOADS"] = True  # 自选股导出（watchlist.txt）要用
    webview.settings["OPEN_EXTERNAL_LINKS_IN_BROWSER"] = True

    window = webview.create_window(
        TITLE, url,
        width=state["width"], height=state["height"], x=state["x"], y=state["y"],
        min_size=(MIN_W, MIN_H), maximized=state["maximized"],
        background_color="#000000", text_select=True,
    )

    # 只在“正常”状态下记录尺寸，最大化 / 最小化时不覆盖
    live = dict(state)
    flags = {"maximized": state["maximized"], "minimized": False}

    def on_resized(width, height):
        if not flags["maximized"] and not flags["minimized"]:
            live["width"], live["height"] = max(MIN_W, width), max(MIN_H, height)

    def on_moved(x, y):
        if not flags["maximized"] and not flags["minimized"] and x > -10000:
            live["x"], live["y"] = x, y

    def on_maximized():
        flags["maximized"] = True

    def on_minimized():
        flags["minimized"] = True

    def on_restored():
        # 从最小化还原时，窗口回到最小化之前的状态（可能仍是最大化）
        if flags["minimized"]:
            flags["minimized"] = False
        else:
            flags["maximized"] = False

    def on_closing():
        live["maximized"] = flags["maximized"]
        save_state(live)

    window.events.shown += lambda: style_title_bar(window)
    window.events.resized += on_resized
    window.events.moved += on_moved
    window.events.maximized += on_maximized
    window.events.minimized += on_minimized
    window.events.restored += on_restored
    window.events.closing += on_closing

    webview.start(
        gui="edgechromium" if sys.platform == "win32" else None,
        private_mode=False,  # 默认是无痕模式，会丢自选股；必须关掉
        storage_path=os.path.join(app_dir(), "webview"),
        debug="--debug" in sys.argv,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception:  # noqa: BLE001
        alert("交易看板启动失败：\n" + traceback.format_exc()[-1500:])
