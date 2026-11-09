"""程序内一键更新。

发布方式：代码放在 GitHub 仓库，每次发版打一个 vX.Y.Z 标签，根目录的 version.json 记录版本号和
每个文件的 sha256（由 tools/release.py 生成）。

检查更新：依次尝试 GitHub raw → jsDelivr 镜像，取 main 分支上的 version.json。
下载更新：按 version.json 的文件清单逐个下载（先 jsDelivr 固定标签地址，国内通常更快；再 GitHub raw），
校验 sha256，全部成功后才覆盖到程序目录。自选、设置、缓存都在 %APPDATA%\\TradingBoard，不受影响。
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

REPO = os.environ.get("BOARD_REPO", "dhhp2k1/trading-board")
BRANCH = "main"
TEST_BASE = os.environ.get("BOARD_UPDATE_BASE")  # 仅测试用：从本地目录 / HTTP 地址取更新
ROOT = os.path.dirname(os.path.abspath(__file__))
UA = "Mozilla/5.0 TradingBoard-Updater"

_state = {"status": "idle", "message": "", "latest": None, "checked_at": 0, "progress": 0}
_lock = threading.Lock()


def _get(url, timeout=8):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _vtuple(v):
    try:
        return tuple(int(x) for x in str(v).lstrip("v").split("."))
    except ValueError:
        return (0,)


def fetch_manifest():
    """取最新的 version.json。jsDelivr 的分支地址可能有缓存，所以先 GitHub raw。"""
    t = int(time.time())
    if TEST_BASE:
        return json.loads(_get(f"{TEST_BASE}/version.json").decode("utf-8"))
    urls = [
        f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/version.json?t={t}",
        f"https://cdn.jsdelivr.net/gh/{REPO}@{BRANCH}/version.json",
        f"https://fastly.jsdelivr.net/gh/{REPO}@{BRANCH}/version.json",
    ]
    errors = []
    for u in urls:
        try:
            return json.loads(_get(u).decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            errors.append(f"{u.split('/')[2]}: {e}")
    raise RuntimeError("；".join(errors))


def check(current_version, force=False):
    """返回 {current, latest, available, notes}；结果缓存 10 分钟。"""
    with _lock:
        cached = _state.get("latest")
        fresh = time.time() - _state["checked_at"] < 600
    if cached and fresh and not force:
        m = cached
    else:
        m = fetch_manifest()
        with _lock:
            _state["latest"], _state["checked_at"] = m, time.time()
    return {
        "current": current_version,
        "latest": m.get("version"),
        "build": m.get("build"),
        "notes": m.get("notes", ""),
        "available": _vtuple(m.get("version")) > _vtuple(current_version),
        "frozen": bool(getattr(sys, "frozen", False)),
        "repo": REPO,
    }


def status():
    with _lock:
        return {k: _state[k] for k in ("status", "message", "progress")}


def _set(status_, message="", progress=None):
    with _lock:
        _state["status"], _state["message"] = status_, message
        if progress is not None:
            _state["progress"] = progress


def _download_file(version, path, sha):
    tag = "v" + version
    if TEST_BASE:
        data = _get(f"{TEST_BASE}/{path}")
        if hashlib.sha256(data).hexdigest() != sha:
            raise RuntimeError(f"{path} 校验失败")
        return data
    urls = [
        f"https://cdn.jsdelivr.net/gh/{REPO}@{tag}/{path}",
        f"https://raw.githubusercontent.com/{REPO}/{tag}/{path}",
        f"https://fastly.jsdelivr.net/gh/{REPO}@{tag}/{path}",
    ]
    last = None
    for u in urls:
        try:
            data = _get(u, timeout=30)
            if hashlib.sha256(data).hexdigest() != sha:
                raise ValueError("校验失败")
            return data
        except Exception as e:  # noqa: BLE001
            last = e
    raise RuntimeError(f"{path} 下载失败：{last}")


def _apply(manifest, restart_cmd):
    try:
        version, files = manifest["version"], manifest["files"]
        staging = tempfile.mkdtemp(prefix="tb-update-")
        # 只下载有变化的文件
        todo = []
        for path, sha in files.items():
            local = os.path.join(ROOT, path)
            if os.path.exists(local):
                with open(local, "rb") as f:
                    if hashlib.sha256(f.read()).hexdigest() == sha:
                        continue
            todo.append((path, sha))
        for i, (path, sha) in enumerate(todo):
            _set("downloading", f"下载 {path}（{i + 1}/{len(todo)}）", int(i * 90 / max(len(todo), 1)))
            data = _download_file(version, path, sha)
            dst = os.path.join(staging, path)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, "wb") as f:
                f.write(data)
        _set("installing", "替换文件", 92)
        for path, _ in todo:  # 全部下载成功后才覆盖
            dst = os.path.join(ROOT, path)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copyfile(os.path.join(staging, path), dst)
        shutil.rmtree(staging, ignore_errors=True)
        if manifest.get("requirements_changed"):
            _set("installing", "安装依赖", 95)
            subprocess.run([sys.executable, "-m", "pip", "install", "--user", "-r",
                            os.path.join(ROOT, "requirements.txt")], cwd=ROOT, capture_output=True,
                           creationflags=0x08000000 if os.name == "nt" else 0)
        _set("restarting", f"已更新到 v{version}，正在重启", 100)
        # 启动新版本：新进程会请求旧服务端退出后接管端口（见 server.main / desktop.start_server）
        kw = {"cwd": ROOT}
        if os.name == "nt":
            kw["creationflags"] = 0x00000008 | 0x00000200  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
        else:
            kw["start_new_session"] = True
        subprocess.Popen(restart_cmd, **kw)
    except Exception as e:  # noqa: BLE001
        _set("error", f"更新失败：{e}（原文件未改动）")


def start_update(restart_cmd):
    if getattr(sys, "frozen", False):
        _set("error", "打包版（exe）请下载新版安装包")
        return False
    with _lock:
        busy = _state["status"] in ("downloading", "installing", "restarting")
    if busy:
        return False
    manifest = fetch_manifest()
    _set("downloading", "准备下载", 0)
    threading.Thread(target=_apply, args=(manifest, restart_cmd), daemon=True).start()
    return True
