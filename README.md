# Device Gateway UI

A web-based user interface for managing and monitoring the device gateway operations.

## Features

- **Device Status Management**: Monitor and change device status (active/inactive/maintenance)
- **QUBEx Configuration**: Download configuration from QDash API
- **Device Topology**: Generate and visualize device topology
- **Real-time Operations**: Execute operations with live feedback and logs

## Architecture

- **Backend**: FastAPI with Python (using uv for dependency management)
- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Integration**: Direct shell script execution for device gateway operations

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- uv (Python package manager)
- device-gateway project in the parent directory

### Development

1. **Start Backend**:
   ```bash
   cd backend
   uv sync
   uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Access the UI**: Open http://localhost:3000

### Docker Compose

```bash
docker-compose up --build
```

## Configuration

### Backend (.env)

```env
QDASH_API_URL=http://localhost:6004/api
DEVICE_GATEWAY_PATH=../../device-gateway
CONFIG_PATH=../../device-gateway/config
SCRIPTS_PATH=../../device-gateway/scripts
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/config/download-qubex` - Download QUBEx configuration
- `POST /api/topology/generate` - Generate device topology
- `GET /api/device/status` - Get device status
- `POST /api/device/status` - Change device status
- `GET /api/config/topology/image` - Get topology image

## Development Notes

- Backend uses async/await for non-blocking shell script execution
- Frontend uses client-side rendering with React hooks
- Error handling includes both success and failure states with detailed logs
- Responsive design works on desktop and mobile devices