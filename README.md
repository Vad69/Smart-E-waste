# Smart E-Waste Management System

A comprehensive web application for managing electronic waste in residential complexes, academic campuses, and organizations. This system provides centralized tracking, QR code-based item management, automated categorization, compliance reporting, and user engagement features.

## 🌟 Features

### 1. Centralized E-Waste Management Portal
- **Item Registration**: Log and track e-waste items by department, category, age, and condition
- **Smart Categorization**: Automated classification into recyclable, reusable, or hazardous categories
- **Status Tracking**: Monitor items from registration to final disposal/recycling

### 2. QR Code-Based Tagging System
- **Unique QR Codes**: Auto-generated QR codes for each registered item
- **Mobile Scanner**: Built-in QR code scanner for tracking item movement
- **Status Updates**: Real-time status updates through QR code scanning
- **Printable Labels**: Generate printable QR code labels for physical attachment

### 3. Smart Categorization and Scheduling
- **Automated Classification**: AI-powered categorization based on item type, age, and condition
- **Collection Scheduling**: Schedule pickup drives with registered vendors
- **Vendor Management**: Maintain database of certified e-waste recycling vendors

### 4. Compliance and Reporting Module
- **PDF Reports**: Auto-generation of compliance reports for environmental audits
- **CPCB Compliance**: Reports aligned with E-Waste (Management) Rules
- **Inventory Tracking**: Complete traceability from registration to disposal
- **Analytics Dashboard**: Detailed insights and trends analysis

### 5. User Engagement and Awareness
- **Campaign Management**: Create and manage awareness campaigns
- **Gamification**: Points-based system with Bronze, Silver, Gold levels
- **Leaderboards**: Department-wise and individual performance tracking
- **Challenges**: Environmental challenges and collection drives

### 6. Data Analytics Dashboard
- **Real-time Metrics**: Total items, weight processed, active campaigns
- **Visual Charts**: Pie charts, bar charts, and trend analysis
- **Monthly Trends**: Track e-waste generation patterns
- **Environmental Impact**: Calculate recycling benefits and carbon footprint

## 🚀 Technology Stack

### Backend
- **Flask**: Python web framework
- **SQLAlchemy**: Database ORM
- **JWT**: Authentication and authorization
- **QRCode**: QR code generation
- **ReportLab**: PDF report generation
- **Matplotlib/Seaborn**: Data visualization

### Frontend
- **React 18**: Modern UI library
- **Material-UI (MUI)**: Component library
- **Recharts**: Chart and visualization library
- **HTML5-QRCode**: QR code scanning
- **Axios**: HTTP client
- **React Router**: Navigation

### Database
- **SQLite**: Default database (easily replaceable with PostgreSQL/MySQL)

## 📦 Installation and Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-ewaste-management
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

5. **Initialize database**
   ```bash
   python app.py
   # Database will be created automatically on first run
   ```

6. **Start the Flask server**
   ```bash
   python app.py
   # Server will run on http://localhost:5000
   ```

### Frontend Setup

1. **Install Node.js dependencies**
   ```bash
   npm install
   ```

2. **Start the React development server**
   ```bash
   npm start
   # Application will open at http://localhost:3000
   ```

### Default Login Credentials
- **Username**: admin
- **Password**: admin123
- **Role**: Administrator

## 🎯 Usage Guide

### For Users
1. **Register Account**: Create an account with department information
2. **Add E-Waste Items**: Register items with details like category, condition, age
3. **Print QR Codes**: Generate and print QR code labels for items
4. **Track Items**: Use QR scanner to update item status
5. **Participate in Campaigns**: Join awareness campaigns and earn points
6. **View Profile**: Track your contributions and level progress

### For Administrators
1. **Vendor Management**: Add and manage certified e-waste vendors
2. **Collection Scheduling**: Schedule pickup drives and assign vendors
3. **Campaign Creation**: Create awareness campaigns and challenges
4. **Analytics**: Monitor system-wide metrics and generate reports
5. **Compliance Reports**: Download PDF reports for audits

### For Vendors
1. **View Assignments**: See scheduled collections
2. **Update Status**: Mark collections as completed
3. **Track Performance**: Monitor collection metrics

## 📊 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │   Flask Backend  │    │   SQLite DB     │
│                 │    │                 │    │                 │
│ • User Interface│◄──►│ • REST APIs     │◄──►│ • User Data     │
│ • QR Scanner    │    │ • Authentication│    │ • Item Records  │
│ • Charts        │    │ • Business Logic│    │ • Campaigns     │
│ • Forms         │    │ • Report Gen    │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Configuration

### Environment Variables
```env
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
DATABASE_URL=sqlite:///ewaste.db
```

### Database Configuration
The system uses SQLite by default but can be configured for PostgreSQL or MySQL by updating the `DATABASE_URL` in the `.env` file.

## 📈 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Items Management
- `GET /api/items` - List all items (paginated)
- `POST /api/items` - Add new item
- `GET /api/items/<qr_code>` - Get item by QR code
- `PUT /api/items/<id>/status` - Update item status

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/leaderboard` - User leaderboard

### Reports
- `GET /api/reports/compliance` - Generate compliance report (PDF)

## 🎨 UI Features

### Modern Design
- **Material Design**: Clean, intuitive interface
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Dark/Light Theme**: Automatic theme detection
- **Accessibility**: WCAG compliant components

### Interactive Elements
- **Real-time Charts**: Dynamic data visualization
- **QR Code Scanner**: Camera-based scanning
- **Progress Indicators**: Visual feedback for user actions
- **Notifications**: Toast notifications for user feedback

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password encryption
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization

## 🌱 Environmental Impact

This system helps organizations:
- **Reduce Landfill Waste**: Proper categorization and recycling
- **Compliance**: Meet environmental regulations
- **Awareness**: Educate users about e-waste impact
- **Tracking**: Monitor environmental benefits
- **Optimization**: Improve collection efficiency

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@ewaste-system.com
- Documentation: [Wiki](link-to-wiki)

## 🏆 Hackathon Project

This is a hackathon project (HH302) demonstrating a comprehensive solution for smart e-waste management. The system addresses real-world challenges in electronic waste management while providing an engaging user experience through gamification and modern web technologies.

### Key Achievements
- ✅ Complete full-stack application
- ✅ QR code-based tracking system
- ✅ Automated item classification
- ✅ Compliance reporting
- ✅ User engagement features
- ✅ Modern, responsive UI
- ✅ Real-time analytics dashboard
- ✅ Vendor management system