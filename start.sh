#!/bin/bash

echo "🌱 Starting Smart E-Waste Management System..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

echo "🚀 Starting backend server..."
python app.py &
BACKEND_PID=$!

echo "🎨 Starting frontend server..."
npm start &
FRONTEND_PID=$!

echo "✅ System started successfully!"
echo "📊 Backend running on: http://localhost:5000"
echo "🎯 Frontend running on: http://localhost:3000"
echo "👤 Default login: admin / admin123"

# Wait for user input to stop servers
echo "Press [CTRL+C] to stop both servers..."
wait

# Cleanup
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
echo "🛑 Servers stopped."