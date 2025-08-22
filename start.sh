#!/bin/bash

echo "🚀 Starting Smart E-Waste Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check if MongoDB is running
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB is not installed. Please install MongoDB or use MongoDB Atlas."
    echo "   You can still run the frontend, but backend features won't work."
fi

# Create required directories
mkdir -p uploads qr-codes

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before starting the server."
    echo "   Required: MONGODB_URI, JWT_SECRET"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Install frontend dependencies if needed
if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd client
    npm install
    cd ..
fi

echo "✅ Dependencies installed successfully!"

# Start the backend server
echo "🔧 Starting backend server..."
npm run dev &

# Wait a moment for backend to start
sleep 3

# Start the frontend
echo "🌐 Starting frontend..."
cd client
npm start &

echo ""
echo "🎉 Smart E-Waste Management System is starting up!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo "🏥 Health Check: http://localhost:5000/api/health"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user to stop
wait