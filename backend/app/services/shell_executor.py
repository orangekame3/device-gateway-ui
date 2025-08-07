import asyncio
import subprocess
from pathlib import Path
from typing import Tuple, Optional
import os
from ..config import settings


class ShellExecutor:
    def __init__(self):
        self.device_gateway_path = Path(settings.device_gateway_path).resolve()
        self.scripts_path = self.device_gateway_path / "scripts"
        
    async def execute_script(
        self, 
        script_name: str, 
        args: Optional[list[str]] = None,
        env_vars: Optional[dict[str, str]] = None
    ) -> Tuple[bool, str, str]:
        """Execute a shell script and return success status, stdout, and stderr"""
        script_path = self.scripts_path / script_name
        
        if not script_path.exists():
            return False, "", f"Script not found: {script_path}"
        
        # Prepare environment
        env = os.environ.copy()
        if env_vars:
            env.update(env_vars)
        
        # Set QDASH_API_URL if not provided
        if "QDASH_API_URL" not in env:
            env["QDASH_API_URL"] = settings.qdash_api_url
        
        # Prepare command
        cmd = ["bash", str(script_path)]
        if args:
            cmd.extend(args)
        
        try:
            # Run script asynchronously
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.device_gateway_path),
                env=env
            )
            
            stdout, stderr = await process.communicate()
            
            return (
                process.returncode == 0,
                stdout.decode("utf-8"),
                stderr.decode("utf-8")
            )
        except Exception as e:
            return False, "", str(e)
    
    async def download_qubex_config(self) -> Tuple[bool, str, str]:
        """Download QUBEx configuration"""
        return await self.execute_script("qubex_config_downloader.sh")
    
    async def generate_device_topology(self) -> Tuple[bool, str, str]:
        """Generate device topology"""
        return await self.execute_script("device_topology_generator.sh")
    
    async def change_device_status(self, status: str) -> Tuple[bool, str, str]:
        """Change device status to active, inactive, or maintenance"""
        script_map = {
            "active": "change_status_to_active.sh",
            "inactive": "change_status_to_inactive.sh",
            "maintenance": "change_status_to_maintenance.sh"
        }
        
        if status not in script_map:
            return False, "", f"Invalid status: {status}"
        
        return await self.execute_script(script_map[status])
    
    async def get_device_status(self) -> Optional[str]:
        """Read current device status"""
        status_file = self.device_gateway_path / "config" / "device_status"
        
        try:
            if status_file.exists():
                return status_file.read_text().strip()
            return None
        except Exception:
            return None