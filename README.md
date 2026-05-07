# VertiFlow — Smart Farm Platform

>VertiFlow is an all-in-one ecosystem designed for the modern vertical farm. By merging real-time IoT monitoring with advanced data analytics, VertiFlow transforms raw environmental variables into a controllable, predictable, and highly efficient growth cycle.

## The Solution

Developed for UTMxHackathon '26, VertiFlow addresses the critical challenges of urban
agriculture: *Manual vertical farming is too resource-intensive and error-prone, leaving growers without affordable, automated tools to optimize yields and reduce waste.*

### Key Capabilities

→ **Utility-First Dashboard:** 
	A farmer’s biggest fear is waking up to a dead crop because a pump failed at 2 AM. Dashboard is a massive, straightforward System Health Status. If it's green, they can go get coffee. If it's red, they need to know exactly where the fire is.

→ **Real-Time Sensor Reading:**
	tracking of IoT sensors health, and real-time tracking of soil moisture, ambient humidity, temperature, and other IoT sensors added by the user. 

→ **Precision Control Engine:**
	Automated adjustments for LED light spectrums and hydroponic pump cycles tailored to specific plant growth profiles

→ **Analytical Report:**
	A centralized interface visualizing growth metrics and resource consumption trends for high-level crop oversight

## Tech Stack

```text
Backend    │  Python · FastAPI · Pydantic · WebSockets
Frontend   │  React · Vite · Tailwind CSS · shadcn/ui
```

## Golden State Targets

Default: 

| Sensor          | Optimal Range   | Target   |
| --------------- | --------------- | -------- |
| pH              | 5.8 - 6.8       | 6.2      |
| EC              | 1.4 – 2.2 mS/cm | 1.8      |
| Air Temperature | 20 – 28 °C      | 24 °C    |
| Humidity        | 55 – 75 %       | 65 %     |
| Light           | 350 – 650 µmol  | 500 µmol |
| CO₂             | *LATER*         | *LATER*  |
