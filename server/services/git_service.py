import os, shutil
from pathlib import Path
from typing import List
import git
from config import settings

ALLOWED_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go",
    ".rs", ".c", ".cpp", ".cs", ".rb", ".php", ".swift",
    ".kt", ".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".sh",
}
SKIP_DIRS = {
    "node_models", ".git", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", "coverage", ".pytest_cache",
}

def repo_slug(url: str) -> str:
    parts = url.rstrip("/").split("/")
    return f"{parts[-2]}__{parts[-1]}" if len(parts) >= 2 else parts[-1]

def clone_or_pull(url: str) -> Path:
    dest = Path(settings.REPOS_DIR) / repo_slug(url)
    if dest.exists():
        git.Repo(dest).remotes.origin.pull()
    else:
        git.Repo.clone_from(url, dest, depth=50)
    return dest

def list_files(repo_path: Path) -> List[Path]:
    files: List[Path] = []
    for root, dirs, filenames in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in filenames:
            p = Path(root) / fname
            if p.suffix.lower() in ALLOWED_EXTENSIONS:
                files.append(p)
    return files