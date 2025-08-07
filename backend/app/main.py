from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import yaml
from pathlib import Path

from .config import settings
from .models import ExecutionResult, DeviceStatus, ChangeStatusRequest
from .services.shell_executor import ShellExecutor
from .routers import scheduler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Device Gateway UI API")
    
    # Initialize database tables
    try:
        from .database_init import create_tables
        await create_tables()
        logger.info("Database tables initialized")
    except Exception as e:
        logger.warning(f"Database initialization failed (this is okay for development): {e}")
    
    yield
    # Shutdown
    logger.info("Shutting down Device Gateway UI API")


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
shell_executor = ShellExecutor()

# Include routers
app.include_router(scheduler.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": settings.app_name}


@app.post("/api/config/download-qubex", response_model=ExecutionResult)
async def download_qubex_config():
    """Download QUBEx configuration from QDash API"""
    logger.info("Downloading QUBEx configuration")
    
    success, stdout, stderr = await shell_executor.download_qubex_config()
    
    if not success:
        logger.error(f"Failed to download QUBEx config: {stderr}")
        raise HTTPException(status_code=500, detail=stderr or "Failed to download configuration")
    
    return ExecutionResult(
        success=success,
        stdout=stdout,
        stderr=stderr,
        message="QUBEx configuration downloaded successfully"
    )


@app.post("/api/topology/generate", response_model=ExecutionResult)
async def generate_device_topology():
    """Generate device topology"""
    logger.info("Generating device topology")
    
    success, stdout, stderr = await shell_executor.generate_device_topology()
    
    if not success:
        logger.error(f"Failed to generate topology: {stderr}")
        raise HTTPException(status_code=500, detail=stderr or "Failed to generate topology")
    
    return ExecutionResult(
        success=success,
        stdout=stdout,
        stderr=stderr,
        message="Device topology generated successfully"
    )


@app.get("/api/device/status", response_model=DeviceStatus)
async def get_device_status():
    """Get current device status"""
    status = await shell_executor.get_device_status()
    
    if status is None:
        return DeviceStatus(
            status=None,
            message="Device status not set"
        )
    
    return DeviceStatus(status=status)


@app.post("/api/device/status", response_model=ExecutionResult)
async def change_device_status(request: ChangeStatusRequest):
    """Change device status"""
    logger.info(f"Changing device status to: {request.status}")
    
    success, stdout, stderr = await shell_executor.change_device_status(request.status)
    
    if not success:
        logger.error(f"Failed to change status: {stderr}")
        raise HTTPException(status_code=500, detail=stderr or "Failed to change device status")
    
    return ExecutionResult(
        success=success,
        stdout=stdout,
        stderr=stderr,
        message=f"Device status changed to {request.status}"
    )


@app.get("/api/config/topology/image")
async def get_topology_image():
    """Get device topology image if available"""
    from fastapi.responses import FileResponse
    from pathlib import Path
    
    image_path = Path(settings.config_path) / "device_topology.png"
    
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Topology image not found. Generate topology first.")
    
    return FileResponse(
        path=str(image_path),
        media_type="image/png",
        filename="device_topology.png"
    )


@app.get("/api/config/environment")
async def get_environment_info():
    """Get current environment information from config"""
    try:
        config_file = Path(settings.config_path) / "config.yaml"
        
        if not config_file.exists():
            raise HTTPException(status_code=404, detail="Config file not found")
        
        with open(config_file, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        device_info = config.get('device_info', {})
        plugin_info = config.get('plugin', {})
        
        # Determine environment type based on device_id
        device_id = device_info.get('device_id', 'unknown')
        provider_id = device_info.get('provider_id', 'unknown')
        plugin_name = plugin_info.get('name', 'unknown')
        
        # Map device_id to environment information
        environment_map = {
            'qulacs': {
                'name': 'Simulation Environment',
                'type': 'simulation',
                'description': 'Qulacs quantum circuit simulator',
                'color': 'blue'
            },
            'anemone': {
                'name': 'QiQb Real Hardware',
                'type': 'hardware',
                'description': 'Real quantum computer (Anemone)',
                'color': 'green'
            },
            'default': {
                'name': 'Unknown Environment',
                'type': 'unknown',
                'description': f'Device: {device_id}',
                'color': 'gray'
            }
        }
        
        environment = environment_map.get(device_id, environment_map['default'])
        
        return {
            'device_id': device_id,
            'provider_id': provider_id,
            'plugin_name': plugin_name,
            'max_qubits': device_info.get('max_qubits', 0),
            'max_shots': device_info.get('max_shots', 0),
            'environment': environment
        }
        
    except yaml.YAMLError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse config file: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read environment info: {str(e)}")


@app.get("/api/config/yaml")
async def get_config_yaml():
    """Get the raw config.yaml content"""
    try:
        config_file = Path(settings.config_path) / "config.yaml"
        
        if not config_file.exists():
            raise HTTPException(status_code=404, detail="Config file not found")
        
        with open(config_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return {"content": content}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read config file: {str(e)}")


@app.post("/api/config/yaml")
async def update_config_yaml(request: dict):
    """Update the config.yaml file"""
    try:
        content = request.get('content')
        if not content:
            raise HTTPException(status_code=400, detail="Content is required")
        
        # Validate YAML syntax before saving
        try:
            yaml.safe_load(content)
        except yaml.YAMLError as e:
            raise HTTPException(status_code=400, detail=f"Invalid YAML syntax: {str(e)}")
        
        config_file = Path(settings.config_path) / "config.yaml"
        
        # Create backup before updating
        backup_file = config_file.with_suffix('.yaml.backup')
        if config_file.exists():
            import shutil
            shutil.copy2(config_file, backup_file)
        
        # Write new content
        with open(config_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        logger.info("Config file updated successfully")
        return {"message": "Config file updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update config file: {str(e)}")


@app.get("/api/config/topology-request")
async def get_topology_request():
    """Get the device_topology_request.json content"""
    try:
        request_file = Path(settings.config_path) / "device_topology_request.json"
        
        if not request_file.exists():
            raise HTTPException(status_code=404, detail="Topology request file not found")
        
        with open(request_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return {"content": content}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read topology request file: {str(e)}")


@app.post("/api/config/topology-request")
async def update_topology_request(request: dict):
    """Update the device_topology_request.json file"""
    try:
        content = request.get('content')
        if not content:
            raise HTTPException(status_code=400, detail="Content is required")
        
        # Validate JSON syntax before saving
        try:
            import json
            json.loads(content)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON syntax: {str(e)}")
        
        request_file = Path(settings.config_path) / "device_topology_request.json"
        
        # Create backup before updating
        backup_file = request_file.with_suffix('.json.backup')
        if request_file.exists():
            import shutil
            shutil.copy2(request_file, backup_file)
        
        # Write new content
        with open(request_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        logger.info("Topology request file updated successfully")
        return {"message": "Topology request file updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update topology request file: {str(e)}")


@app.post("/api/topology/download-and-generate", response_model=ExecutionResult)
async def download_config_and_generate_topology():
    """Download QUBEx config and generate device topology in sequence"""
    logger.info("Starting combined download config and generate topology operation")
    
    all_stdout = []
    all_stderr = []
    
    try:
        # Step 1: Download QUBEx config
        logger.info("Step 1: Downloading QUBEx configuration")
        success1, stdout1, stderr1 = await shell_executor.download_qubex_config()
        all_stdout.append(f"=== Download QUBEx Config ===\n{stdout1}")
        all_stderr.append(stderr1)
        
        if not success1:
            logger.error(f"Failed to download QUBEx config: {stderr1}")
            return ExecutionResult(
                success=False,
                stdout="\n".join(all_stdout),
                stderr="\n".join(all_stderr),
                message="Failed at step 1: Download QUBEx configuration"
            )
        
        # Step 2: Generate device topology
        logger.info("Step 2: Generating device topology")
        success2, stdout2, stderr2 = await shell_executor.generate_device_topology()
        all_stdout.append(f"\n=== Generate Device Topology ===\n{stdout2}")
        all_stderr.append(stderr2)
        
        if not success2:
            logger.error(f"Failed to generate topology: {stderr2}")
            return ExecutionResult(
                success=False,
                stdout="\n".join(all_stdout),
                stderr="\n".join(all_stderr),
                message="Failed at step 2: Generate device topology (config download succeeded)"
            )
        
        logger.info("Combined operation completed successfully")
        return ExecutionResult(
            success=True,
            stdout="\n".join(all_stdout),
            stderr="\n".join(all_stderr),
            message="Successfully downloaded QUBEx config and generated device topology"
        )
        
    except Exception as e:
        logger.error(f"Unexpected error during combined operation: {str(e)}")
        return ExecutionResult(
            success=False,
            stdout="\n".join(all_stdout),
            stderr="\n".join(all_stderr) + [str(e)],
            message=f"Unexpected error: {str(e)}"
        )