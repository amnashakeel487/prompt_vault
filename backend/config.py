import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from parent directory or local .env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
load_dotenv()

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: SUPABASE_URL or SUPABASE_KEY is missing. Check your environment configuration.")

# Initialize default Supabase client
supabase: Client = create_client(
    SUPABASE_URL or "https://placeholder.supabase.co",
    SUPABASE_KEY or "placeholder-key"
)

def get_supabase_client(token=None) -> Client:
    """
    Returns a Supabase client instance. If an Authorization bearer token is provided,
    attaches it to client headers for RLS evaluation.
    """
    if not token:
        return supabase

    client = create_client(
        SUPABASE_URL or "https://placeholder.supabase.co",
        SUPABASE_KEY or "placeholder-key"
    )
    # Set bearer token header for user authentication context
    client.postgrest.auth(token)
    return client
