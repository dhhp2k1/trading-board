"""发版：生成根目录的 version.json（版本号、构建时间、更新说明、每个文件的 sha256）。

用法：python tools/release.py "这次更新的说明"
然后：git add -A && git commit && git tag vX.Y.Z && git push && git push --tags
版本号取自 server.py 里的 VERSION，发版前先改它。
"""
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {".git", "__pycache__", ".github", "dist", "build"}
SKIP_FILES = {"version.json"}


def main():
    src = open(os.path.join(ROOT, "server.py"), encoding="utf-8").read()
    version = re.search(r'^VERSION = "([^"]+)"', src, re.M).group(1)
    build = re.search(r'^BUILD = "([^"]+)"', src, re.M).group(1)
    files = {}
    for root, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for n in names:
            if n in SKIP_FILES or n.endswith((".pyc", ".png", ".zip")):
                continue
            p = os.path.join(root, n)
            rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
            files[rel] = hashlib.sha256(open(p, "rb").read()).hexdigest()
    old = {}
    vp = os.path.join(ROOT, "version.json")
    if os.path.exists(vp):
        old = json.load(open(vp, encoding="utf-8"))
    manifest = {
        "version": version,
        "build": build,
        "notes": sys.argv[1] if len(sys.argv) > 1 else "",
        "requirements_changed": old.get("files", {}).get("requirements.txt") not in (None, files.get("requirements.txt")),
        "files": dict(sorted(files.items())),
    }
    json.dump(manifest, open(vp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"version.json: v{version}, {len(files)} files")


if __name__ == "__main__":
    main()
