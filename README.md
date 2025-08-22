# Smart E-Waste Management System (HH302)

This project is a hackathon-ready prototype that demonstrates the core features of a **Smart E-Waste Management Portal** for residential complexes, academic campuses, and similar institutions.

## Features Implemented
1. **Centralized E-Waste Inventory** – CRUD APIs to log, track, and manage disposal of e-waste items by department and category.
2. **QR Code Tagging** – Each item can be retrieved as a QR code image for easy on-ground scanning and tracking.
3. **Smart Categorization & Scheduling (Stub)** – Category field in the model with endpoints ready for future scheduling logic.
4. **Compliance & Reporting** – Endpoint to generate a quick compliance snapshot (items older than a year, etc.).
5. **User Engagement / Campaigns** – Simple campaign model to kick-off challenges and drives.
6. **Analytics Dashboard** – Aggregated stats endpoint with total items, category breakdown, and hazardous count.

> The code is written with **FastAPI** + **SQLModel** for rapid development and comes with interactive Swagger docs out-of-the-box.

## Technology Stack
- Python 3.9+
- FastAPI (web framework)
- SQLModel + SQLite (persistence)
- Uvicorn (ASGI server)
- qrcode & pillow (QR generation)

## Getting Started
```bash
# 1. Clone / copy the repo then cd into it
cd /workspace

# 2. Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the application
uvicorn main:app --reload  # http://localhost:8000
```

Open your browser at `http://localhost:8000/docs` to explore the automatically generated Swagger UI.

## Example Workflows
### 1. Add a Department
```bash
curl -X POST http://localhost:8000/departments \
     -H "Content-Type: application/json" \
     -d '{"name": "Physics Lab"}'
```

### 2. Register an E-Waste Item
```bash
curl -X POST http://localhost:8000/items \
     -H "Content-Type: application/json" \
     -d '{"name": "Old Oscilloscope", "category": "recyclable", "department_id": 1}'
```

### 3. Get the Item QR Code
Visit `http://localhost:8000/items/1/qr` in the browser or download via curl:
```bash
curl -o oscilloscope.png http://localhost:8000/items/1/qr
```

## Roadmap / Next Steps
- Scheduling engine to automatically assign pickups to registered vendors based on category & volume.
- Authentication module (OAuth2 / JWT) to differentiate student, department, and admin roles.
- Front-end React / Next.js dashboard consuming these APIs.
- Real-time green scoreboard & leaderboards.
- Exportable compliance PDF reports.

Happy hacking! 🎉