import os
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def run_diagnostics():
    print("--- Chidipothu Hub Diagnostics ---")
    
    # Check .env
    env_path = 'backend/.env'
    if not os.path.exists(env_path):
        print("[ERROR] backend/.env file not found!")
        return

    load_dotenv(env_path)
    print("[OK] backend/.env found.")

    # Check MongoDB
    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        print("[ERROR] MONGO_URL not set in .env")
    else:
        try:
            print(f"Connecting to MongoDB...")
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
            await client.admin.command('ismaster')
            print("[OK] MongoDB connection successful.")
            db_name = os.getenv("DB_NAME", "chidipothu_hub")
            db = client[db_name]
            count = await db.properties.count_documents({})
            print(f"[OK] Found {count} properties in database.")
            client.close()
        except Exception as e:
            print(f"[ERROR] MongoDB connection failed: {e}")

    # Check Cloudinary
    c_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    if not c_name or "your_" in c_name:
        print("[WARNING] Cloudinary config looks like a placeholder.")
    else:
        print("[OK] Cloudinary config found.")

    # Check Ports
    import socket
    def is_port_in_use(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0

    if is_port_in_use(8001):
        print("[WARNING] Port 8001 is already in use. Backend might fail to start if it's another app.")
    else:
        print("[OK] Port 8001 is available.")

    print("\nDiagnostics complete.")

if __name__ == "__main__":
    asyncio.run(run_diagnostics())
