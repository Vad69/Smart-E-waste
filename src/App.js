import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ItemManagement from './components/ItemManagement';
import QRScanner from './components/QRScanner';
import Analytics from './components/Analytics';
import Campaigns from './components/Campaigns';
import VendorManagement from './components/VendorManagement';
import CollectionScheduling from './components/CollectionScheduling';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32', // Green for environmental theme
      light: '#60ad5e',
      dark: '#005005',
    },
    secondary: {
      main: '#ff9800', // Orange for accent
      light: '#ffb74d',
      dark: '#f57c00',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
});

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <CssBaseline />
      <Router>
        {user && <Navbar />}
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/items" element={user ? <ItemManagement /> : <Navigate to="/login" />} />
          <Route path="/scanner" element={user ? <QRScanner /> : <Navigate to="/login" />} />
          <Route path="/analytics" element={user ? <Analytics /> : <Navigate to="/login" />} />
          <Route path="/campaigns" element={user ? <Campaigns /> : <Navigate to="/login" />} />
          <Route path="/vendors" element={user ? <VendorManagement /> : <Navigate to="/login" />} />
          <Route path="/collections" element={user ? <CollectionScheduling /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/leaderboard" element={user ? <Leaderboard /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </Router>
      <ToastContainer position="bottom-right" />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;