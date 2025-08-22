import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  TextField
} from '@mui/material';
import {
  QrCodeScanner,
  Search,
  Update
} from '@mui/icons-material';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import { toast } from 'react-toastify';

const QRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [scannedItem, setScannedItem] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [scanner, setScanner] = useState(null);

  const statuses = ['registered', 'collected', 'processed', 'recycled'];

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scanner]);

  const startScanning = () => {
    setScanning(true);
    
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    html5QrcodeScanner.render(
      (decodedText) => {
        handleScanSuccess(decodedText);
        html5QrcodeScanner.clear();
        setScanning(false);
      },
      (error) => {
        // Handle scan error if needed
      }
    );

    setScanner(html5QrcodeScanner);
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear();
      setScanning(false);
    }
  };

  const handleScanSuccess = async (qrCode) => {
    try {
      const response = await axios.get(`/api/items/${qrCode}`);
      setScannedItem(response.data);
      toast.success('Item found!');
    } catch (error) {
      toast.error('Item not found');
      setScannedItem(null);
    }
  };

  const handleManualSearch = async () => {
    if (!manualCode.trim()) {
      toast.error('Please enter a QR code');
      return;
    }
    
    await handleScanSuccess(manualCode.trim());
  };

  const handleStatusUpdate = async () => {
    if (!scannedItem || !newStatus) {
      toast.error('Please select a status');
      return;
    }

    try {
      await axios.put(`/api/items/${scannedItem.id}/status`, {
        status: newStatus
      });
      
      setScannedItem({ ...scannedItem, status: newStatus });
      setUpdateDialogOpen(false);
      setNewStatus('');
      toast.success('Status updated successfully!');
    } catch (error) {
      toast.error('Error updating status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'registered': return 'primary';
      case 'collected': return 'warning';
      case 'processed': return 'info';
      case 'recycled': return 'success';
      default: return 'default';
    }
  };

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'hazardous': return 'error';
      case 'reusable': return 'success';
      case 'recyclable': return 'info';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        QR Code Scanner
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Scan QR Code
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              {!scanning ? (
                <Button
                  variant="contained"
                  startIcon={<QrCodeScanner />}
                  onClick={startScanning}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Start Camera Scanner
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  onClick={stopScanning}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Stop Scanner
                </Button>
              )}
              
              <div id="qr-reader" style={{ width: '100%' }}></div>
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Or enter QR code manually:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="QR Code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter QR code here"
              />
              <Button
                variant="contained"
                onClick={handleManualSearch}
                startIcon={<Search />}
              >
                Search
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Item Details
            </Typography>
            
            {scannedItem ? (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {scannedItem.name}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        QR Code:
                      </Typography>
                      <Typography variant="body1">
                        {scannedItem.qr_code}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Category:
                      </Typography>
                      <Typography variant="body1">
                        {scannedItem.category}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Department:
                      </Typography>
                      <Typography variant="body1">
                        {scannedItem.department || 'N/A'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Location:
                      </Typography>
                      <Typography variant="body1">
                        {scannedItem.location || 'N/A'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Condition:
                      </Typography>
                      <Typography variant="body1">
                        {scannedItem.condition}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Weight:
                      </Typography>
                      <Typography variant="body1">
                        {scannedItem.weight_kg} kg
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Classification:
                      </Typography>
                      <Chip
                        label={scannedItem.classification}
                        color={getClassificationColor(scannedItem.classification)}
                        size="small"
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Status:
                      </Typography>
                      <Chip
                        label={scannedItem.status}
                        color={getStatusColor(scannedItem.status)}
                        size="small"
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Reported By:
                      </Typography>
                      <Typography variant="body1">
                        {scannedItem.reported_by}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Created:
                      </Typography>
                      <Typography variant="body1">
                        {new Date(scannedItem.created_at).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<Update />}
                      onClick={() => setUpdateDialogOpen(true)}
                      fullWidth
                    >
                      Update Status
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <QrCodeScanner sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Scan or enter a QR code to view item details
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Status Update Dialog */}
      <Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)}>
        <DialogTitle>Update Item Status</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            sx={{ mt: 2 }}
          >
            {statuses.map((status) => (
              <MenuItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStatusUpdate} variant="contained">
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QRScanner;