"""Gunicorn config for SoftOne CRM."""
from __future__ import annotations

import multiprocessing
import os


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    return int(raw) if raw else default


bind = "0.0.0.0:8000"
worker_class = "gthread"
_cpu_count = multiprocessing.cpu_count()
workers = _int_env("GUNICORN_WORKERS", min(_cpu_count + 1, 4))
threads = _int_env("GUNICORN_THREADS", 2)
timeout = _int_env("GUNICORN_TIMEOUT", 120)
graceful_timeout = 30
keepalive = 30
max_requests = _int_env("GUNICORN_MAX_REQUESTS", 2000)
max_requests_jitter = _int_env("GUNICORN_MAX_REQUESTS_JITTER", 200)
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")
