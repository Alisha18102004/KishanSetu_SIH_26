import os
from pathlib import Path
from dotenv import load_dotenv

# Always load the .env that lives next to this file.
# This works whether FastAPI is started from backend/ or the project root.
ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=False)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
SUPABASE_ENABLED = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)

supabase = None
if SUPABASE_ENABLED:
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def require_db():
    if not SUPABASE_ENABLED or supabase is None:
        raise RuntimeError(
            f"Supabase is not configured. Expected SUPABASE_URL and "
            f"SUPABASE_SERVICE_ROLE_KEY in {ENV_FILE}"
        )
    return supabase
