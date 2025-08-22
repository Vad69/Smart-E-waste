from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import qrcode
import io
import base64
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///ewaste.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-string')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    department = db.Column(db.String(100))
    role = db.Column(db.String(20), default='user')  # user, admin, vendor
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class EWasteItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    qr_code = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # computer, mobile, battery, etc.
    subcategory = db.Column(db.String(50))
    department = db.Column(db.String(100))
    location = db.Column(db.String(200))
    condition = db.Column(db.String(20))  # working, non-working, damaged
    classification = db.Column(db.String(20))  # recyclable, reusable, hazardous
    age_years = db.Column(db.Integer)
    weight_kg = db.Column(db.Float)
    status = db.Column(db.String(20), default='registered')  # registered, collected, processed, recycled
    reported_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Vendor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    contact_person = db.Column(db.String(100))
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    specialization = db.Column(db.String(200))  # types of e-waste they handle
    certification = db.Column(db.String(100))
    rating = db.Column(db.Float, default=0.0)
    active = db.Column(db.Boolean, default=True)

class Collection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    scheduled_date = db.Column(db.DateTime)
    location = db.Column(db.String(200))
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendor.id'))
    status = db.Column(db.String(20), default='scheduled')  # scheduled, in_progress, completed
    items_collected = db.Column(db.Integer, default=0)
    total_weight = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Campaign(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    campaign_type = db.Column(db.String(50))  # awareness, collection, challenge
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    target_participants = db.Column(db.Integer)
    actual_participants = db.Column(db.Integer, default=0)
    reward_points = db.Column(db.Integer, default=0)
    active = db.Column(db.Boolean, default=True)

class UserPoints(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    points = db.Column(db.Integer, default=0)
    level = db.Column(db.String(20), default='Bronze')
    items_reported = db.Column(db.Integer, default=0)
    campaigns_participated = db.Column(db.Integer, default=0)

# Helper Functions
def generate_qr_code(data):
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return img_base64

def classify_item(category, age_years, condition):
    """Auto-classify items based on category, age, and condition"""
    if category.lower() in ['battery', 'crt_monitor', 'tube_light']:
        return 'hazardous'
    elif condition == 'working' and age_years <= 3:
        return 'reusable'
    else:
        return 'recyclable'

# Authentication Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already exists'}), 400
    
    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        department=data.get('department', ''),
        role=data.get('role', 'user')
    )
    
    db.session.add(user)
    db.session.commit()
    
    # Create user points record
    user_points = UserPoints(user_id=user.id)
    db.session.add(user_points)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
        access_token = create_access_token(identity=user.id)
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'department': user.department,
                'role': user.role
            }
        })
    
    return jsonify({'message': 'Invalid credentials'}), 401

# E-Waste Management Routes
@app.route('/api/items', methods=['POST'])
@jwt_required()
def add_item():
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Generate unique QR code
    qr_code = f"EW{datetime.now().strftime('%Y%m%d%H%M%S')}{user_id}"
    
    # Auto-classify item
    classification = classify_item(
        data['category'], 
        data.get('age_years', 0), 
        data.get('condition', 'unknown')
    )
    
    item = EWasteItem(
        qr_code=qr_code,
        name=data['name'],
        category=data['category'],
        subcategory=data.get('subcategory', ''),
        department=data.get('department', ''),
        location=data.get('location', ''),
        condition=data.get('condition', 'unknown'),
        classification=classification,
        age_years=data.get('age_years', 0),
        weight_kg=data.get('weight_kg', 0.0),
        reported_by=user_id
    )
    
    db.session.add(item)
    db.session.commit()
    
    # Update user points
    user_points = UserPoints.query.filter_by(user_id=user_id).first()
    user_points.points += 10
    user_points.items_reported += 1
    
    # Update level based on points
    if user_points.points >= 500:
        user_points.level = 'Gold'
    elif user_points.points >= 200:
        user_points.level = 'Silver'
    
    db.session.commit()
    
    # Generate QR code image
    qr_image = generate_qr_code(qr_code)
    
    return jsonify({
        'message': 'Item added successfully',
        'item_id': item.id,
        'qr_code': qr_code,
        'qr_image': qr_image,
        'classification': classification
    }), 201

