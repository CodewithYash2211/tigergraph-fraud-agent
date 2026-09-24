"""Isolated test output using inherited Windows ACLs in the workspace."""
import shutil
import uuid
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def output_directory():
    root = Path(__file__).resolve().parent / ".tmp"
    target = root / uuid.uuid4().hex
    target.mkdir(parents=True)
    try:
        yield target
    finally:
        if target.resolve().parent != root.resolve():
            raise RuntimeError("Unexpected test cleanup path")
        shutil.rmtree(target)
        if root.exists() and not any(root.iterdir()):
            root.rmdir()
