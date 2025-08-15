# 🚀 Smart E-Waste Management System

A comprehensive digital solution for managing electronic waste in residential complexes, academic campuses, and organizations. This system provides end-to-end e-waste tracking, recycling management, and environmental impact monitoring.

## ✨ Features

### 🏢 Centralized E-Waste Management Portal
- **Comprehensive Tracking**: Log, track, and manage disposal of e-waste items by department, category, age, and more
- **Role-based Access**: Different access levels for admins, managers, staff, students, and residents
- **Real-time Updates**: Live status updates and notifications throughout the e-waste lifecycle

### 📱 QR Code-Based Tagging System
- **Unique Identification**: Every e-waste item gets a unique QR code for complete traceability
- **Mobile Scanning**: Scan QR codes to instantly access item details and status
- **Bulk Generation**: Generate QR codes for multiple items simultaneously
- **Download & Print**: Download QR codes for physical labeling

### 🧠 Smart Categorization & Scheduling
- **Automated Classification**: Intelligent categorization of items (recyclable, reusable, hazardous, landfill)
- **Vendor Management**: Comprehensive vendor database with ratings, certifications, and performance tracking
- **Pickup Scheduling**: Automated scheduling with registered recycling vendors
- **Smart Matching**: AI-powered vendor-item matching based on capabilities and location

### 📊 Compliance & Reporting Module
- **Regulatory Compliance**: Built-in compliance with CPCB and E-Waste (Management) Rules
- **Automated Reports**: Generate environmental impact, compliance, and audit reports
- **PDF Export**: Export reports in multiple formats including PDF
- **Real-time Monitoring**: Track compliance metrics and thresholds

### 🎯 User Engagement & Awareness
- **Sustainability Campaigns**: Create and manage awareness campaigns, challenges, and collection drives
- **Green Scoreboard**: Gamified system with points, leaderboards, and achievements
- **Educational Content**: Built-in sustainability education and best practices
- **Community Challenges**: Engage users with recycling challenges and competitions

### 📈 Data Analytics Dashboard
- **Environmental Impact**: Track CO2 saved, landfill space saved, and toxic materials prevented
- **Performance Metrics**: Monitor recycling rates, processing times, and vendor performance
- **Trend Analysis**: Historical data analysis and predictive insights
- **Custom Reports**: Generate reports for specific time periods and criteria

## 🛠️ Technology Stack

### Backend
- **Node.js** with **Express.js** framework
- **MongoDB** with **Mongoose** ODM
- **JWT** authentication and authorization
- **QR Code** generation and management
- **PDF** report generation
- **Email** notifications
- **Rate limiting** and security middleware

### Frontend
- **React.js** with **React Router** for navigation
- **Styled Components** for styling
- **React Query** for state management
- **Chart.js** for data visualization
- **Framer Motion** for animations
- **React Hook Form** for form handling
- **Axios** for API communication

