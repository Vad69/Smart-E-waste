from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlmodel import SQLModel, Field, Session, create_engine, select
from typing import Optional, List
import datetime
import qrcode
import io

# Database setup
DATABASE_URL = "sqlite:///database.db"
engine = create_engine(DATABASE_URL, echo=False)


# Models
class Department(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str


class EWasteItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    category: str  # recyclable | reusable | hazardous
    department_id: Optional[int] = Field(default=None, foreign_key="department.id")
    date_added: datetime.date = Field(default_factory=datetime.date.today)
    status: str = Field(default="reported")  # reported | scheduled | picked_up | disposed


class Campaign(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    start_date: datetime.date
    end_date: datetime.date
    points_per_item: int = 10


# Application instance
app = FastAPI(title="Smart E-Waste Management System", version="0.1.0")


# Database helpers
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


def get_session():
    with Session(engine) as session:
        yield session


# Department Endpoints
@app.post("/departments", response_model=Department)
def create_department(department: Department, session: Session = Depends(get_session)):
    session.add(department)
    session.commit()
    session.refresh(department)
    return department


@app.get("/departments", response_model=List[Department])
def read_departments(session: Session = Depends(get_session)):
    return session.exec(select(Department)).all()


# E-Waste Item Endpoints
@app.post("/items", response_model=EWasteItem)
def create_item(item: EWasteItem, session: Session = Depends(get_session)):
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@app.get("/items", response_model=List[EWasteItem])
def read_items(session: Session = Depends(get_session)):
    return session.exec(select(EWasteItem)).all()


@app.get("/items/{item_id}", response_model=EWasteItem)
def read_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(EWasteItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@app.put("/items/{item_id}", response_model=EWasteItem)
def update_item(item_id: int, updates: EWasteItem, session: Session = Depends(get_session)):
    db_item = session.get(EWasteItem, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    item_data = updates.dict(exclude_unset=True)
    for key, value in item_data.items():
        setattr(db_item, key, value)
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


@app.delete("/items/{item_id}")
def delete_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(EWasteItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    session.delete(item)
    session.commit()
    return {"ok": True}


# QR Code Endpoint
@app.get("/items/{item_id}/qr")
def generate_qr(item_id: int, session: Session = Depends(get_session)):
    item = session.get(EWasteItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    qr_data = f"EW-{item.id}-{item.name}-{item.category}"
    qr = qrcode.QRCode(box_size=10, border=4)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


# Analytics & Reporting
@app.get("/dashboard/stats")
def dashboard_stats(session: Session = Depends(get_session)):
    items = session.exec(select(EWasteItem)).all()
    total_items = len(items)
    categories = {}
    for itm in items:
        categories[itm.category] = categories.get(itm.category, 0) + 1
    hazardous_count = categories.get("hazardous", 0)
    return {
        "total_items": total_items,
        "items_by_category": categories,
        "hazardous_count": hazardous_count,
    }


@app.get("/reports/compliance")
def compliance_report(session: Session = Depends(get_session)):
    items = session.exec(select(EWasteItem)).all()
    today = datetime.date.today()
    one_year_old = [itm for itm in items if (today - itm.date_added).days > 365]
    return {
        "items_older_than_one_year": len(one_year_old),
        "list": one_year_old,
    }


# Campaign Endpoints
@app.post("/campaigns", response_model=Campaign)
def create_campaign(campaign: Campaign, session: Session = Depends(get_session)):
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign


@app.get("/campaigns", response_model=List[Campaign])
def read_campaigns(session: Session = Depends(get_session)):
    return session.exec(select(Campaign)).all()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)