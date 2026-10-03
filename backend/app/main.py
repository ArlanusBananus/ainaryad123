import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, Base, SessionLocal
from .seed_data import seed_database
from .websocket_manager import ws_manager
from .routers import work_orders, users, equipment, catalogs, analytics

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all DB tables
    Base.metadata.create_all(bind=engine)
    # Seed initial test data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="НарядAI API",
    description="Интеллектуальная система выдачи и контроля нарядов АО «Костанайские Минералы»",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded photos
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for ping or client events
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# Include Routers
app.include_router(work_orders.router)
app.include_router(users.router)
app.include_router(equipment.router)
app.include_router(catalogs.router)
app.include_router(analytics.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": "НарядAI",
        "version": "1.0.0",
        "active_ws_connections": len(ws_manager.active_connections)
    }

@app.get("/")
def root():
    return {
        "message": "НарядAI API готов к работе",
        "docs": "/docs",
        "ws": "/ws"
    }