### Security Features
- **Helmet.js** for security headers
- **Rate limiting** to prevent abuse
- **Input validation** and sanitization
- **Role-based access control**
- **JWT token** management

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-ewaste-management
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/ewaste-management
   JWT_SECRET=your-super-secret-jwt-key-here
   PORT=5000
   ```

5. **Create required directories**
   ```bash
   mkdir uploads qr-codes
   ```

6. **Start the backend server**
   ```bash
   npm run dev
   ```

7. **Start the frontend (in a new terminal)**
   ```bash
   npm run client
   ```

8. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/api/health

## 📁 Project Structure

```
smart-ewaste-management/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── contexts/          # React contexts
│   │   ├── pages/             # Page components
│   │   ├── utils/             # Utility functions
│   │   └── App.js             # Main app component
│   └── package.json
├── models/                     # MongoDB schemas
│   ├── User.js                # User model
│   ├── EwasteItem.js          # E-waste item model
│   ├── Vendor.js              # Vendor model
│   └── Campaign.js            # Campaign model
├── routes/                     # API routes
│   ├── auth.js                # Authentication routes
│   ├── ewaste.js              # E-waste management routes
│   ├── qr.js                  # QR code routes
│   ├── vendor.js              # Vendor management routes
│   ├── campaign.js            # Campaign routes
│   ├── analytics.js           # Analytics routes
│   └── compliance.js          # Compliance routes
├── middleware/                 # Custom middleware
│   └── auth.js                # Authentication middleware
├── uploads/                    # File uploads directory
├── qr-codes/                   # Generated QR codes
├── server.js                   # Main server file
├── package.json                # Backend dependencies
└── README.md                   # This file
```

## 🔐 User Roles & Permissions

### 👑 Admin
- Full system access
- User management
- System configuration
- All reports and analytics

### 👨‍💼 Manager
- E-waste management
- Vendor management
- Campaign management
- Compliance reports
- Analytics access

### 👨‍💻 Staff
- E-waste reporting
- Item management
- Department-specific access
- Basic analytics

### 🎓 Student
- E-waste reporting
- Campaign participation
- Personal dashboard
- Limited department access

### 🏠 Resident
- E-waste reporting
- Building-specific access
- Campaign participation
- Personal dashboard

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### E-Waste Management
- `POST /api/ewaste` - Create e-waste item
- `GET /api/ewaste` - Get e-waste items
- `GET /api/ewaste/:id` - Get specific item
- `PUT /api/ewaste/:id` - Update item
- `DELETE /api/ewaste/:id` - Delete item

### QR Code Management
- `GET /api/qr/generate/:itemId` - Generate QR code
- `GET /api/qr/scan/:qrCode` - Scan QR code
- `POST /api/qr/bulk-generate` - Bulk QR generation

### Analytics
- `GET /api/analytics/overview` - Dashboard overview
- `GET /api/analytics/trends` - Trend analysis
- `GET /api/analytics/environmental-impact` - Environmental metrics
- `GET /api/analytics/performance` - Performance KPIs

### Compliance
- `GET /api/compliance/overview` - Compliance overview
- `GET /api/compliance/report/:type` - Generate reports
- `GET /api/compliance/check` - Compliance status

## 🌱 Environmental Impact Calculation

The system automatically calculates environmental impact based on:
- **CO2 Saved**: Based on item category and weight
- **Landfill Space Saved**: Volume calculations
- **Toxic Materials Prevented**: Hazardous material tracking

### Impact Factors
- **Computers**: 50kg CO2, 0.1m³ landfill, 0.5kg toxic materials
- **Mobile Devices**: 10kg CO2, 0.02m³ landfill, 0.1kg toxic materials
- **Batteries**: 5kg CO2, 0.01m³ landfill, 0.3kg toxic materials
- **Lab Equipment**: 40kg CO2, 0.08m³ landfill, 0.4kg toxic materials

## 🎯 Use Cases

### Academic Institutions
- **Computer Labs**: Track outdated computers and lab equipment
- **Department Management**: Monitor e-waste by academic departments
- **Student Engagement**: Encourage sustainable practices through campaigns
- **Compliance**: Meet environmental regulations and standards

### Residential Complexes
- **Building Management**: Track e-waste by building and floor
- **Resident Participation**: Engage residents in recycling programs
- **Vendor Coordination**: Schedule pickups and recycling drives
- **Community Awareness**: Promote sustainable living practices

### Corporate Offices
- **IT Asset Management**: Track company equipment lifecycle
- **Department Accountability**: Monitor e-waste by business units
- **Vendor Performance**: Evaluate recycling vendor effectiveness
- **Sustainability Reporting**: Generate ESG compliance reports

## 🔧 Configuration

### Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/ewaste-management

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
QR_PATH=./qr-codes

# QR Code
QR_CODE_SIZE=200
QR_CODE_MARGIN=2
```

### MongoDB Setup
1. Install MongoDB
2. Create database: `ewaste-management`
3. Create collections (automatically created by Mongoose):
   - `users`
   - `ewasteitems`
   - `vendors`
   - `campaigns`

## 🚀 Deployment

### Production Deployment
1. **Environment Setup**
   ```bash
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-production-secret
   ```

2. **Build Frontend**
   ```bash
   cd client
   npm run build
   cd ..
   ```

3. **Start Production Server**
   ```bash
   npm start
   ```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 🧪 Testing

### Backend Testing
```bash
npm test
```

### Frontend Testing
```bash
cd client
npm test
```

### API Testing
Use tools like Postman or Insomnia to test API endpoints:
- Import the API collection
- Set up environment variables
- Test authentication and protected routes

## 📊 Monitoring & Logging

### Health Checks
- **Endpoint**: `GET /api/health`
- **Response**: System status and uptime
- **Use Case**: Load balancer health checks

### Error Logging
- **Console Logging**: Development environment
- **File Logging**: Production environment
- **Error Tracking**: Structured error logging

### Performance Monitoring
- **Response Times**: API endpoint performance
- **Database Queries**: Query optimization
- **Memory Usage**: Resource utilization

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **Role-based Access**: Granular permission system
- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Secure session handling

### API Security
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Sanitize all inputs
- **CORS Protection**: Configured for production
- **Helmet.js**: Security headers

### Data Protection
- **Data Encryption**: Sensitive data encryption
- **Access Logging**: Audit trail for all actions
- **Secure Headers**: HTTP security headers
- **SQL Injection Protection**: MongoDB injection protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines
- Follow ESLint configuration
- Use conventional commit messages
- Write meaningful commit descriptions
- Include tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Environmental Organizations**: For sustainability guidelines
- **Open Source Community**: For the amazing tools and libraries
- **Academic Institutions**: For research and best practices
- **Recycling Industry**: For technical expertise and standards

## 📞 Support

### Documentation
- [API Documentation](docs/api.md)
- [User Guide](docs/user-guide.md)
- [Admin Guide](docs/admin-guide.md)
- [Developer Guide](docs/developer-guide.md)

### Contact
- **Email**: support@ewaste-management.com
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

### Community
- **Discord**: Join our community server
- **Slack**: Team collaboration workspace
- **Forum**: Community discussions and support

---

**Made with ❤️ for a sustainable future**

*This project aims to make e-waste management efficient, transparent, and environmentally responsible. Together, we can build a greener tomorrow.*