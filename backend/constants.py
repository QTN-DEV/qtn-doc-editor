import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_DIR = os.path.join(PROJECT_ROOT, "repo")
os.makedirs(REPO_DIR, exist_ok=True)
USERNAME = "QTN-DEV"
REPO_SLUG = "qtn-doc"


def get_repo_url(access_token: str):
    return f"https://{access_token}@github.com/{USERNAME}/{REPO_SLUG}.git"
