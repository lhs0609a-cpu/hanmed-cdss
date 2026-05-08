"""
구조화 로거 — 표준 logging 모듈 기반
- 콘솔 + 회전 파일 핸들러
- 모듈명 표시
- INFO/WARN/ERROR 레벨
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional


_LOGGERS: dict[str, logging.Logger] = {}
_INITIALIZED = False


def _ensure_initialized(log_dir: Optional[Path] = None) -> None:
    global _INITIALIZED
    if _INITIALIZED:
        return

    root = logging.getLogger("hanmed")
    root.setLevel(logging.INFO)
    root.handlers.clear()

    fmt = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(fmt)
    root.addHandler(console)

    if log_dir is None:
        log_dir = Path(__file__).resolve().parents[2] / "data" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    file_handler = RotatingFileHandler(
        log_dir / "ai-engine.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(fmt)
    root.addHandler(file_handler)

    root.propagate = False
    _INITIALIZED = True


def get_logger(name: str) -> logging.Logger:
    """모듈 단위 로거 반환. 'hanmed.<name>' 네임스페이스로 통일."""
    _ensure_initialized()
    full = f"hanmed.{name}" if not name.startswith("hanmed.") else name
    if full not in _LOGGERS:
        _LOGGERS[full] = logging.getLogger(full)
    return _LOGGERS[full]