@app.route('/api/items', methods=['GET'])
@jwt_required()
def get_items():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    category = request.args.get('category')
    status = request.args.get('status')
    department = request.args.get('department')
    
    query = EWasteItem.query
    
    if category:
        query = query.filter_by(category=category)
    if status:
        query = query.filter_by(status=status)
    if department:
        query = query.filter_by(department=department)
    
    items = query.order_by(EWasteItem.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'items': [{
            'id': item.id,
            'qr_code': item.qr_code,
            'name': item.name,
            'category': item.category,
            'subcategory': item.subcategory,
            'department': item.department,
            'location': item.location,
            'condition': item.condition,
            'classification': item.classification,
            'age_years': item.age_years,
            'weight_kg': item.weight_kg,
            'status': item.status,
            'created_at': item.created_at.isoformat(),
            'updated_at': item.updated_at.isoformat()
        } for item in items.items],
        'total': items.total,
        'pages': items.pages,
        'current_page': page
    })

@app.route('/api/items/<qr_code>', methods=['GET'])
def get_item_by_qr(qr_code):
    item = EWasteItem.query.filter_by(qr_code=qr_code).first()
    
    if not item:
        return jsonify({'message': 'Item not found'}), 404
    
    user = User.query.get(item.reported_by)
    
    return jsonify({
        'id': item.id,
        'qr_code': item.qr_code,
        'name': item.name,
        'category': item.category,
        'subcategory': item.subcategory,
        'department': item.department,
        'location': item.location,
        'condition': item.condition,
        'classification': item.classification,
        'age_years': item.age_years,
        'weight_kg': item.weight_kg,
        'status': item.status,
        'reported_by': user.username if user else 'Unknown',
        'created_at': item.created_at.isoformat(),
        'updated_at': item.updated_at.isoformat()
    })

@app.route('/api/items/<int:item_id>/status', methods=['PUT'])
@jwt_required()
def update_item_status():
    data = request.get_json()
    item_id = request.view_args['item_id']
    
    item = EWasteItem.query.get_or_404(item_id)
    item.status = data['status']
    item.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({'message': 'Status updated successfully'})

# Vendor Management
@app.route('/api/vendors', methods=['GET'])
@jwt_required()
def get_vendors():
    vendors = Vendor.query.filter_by(active=True).all()
    return jsonify([{
        'id': vendor.id,
        'name': vendor.name,
        'contact_person': vendor.contact_person,
        'email': vendor.email,
        'phone': vendor.phone,
        'specialization': vendor.specialization,
        'certification': vendor.certification,
        'rating': vendor.rating
    } for vendor in vendors])

@app.route('/api/vendors', methods=['POST'])
@jwt_required()
def add_vendor():
    data = request.get_json()
    
    vendor = Vendor(
        name=data['name'],
        contact_person=data.get('contact_person'),
        email=data.get('email'),
        phone=data.get('phone'),
        specialization=data.get('specialization'),
        certification=data.get('certification')
    )
    
    db.session.add(vendor)
    db.session.commit()
    
    return jsonify({'message': 'Vendor added successfully'}), 201

# Collection Management
@app.route('/api/collections', methods=['GET'])
@jwt_required()
def get_collections():
    collections = Collection.query.order_by(Collection.scheduled_date.desc()).all()
    return jsonify([{
        'id': collection.id,
        'title': collection.title,
        'description': collection.description,
        'scheduled_date': collection.scheduled_date.isoformat() if collection.scheduled_date else None,
        'location': collection.location,
        'vendor_id': collection.vendor_id,
        'status': collection.status,
        'items_collected': collection.items_collected,
        'total_weight': collection.total_weight,
        'created_at': collection.created_at.isoformat()
    } for collection in collections])

@app.route('/api/collections', methods=['POST'])
@jwt_required()
def schedule_collection():
    data = request.get_json()
    
    collection = Collection(
        title=data['title'],
        description=data.get('description'),
        scheduled_date=datetime.fromisoformat(data['scheduled_date']),
        location=data['location'],
        vendor_id=data.get('vendor_id')
    )
    
    db.session.add(collection)
    db.session.commit()
    
    return jsonify({'message': 'Collection scheduled successfully'}), 201

# Campaign Management
@app.route('/api/campaigns', methods=['GET'])
def get_campaigns():
    campaigns = Campaign.query.filter_by(active=True).order_by(Campaign.start_date.desc()).all()
    return jsonify([{
        'id': campaign.id,
        'title': campaign.title,
        'description': campaign.description,
        'campaign_type': campaign.campaign_type,
        'start_date': campaign.start_date.isoformat() if campaign.start_date else None,
        'end_date': campaign.end_date.isoformat() if campaign.end_date else None,
        'target_participants': campaign.target_participants,
        'actual_participants': campaign.actual_participants,
        'reward_points': campaign.reward_points
    } for campaign in campaigns])

