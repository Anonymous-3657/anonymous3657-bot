import logging
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import APIRouter, FastAPI, Request  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from auth import seed_admin  # noqa: E402
from database import close_client, ensure_indexes  # noqa: E402
from routers import (admin, ai, auth_routes, catalog, exams, meta, pdfs,  # noqa: E402
                     resources, student)
from storage import init_storage  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="CG Student Portal API", version="0.2.0")


# Kubernetes probes call /health without the /api prefix, so expose it at both paths.
@app.get("/health")
async def container_health():
    return {"status": "ok"}


api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "CG Student Portal API", "version": "0.2.0"}


api_router.include_router(meta.router)
api_router.include_router(catalog.router)
api_router.include_router(resources.router)
api_router.include_router(auth_routes.router)
api_router.include_router(student.router)
api_router.include_router(ai.router)
api_router.include_router(exams.router)
api_router.include_router(pdfs.router)
api_router.include_router(pdfs.admin_router)
api_router.include_router(admin.router)
app.include_router(api_router)

# Credentialed requests cannot use a literal "*" origin, so reflect the caller's
# origin instead when CORS_ORIGINS is left open.
_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
if "*" in _origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.on_event("startup")
async def on_startup():
    """Never block startup: a slow or unreachable Atlas cluster must not stop the
    container from answering health probes."""
    try:
        await ensure_indexes()
        result = await seed_admin()
        logger.info("Indexes ensured; admin seed: %s", result)
        from seed_colleges import run as seed_colleges
        logger.info("College master seed: %s", await seed_colleges())
    except Exception:
        logger.exception("Startup bootstrap failed; API will still serve requests")
    try:
        init_storage()
        logger.info("Object storage initialised")
    except Exception:
        logger.exception("Startup bootstrap failed; API will still serve requests")


@app.on_event("shutdown")
async def on_shutdown():
    close_client()
