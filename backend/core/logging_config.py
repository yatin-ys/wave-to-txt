import logging
import logging.handlers
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict


class StructuredFormatter(logging.Formatter):
    """
    Custom formatter that outputs structured logs in JSON format for files
    and human-readable format for console.
    """

    def __init__(self, use_json: bool = False):
        self.use_json = use_json
        super().__init__()

    def format(self, record: logging.LogRecord) -> str:
        # Create base log data
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields from record
        for key, value in record.__dict__.items():
            if key not in [
                "name",
                "msg",
                "args",
                "levelname",
                "levelno",
                "pathname",
                "filename",
                "module",
                "lineno",
                "funcName",
                "created",
                "msecs",
                "relativeCreated",
                "thread",
                "threadName",
                "processName",
                "process",
                "getMessage",
                "exc_info",
                "exc_text",
                "stack_info",
            ]:
                log_data[key] = value

        if self.use_json:
            return json.dumps(log_data, default=str)
        else:
            # Human-readable format for console
            timestamp = log_data["timestamp"]
            level = log_data["level"]
            logger = log_data["logger"]
            message = log_data["message"]
            location = f"{log_data['module']}:{log_data['function']}:{log_data['line']}"

            formatted = f"{timestamp} | {level:8} | {logger:20} | {message}"

            # Add location for DEBUG and ERROR levels
            if record.levelno in [logging.DEBUG, logging.ERROR]:
                formatted += f" | {location}"

            # Add exception if present
            if record.exc_info:
                formatted += f"\n{log_data['exception']}"

            return formatted


def setup_logging(
    log_level: str = "INFO",
    log_dir: str = "logs",
    max_file_size: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5,
    enable_file_logging: bool = True,
) -> logging.Logger:
    """
    Set up structured logging with console and optional file output.

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: Directory to store log files
        max_file_size: Maximum size of each log file in bytes
        backup_count: Number of backup log files to keep
        enable_file_logging: Whether to enable file logging

    Returns:
        Configured logger instance
    """

    # Convert string level to logging constant
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    # Create logs directory if it doesn't exist
    log_path = Path(log_dir)
    if enable_file_logging:
        log_path.mkdir(exist_ok=True)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Clear any existing handlers
    root_logger.handlers.clear()

    # Console handler with human-readable format
    console_handler = logging.StreamHandler()
    console_handler.setLevel(numeric_level)
    console_formatter = StructuredFormatter(use_json=False)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    if enable_file_logging:
        # File handler with JSON format and rotation
        log_file = log_path / "wavetotxt.log"
        file_handler = logging.handlers.RotatingFileHandler(
            filename=log_file,
            maxBytes=max_file_size,
            backupCount=backup_count,
            encoding="utf-8",
        )
        file_handler.setLevel(numeric_level)
        file_formatter = StructuredFormatter(use_json=True)
        file_handler.setFormatter(file_formatter)
        root_logger.addHandler(file_handler)

        # Error-only file handler
        error_log_file = log_path / "wavetotxt_errors.log"
        error_handler = logging.handlers.RotatingFileHandler(
            filename=error_log_file,
            maxBytes=max_file_size,
            backupCount=backup_count,
            encoding="utf-8",
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(file_formatter)
        root_logger.addHandler(error_handler)

    # Create application logger
    app_logger = logging.getLogger("wavetotxt")

    # Log initial setup info
    app_logger.info(
        "Logging system initialized",
        extra={
            "log_level": log_level,
            "file_logging_enabled": enable_file_logging,
            "log_directory": log_dir if enable_file_logging else None,
            "max_file_size_mb": max_file_size / (1024 * 1024),
            "backup_count": backup_count,
        },
    )

    return app_logger


def get_logger(name: str | None = None) -> logging.Logger:
    """
    Get a logger instance with the specified name.

    Args:
        name: Logger name (defaults to calling module name)

    Returns:
        Logger instance
    """
    if name is None:
        # Get the calling module name
        import inspect

        current_frame = inspect.currentframe()
        if current_frame is not None and current_frame.f_back is not None:
            name = current_frame.f_back.f_globals.get("__name__", "unknown")
        else:
            name = "unknown"

    return logging.getLogger(f"wavetotxt.{name}")


# Configuration from environment variables
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_DIR = os.getenv("LOG_DIR", "logs")
MAX_LOG_FILE_SIZE = int(os.getenv("MAX_LOG_FILE_SIZE", str(10 * 1024 * 1024)))  # 10MB
LOG_BACKUP_COUNT = int(os.getenv("LOG_BACKUP_COUNT", "5"))
ENABLE_FILE_LOGGING = os.getenv("ENABLE_FILE_LOGGING", "true").lower() == "true"

# Initialize logging system
logger = setup_logging(
    log_level=LOG_LEVEL,
    log_dir=LOG_DIR,
    max_file_size=MAX_LOG_FILE_SIZE,
    backup_count=LOG_BACKUP_COUNT,
    enable_file_logging=ENABLE_FILE_LOGGING,
)