@app.route('/api/campaigns', methods=['POST'])
@jwt_required()
def create_campaign():
    data = request.get_json()
    
    campaign = Campaign(
        title=data['title'],
        description=data.get('description'),
        campaign_type=data['campaign_type'],
        start_date=datetime.fromisoformat(data['start_date']),
        end_date=datetime.fromisoformat(data['end_date']),
        target_participants=data.get('target_participants', 0),
        reward_points=data.get('reward_points', 0)
    )
    
    db.session.add(campaign)
    db.session.commit()
    
    return jsonify({'message': 'Campaign created successfully'}), 201

# Analytics and Dashboard
@app.route('/api/analytics/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_analytics():
    # Basic statistics
    total_items = EWasteItem.query.count()
    items_by_status = db.session.query(
        EWasteItem.status, 
        db.func.count(EWasteItem.id)
    ).group_by(EWasteItem.status).all()
    
    items_by_category = db.session.query(
        EWasteItem.category,
        db.func.count(EWasteItem.id)
    ).group_by(EWasteItem.category).all()
    
    items_by_classification = db.session.query(
        EWasteItem.classification,
        db.func.count(EWasteItem.id)
    ).group_by(EWasteItem.classification).all()
    
    total_weight = db.session.query(db.func.sum(EWasteItem.weight_kg)).scalar() or 0
    
    # Monthly trends (last 6 months)
    six_months_ago = datetime.now() - timedelta(days=180)
    monthly_items = db.session.query(
        db.func.strftime('%Y-%m', EWasteItem.created_at).label('month'),
        db.func.count(EWasteItem.id).label('count')
    ).filter(
        EWasteItem.created_at >= six_months_ago
    ).group_by(
        db.func.strftime('%Y-%m', EWasteItem.created_at)
    ).all()
    
    return jsonify({
        'total_items': total_items,
        'total_weight_kg': float(total_weight),
        'items_by_status': dict(items_by_status),
        'items_by_category': dict(items_by_category),
        'items_by_classification': dict(items_by_classification),
        'monthly_trends': [{'month': m[0], 'count': m[1]} for m in monthly_items],
        'active_campaigns': Campaign.query.filter_by(active=True).count(),
        'registered_vendors': Vendor.query.filter_by(active=True).count()
    })

# Leaderboard
@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    top_users = db.session.query(
        User.username,
        User.department,
        UserPoints.points,
        UserPoints.level,
        UserPoints.items_reported
    ).join(UserPoints).order_by(UserPoints.points.desc()).limit(10).all()
    
    return jsonify([{
        'username': user[0],
        'department': user[1],
        'points': user[2],
        'level': user[3],
        'items_reported': user[4]
    } for user in top_users])

# User Profile
@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    user_points = UserPoints.query.filter_by(user_id=user_id).first()
    
    return jsonify({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'department': user.department,
            'role': user.role
        },
        'points': {
            'total_points': user_points.points,
            'level': user_points.level,
            'items_reported': user_points.items_reported,
            'campaigns_participated': user_points.campaigns_participated
        }
    })

# Compliance Reports
@app.route('/api/reports/compliance', methods=['GET'])
@jwt_required()
def generate_compliance_report():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = EWasteItem.query
    
    if start_date:
        query = query.filter(EWasteItem.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(EWasteItem.created_at <= datetime.fromisoformat(end_date))
    
    items = query.all()
    
    # Generate PDF report
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    p.drawString(100, 750, "E-Waste Management Compliance Report")
    p.drawString(100, 730, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    p.drawString(100, 710, f"Total Items: {len(items)}")
    
    y_position = 680
    for item in items[:20]:  # Limit to first 20 items
        p.drawString(100, y_position, f"{item.qr_code} - {item.name} - {item.status}")
        y_position -= 20
        if y_position < 100:
            break
    
    p.save()
    buffer.seek(0)
    
    return send_file(
        io.BytesIO(buffer.read()),
        mimetype='application/pdf',
        as_attachment=True,
        download_name='compliance_report.pdf'
    )

# Initialize database
@app.before_first_request
def create_tables():
    db.create_all()
    
    # Create default admin user
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            email='admin@ewaste.com',
            password_hash=generate_password_hash('admin123'),
            department='IT',
            role='admin'
        )
        db.session.add(admin)
        
        admin_points = UserPoints(user_id=1)
        db.session.add(admin_points)
        
        # Add sample vendors
        vendors = [
            Vendor(name='EcoRecycle Solutions', contact_person='John Doe', 
                  email='john@ecorecycle.com', phone='9876543210',
                  specialization='Computers, Laptops, Servers', 
                  certification='CPCB Authorized'),
            Vendor(name='Green Tech Recycling', contact_person='Jane Smith',
                  email='jane@greentech.com', phone='9876543211',
                  specialization='Mobile Devices, Batteries, Accessories',
                  certification='E-Waste Management License')
        ]
        
        for vendor in vendors:
            db.session.add(vendor)
        
        db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)