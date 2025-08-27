from pathlib import Path
import time
import subprocess
from fastapi import HTTPException
from constants import get_repo_url, USERNAME, REPO_SLUG


def _run(args, cwd: Path, timeout=60):
    r = subprocess.run(
        args, cwd=str(cwd), capture_output=True, text=True, timeout=timeout
    )
    if r.returncode != 0:
        raise RuntimeError(
            f"{' '.join(args)}\nSTDOUT:\n{r.stdout}\nSTDERR:\n{r.stderr}"
        )
    return r.stdout.strip()


def ensure_repo(repo_path: Path, owner: str, repo: str, token: str):
    """
    Pastikan repo_path berisi repo git; kalau belum ada -> clone memakai token.
    """
    repo_path = repo_path.resolve()
    repo_path.mkdir(parents=True, exist_ok=True)
    print("repo_path", repo_path)
    if not (repo_path / ".git").exists():
        # clone ke folder target
        remote_with_token = (
            f"https://x-access-token:{token}@github.com/{owner}/{repo}.git"
        )
        _run(
            ["git", "clone", "--depth", "1", remote_with_token, str(repo_path)],
            cwd=repo_path.parent,
        )


def _commit_and_push_changes(
    repo_path: Path,
    commit_message: str,
    access_token: str,
    user_email: str,
    user_name: str,
):
    """Commit and push all changes with a timestamp-based message."""
    try:
        print("repo_path", repo_path)
        print("commit_message", commit_message)
        print("access_token", access_token)
        repo_url = get_repo_url(access_token)
        print("repo_url", repo_url)

        ensure_repo(repo_path, USERNAME, REPO_SLUG, access_token)
        # config identitas commit (once)
        _run(["git", "config", "user.name", user_name], cwd=repo_path)
        _run(["git", "config", "user.email", user_email], cwd=repo_path)

        # stage semua perubahan
        _run(["git", "add", "-A"], cwd=repo_path)

        # cek ada perubahan?
        if _run(["git", "status", "--porcelain"], cwd=repo_path) == "":
            return  # tidak ada yang di-commit
        # Get current timestamp for commit message
        timestamp_message = f"{commit_message} - {time.strftime('%Y-%m-%d %H:%M:%S')}"

        # commit
        _run(["git", "commit", "-m", timestamp_message], cwd=repo_path)

        # tentukan branch saat ini
        try:
            branch = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo_path)
        except Exception:
            branch = "main"

        # pastikan remote origin ada
        remotes = _run(["git", "remote"], cwd=repo_path).splitlines()
        tokenless_remote = f"https://github.com/{USERNAME}/{REPO_SLUG}.git"
        if "origin" not in remotes:
            _run(["git", "remote", "add", "origin", tokenless_remote], cwd=repo_path)

        # set-url origin sementara pakai token → push → kembalikan
        remote_with_token = f"https://x-access-token:{access_token}@github.com/{USERNAME}/{REPO_SLUG}.git"
        _run(["git", "remote", "set-url", "origin", remote_with_token], cwd=repo_path)
        try:
            _run(
                ["git", "push", "origin", f"HEAD:{branch}"], cwd=repo_path, timeout=120
            )
        finally:
            _run(
                ["git", "remote", "set-url", "origin", tokenless_remote], cwd=repo_path
            )

    except Exception as e:
        # In a real application, you'd want to log this error.
        # For this example, we'll let it fail silently or raise an
        # internal server error if not handled by the calling function.
        # We can add more specific error handling here if needed.
        print(f"Git operation failed: {e}")
        # Optionally re-raise or handle as an HTTP exception
        raise HTTPException(status_code=500, detail=f"Error pushing changes: {str(e)}")
