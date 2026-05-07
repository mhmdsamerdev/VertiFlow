# VertiFlow - Development Guide

## Stack

| Layer    | Tech                                                      |
|----------|-----------------------------------------------------------|
| Backend  | FastAPI · Pydantic v2 · SQLAlchemy (Async) · WebSockets   |
| Frontend | React · Vite · Tailwind CSS |

## Quick Start

### One-Time Installation

```bash
cd backend
python -m venv .venv ## One-Time Installation
pip install -r requirements.txt ## One-Time Installation
```

```bash
cd frontend
npm install
```

### Run Server

First Terminal:
```bash
cd backend
.venv\Scripts\activate && uvicorn app.main:app --reload --port 8000
```

Second Terminal:
```bash
cd frontend
\npm run dev
```

WebSocket stream → `ws://localhost:8000/ws/telemetry`  
Health check → `http://localhost:8000/health`
**Dashboard** → `http://localhost:5173`

## Architecture

```
VertiFlow/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI app + CORS
│       ├── core/config.py       # Pydantic Settings
│       ├── models/schemas.py    # Pydantic v2 data models
│       └── routers/telemetry.py # /ws/telemetry WebSocket endpoint
└── frontend/
    └── src/
        ├── types/telemetry.ts           # Shared TypeScript types
        ├── hooks/
        │   ├── useWebSocket.ts          # WS connection + auto-reconnect
        │   └── useTelemetry.ts          # History buffer + recipe scoring
        └── components/
            ├── layout/
            │   ├── DashboardLayout.tsx  # Shell + connection overlays
            │   └── Sidebar.tsx          # Slim icon sidebar
            ├── sensors/
            │   ├── SensorGrid.tsx       # 8-card responsive grid
            │   └── SensorCard.tsx       # Sparkline + match bar + status
            ├── controls/
            │   └── ControlPanel.tsx     # Neon toggle actuator panel
            └── insights/
                ├── RecipeMatch.tsx      # SVG arc gauge + per-sensor bars
                └── AIInsights.tsx       # Typing animation recommendations
```

### Data Model

```
Farm → Zones → PlantProfiles (Golden State recipe)
                          ↓
                    Sensors ──► SensorReadings (telemetry)
                    Actuators (stateful toggles)
```

### WebSocket Payload

```json
{
  "timestamp": "2025-05-07T00:00:00Z",
  "farm_id": "farm-001",
  "zone_id": "zone-alpha",
  "readings": {
    "ph": 6.24, "ec": 1.81, "water_temp": 22.1,
    "air_temp": 23.8, "humidity": 64.5, "water_level": 85.3,
    "light_intensity": 448.0, "dissolved_oxygen": 7.18
  },
  "actuators": {
    "oxygen_pump": true, "led_array": true, "nutrient_doser": false
  }
}
```

### 