from pathlib import Path
from typing import Dict, List

EXTENSION_LANGUAGES = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".c": "C",
    ".cpp": "C++",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".kt": "Kotlin",
}

CONFIG_MARKERS = {
    "package.json", "pyproject.toml", "tsconfig.json", "tsconfig.app.json",
    "eslint.config.js", ".eslintrc", ".eslintrc.json", "setup.cfg", ".flake8",
}


def compute_repo_stats(rel_paths: List[str], chunk_count: int) -> Dict:
    """Derive real, repo-specific metrics from the files that were actually indexed."""
    lang_counts: Dict[str, int] = {}
    has_readme = has_tests = has_ci = has_config = False

    for rel in rel_paths:
        p = Path(rel)
        lang = EXTENSION_LANGUAGES.get(p.suffix.lower())
        if lang:
            lang_counts[lang] = lang_counts.get(lang, 0) + 1

        lower = rel.lower()
        name_lower = p.name.lower()
        if name_lower.startswith("readme"):
            has_readme = True
        if "test" in lower or "spec" in lower:
            has_tests = True
        if ".github" in lower and "workflows" in lower:
            has_ci = True
        if name_lower in CONFIG_MARKERS:
            has_config = True

    stack = [lang for lang, _ in sorted(lang_counts.items(), key=lambda kv: kv[1], reverse=True)[:3]]
    signals = [has_readme, has_tests, has_ci, has_config]
    readiness = round(sum(signals) / len(signals) * 10, 1)

    return {
        "files": len(rel_paths),
        "chunks": chunk_count,
        "stack": stack,
        "readiness": readiness,
    }
