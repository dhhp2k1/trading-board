"""从选定的 main 或 next 分支读取清单，逐个核验 SHA-256 后安装并重启。"""
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
CHANNELS = ("main", "next")
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


def _cdn(ref, path):
    """jsDelivr 的几个入口：国内 cdn.jsdelivr.net 常被干扰，其余入口通常能用。"""
    return [f"https://{h}/gh/{REPO}@{ref}/{path}"
            for h in ("fastly.jsdelivr.net", "gcore.jsdelivr.net", "testingcf.jsdelivr.net", "cdn.jsdelivr.net")]


def fetch_manifest(branch):
    """同时从所有来源取 version.json，取版本号最高的一份。

    国内网络下 GitHub 常不通、jsDelivr 的 @main 地址最多缓存 12 小时，
    按顺序“第一个成功就用”会拿到旧版本却不报错，所以并行查询后比较版本号。"""
    if branch not in CHANNELS:
        raise ValueError("未知更新通道")
    if TEST_BASE:
        m = json.loads(_get(f"{TEST_BASE}/version.json").decode("utf-8"))
        if m.get("channel") != branch:
            raise ValueError("清单通道不匹配")
        m["_sources"] = [{"src": "test", "version": m.get("version")}]
        return m
    from concurrent.futures import ThreadPoolExecutor
    t = int(time.time())
    ref_box = {}

    def by_ref():  # 先查 main 最新提交 sha，再按 sha 取（不可变地址，不受 CDN 缓存影响）
        ref = resolve_ref(branch)
        ref_box["ref"] = ref
        if ref == branch:
            raise RuntimeError("查不到最新提交")
        urls = [f"https://raw.githubusercontent.com/{REPO}/{ref}/version.json"] + _cdn(ref, "version.json")
        last = None
        for u in urls:
            try:
                return u, ref, json.loads(_get(u, timeout=6).decode("utf-8"))
            except Exception as e:  # noqa: BLE001
                last = e
        raise RuntimeError(f"按提交取失败：{last}")

    def one(u):
        def f():
            return u, branch, json.loads(_get(u, timeout=6).decode("utf-8"))
        return f

    jobs = [("最新提交", by_ref),
            ("GitHub raw", one(f"https://raw.githubusercontent.com/{REPO}/{branch}/version.json?t={t}")),
            ("GitHub", one(f"https://github.com/{REPO}/raw/{branch}/version.json?t={t}"))]
    jobs += [(u.split("/")[2], one(u)) for u in _cdn(branch, "version.json")]
    results, sources = [], []
    with ThreadPoolExecutor(len(jobs)) as ex:
        futs = [(name, ex.submit(fn)) for name, fn in jobs]
        for name, fu in futs:
            try:
                u, ref, m = fu.result(timeout=25)
                if m.get("channel") != branch:
                    raise ValueError("清单通道不匹配")
                results.append((_vtuple(m.get("version")), ref != branch, ref, m))
                sources.append({"src": name, "version": m.get("version")})
            except Exception as e:  # noqa: BLE001
                sources.append({"src": name, "error": str(e)[:80]})
    if not results:
        raise RuntimeError("所有更新源都连不上：" + "；".join(f"{x['src']} {x.get('error', '')}" for x in sources))
    # 版本最高者优先；同版本时优先按提交 sha 取到的那份（下载地址不受缓存影响）
    results.sort(key=lambda r: (r[0], r[1]), reverse=True)
    _, _, ref, m = results[0]
    m["_ref"] = ref if ref != branch else ref_box.get("ref", branch)
    m["_sources"] = sources
    return m


def check(current_version, installed, branch, force=False):
    """返回 {current, latest, available, notes}；结果缓存 10 分钟。"""
    with _lock:
        cached = _state.get("latest")
        fresh = time.time() - _state["checked_at"] < 600
    if cached and cached.get("channel") == branch and fresh and not force:
        m = cached
    else:
        m = fetch_manifest(branch)
        with _lock:
            _state["latest"], _state["checked_at"] = m, time.time()
    return {
        "current": current_version,
        "channel": branch,
        "latest": m.get("version"),
        "build": m.get("build"),
        "notes": m.get("notes", ""),
        "available": branch != installed or _vtuple(m.get("version")) > _vtuple(current_version),
        "frozen": bool(getattr(sys, "frozen", False)),
        "repo": REPO,
        "sources": m.get("_sources", []),
    }


