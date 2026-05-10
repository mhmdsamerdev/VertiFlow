import argparse
import uvicorn
import os
import sys
import shutil
from pathlib import Path
from dotenv import load_dotenv

def main():
    parser = argparse.ArgumentParser(description="VertiFlow - Smart Farm IoT Management Platform")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Start command
    start_parser = subparsers.add_parser("start", help="Start the VertiFlow FastAPI server")
    start_parser.add_argument("--host", default="0.0.0.0", help="Host to bind to (default: 0.0.0.0)")
    start_parser.add_argument("--port", type=int, default=8000, help="Port to bind to (default: 8000)")
    start_parser.add_argument("--dev", action="store_true", help="Run in development mode with auto-reload")
    start_parser.add_argument("--env", help="Path to .env file")

    # Check DB command
    subparsers.add_parser("check-db", help="Check database connection and initialization")

    args = parser.parse_args()

    # Environment setup
    env_path = args.env if hasattr(args, 'env') and args.env else ".env"
    if not os.path.exists(env_path):
        example_env = Path(__file__).parent / ".env.example"
        if example_env.exists():
            print(f"[*] .env not found at {os.path.abspath(env_path)}")
            print(f"[*] Copying {example_env} to {os.path.abspath(env_path)}")
            shutil.copy(example_env, env_path)
        else:
            print(f"[!] Warning: Neither {env_path} nor {example_env} found.")
    
    load_dotenv(env_path)

    if args.command == "start":
        print("\n" + "="*50)
        print("  VertiFlow - Smart Farm IoT Management Platform")
        print("="*50)

        import asyncio
        from sqlalchemy import text
        from sqlalchemy.ext.asyncio import create_async_engine
        
        db_url = os.getenv("DATABASE_URL")
        
        async def check_connectivity(url):
            if not url: return False
            try:
                # 3-second timeout to avoid hanging if Supabase is unreachable
                async def _attempt():
                    # We ensure we use the async driver if it's not specified
                    target_url = url
                    if target_url.startswith("postgresql://"):
                        target_url = target_url.replace("postgresql://", "postgresql+asyncpg://", 1)
                    
                    temp_engine = create_async_engine(target_url, connect_args={"timeout": 3})
                    try:
                        async with temp_engine.connect() as conn:
                            await conn.execute(text("SELECT 1"))
                        return True
                    finally:
                        await temp_engine.dispose()

                return await asyncio.wait_for(_attempt(), timeout=5.0)
            except Exception:
                return False

        print("[*] Connecting to Supabase Database...")
        if not asyncio.run(check_connectivity(db_url)):
            print("[!] Error: Could not connect to Supabase.")
            print(f"    Target: {db_url}")
            print("\n[?] Troubleshooting:")
            print("    1. Ensure your SUPABASE_URL and DATABASE_URL are correct in .env")
            print("    2. Check if your Supabase project is active/started.")
            print("    3. Ensure your local network allows outbound traffic to Supabase.")
            print("="*50 + "\n")
            sys.exit(1)
        
        print("[*] Database connected successfully.")
        print(f"[*] Starting server on {args.host}:{args.port}...")
        
        # Display the local URL
        display_host = "localhost" if args.host == "0.0.0.0" else args.host
        print(f"[*] Access the Web App at: http://{display_host}:{args.port}")
        print("="*50 + "\n")
        
        # Set uvicorn log_level to warning to reduce noise (except in dev mode)
        log_level = "info" if args.dev else "warning"
        try:
            uvicorn.run("vertiflow.main:app", host=args.host, port=args.port, reload=args.dev, log_level=log_level)
        except KeyboardInterrupt:
            print("\n" + "="*50)
            print("  Shutting down VertiFlow... Done.")
            print("="*50 + "\n")
            sys.exit(0)
    
    elif args.command == "check-db":
        print("[*] Checking database connection...")
        import asyncio
        from vertiflow.check_db import check
        asyncio.run(check())
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
