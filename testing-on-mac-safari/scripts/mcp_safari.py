#!/usr/bin/env python3
"""Drive the Safari Technology Preview MCP server on the Mac over SSH (stdio transport).

Usage: mcp_safari.py [--host <ssh-host>] '<json-rpc-request>' ['<json-rpc-request>' ...]
Each argument is a request object without jsonrpc/id (those are added).
Example: mcp_safari.py '{"method":"tools/list","params":{}}'

The mac's ssh host is not baked in. It is taken from, in order of precedence:
--host, $MAC_HOST, or the macHost key in ~/.testing-on-mac-safari.conf.
"""
import json
import os
import pathlib
import subprocess
import sys
import threading
import time

CONFIG = pathlib.Path.home() / ".testing-on-mac-safari.conf"


def config_value(key):
    """Read `key = value` from the config file. Returns None if absent."""
    try:
        text = CONFIG.read_text(encoding="utf-8")
    except OSError:
        return None
    for line in text.splitlines():
        line = line.split("#", 1)[0].strip()
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k.strip() == key:
            return v.strip() or None
    return None


argv = sys.argv[1:]
mac_host = os.environ.get("MAC_HOST")
if argv[:1] == ["--host"]:
    mac_host, argv = argv[1], argv[2:]
mac_host = mac_host or config_value("macHost")

if not mac_host:
    raise SystemExit(
        f"no mac host: pass --host, set $MAC_HOST, or put `macHost = <name>` in {CONFIG}"
    )

SSH_CMD = [
    "ssh", "-o", "BatchMode=yes", mac_host,
    '"/Applications/Safari Technology Preview.app/Contents/MacOS/safaridriver" --mcp',
]

proc = subprocess.Popen(
    SSH_CMD, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
    stderr=subprocess.PIPE, text=True, bufsize=1,
)


def drain_stderr():
    for line in proc.stderr:
        sys.stderr.write("[stderr] " + line)


threading.Thread(target=drain_stderr, daemon=True).start()

_next_id = [0]


def send(method, params=None, notify=False):
    msg = {"jsonrpc": "2.0", "method": method, "params": params or {}}
    if not notify:
        _next_id[0] += 1
        msg["id"] = _next_id[0]
    proc.stdin.write(json.dumps(msg) + "\n")
    proc.stdin.flush()
    if notify:
        return None
    while True:
        line = proc.stdout.readline()
        if not line:
            raise SystemExit("server closed the connection")
        try:
            resp = json.loads(line)
        except json.JSONDecodeError:
            sys.stderr.write("[raw] " + line)
            continue
        if resp.get("id") == msg["id"]:
            return resp


send("initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "claude-code", "version": "1.0"},
})
send("notifications/initialized", notify=True)

for raw in argv:
    req = json.loads(raw)
    if req["method"] == "__sleep":
        time.sleep(req["params"]["s"])
        continue
    resp = send(req["method"], req.get("params", {}))
    print(json.dumps(resp, indent=2, ensure_ascii=False))

proc.stdin.close()
proc.wait(timeout=10)