def status():
    with _lock:
        return {k: _state[k] for k in ("status", "message", "progress")}


def _set(status_, message="", progress=None):
    with _lock:
        _state["status"], _state["message"] = status_, message
        if progress is not None:
            _state["progress"] = progress


def resolve_ref(branch):
    """main 分支最新提交的 sha（不可变地址，不受 CDN 缓存影响）；查不到就退回分支名。"""
    for u in (f"https://api.github.com/repos/{REPO}/commits/{branch}",
              f"https://data.jsdelivr.com/v1/packages/gh/{REPO}/resolved?specifier={branch}"):
        try:
            d = json.loads(_get(u, timeout=6).decode("utf-8"))
            sha = d.get("sha") or d.get("version")
            if sha and len(sha) >= 7:
                return sha
        except Exception:  # noqa: BLE001
            pass
    return branch


def _download_file(branch, ref, path, sha):
    if TEST_BASE:
        data = _get(f"{TEST_BASE}/{path}")
        if hashlib.sha256(data).hexdigest() != sha:
            raise RuntimeError(f"{path} 校验失败")
        return data
    def cdn(r):
        return _cdn(r, path)

    def raw(r):
        return [f"https://raw.githubusercontent.com/{REPO}/{r}/{path}?t={int(time.time())}",
                f"https://github.com/{REPO}/raw/{r}/{path}"]
    # 固定到提交 sha 时 jsDelivr 内容可靠且国内快；sha 可能因 API 缓存略旧，校验不过就再试分支最新内容
    urls = (cdn(ref) + raw(ref) if ref != branch else []) + raw(branch) + cdn(branch)
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
    staging = None
    installed = []
    try:
        version, files = manifest["version"], manifest["files"]
        branch = manifest["channel"]
        ref = manifest.get("_ref") or branch
        staging = tempfile.mkdtemp(prefix=".tb-update-", dir=ROOT)
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
            data = _download_file(branch, ref, path, sha)
            dst = os.path.join(staging, path)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, "wb") as f:
                f.write(data)
        _set("installing", "替换文件", 92)
        with open(os.path.join(staging, "version.json"), "w", encoding="utf-8") as f:
            json.dump({k: v for k, v in manifest.items() if not k.startswith("_")}, f, ensure_ascii=False, indent=1)
        for path in [name for name, _ in todo] + ["version.json"]:
            dst = os.path.join(ROOT, path)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            backup = None
            if os.path.isfile(dst):
                backup = os.path.join(staging, "backup", path)
                os.makedirs(os.path.dirname(backup), exist_ok=True)
                shutil.copyfile(dst, backup)
            os.replace(os.path.join(staging, path), dst)
            installed.append((dst, backup))
        if manifest.get("requirements_changed"):
            _set("installing", "安装依赖", 95)
            subprocess.run([sys.executable, "-m", "pip", "install", "--user", "-r",
                            os.path.join(ROOT, "requirements.txt")], cwd=ROOT, capture_output=True, check=True,
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
        try:
            for dst, backup in reversed(installed):
                if backup:
                    os.replace(backup, dst)
                else:
                    os.remove(dst)
        except OSError as rollback_error:
            _set("error", f"更新失败：{e}；恢复失败：{rollback_error}。备份位于 {staging}")
            staging = None
            return
        _set("error", f"更新失败：{e}")
    finally:
        if staging:
            shutil.rmtree(staging, ignore_errors=True)


def start_update(restart_cmd, current, installed, branch, expected):
    if getattr(sys, "frozen", False):
        _set("error", "打包版（exe）请下载新版安装包")
        return False
    if branch not in CHANNELS:
        raise ValueError("未知更新通道")
    with _lock:
        busy = _state["status"] in ("checking", "downloading", "installing", "restarting")
        if busy:
            return False
        _state.update(status="checking", message="核对更新清单", progress=0)
    try:
        manifest = fetch_manifest(branch)
        version = manifest["version"]
        if expected != version or (installed == branch and _vtuple(version) <= _vtuple(current)):
            raise ValueError("目标版本已变化，请重新检查更新")
        _set("downloading", "准备下载", 0)
        threading.Thread(target=_apply, args=(manifest, restart_cmd), daemon=True).start()
        return True
    except Exception as exc:
        _set("error", str(exc))
        raise
