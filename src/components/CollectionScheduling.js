import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
  Chip
} from '@mui/material';
import { Add, LocalShipping, Schedule } from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

const CollectionScheduling = () => {
  const [collections, setCollections] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_date: '',
    location: '',
    vendor_id: ''
  });

  useEffect(() => {
    fetchCollections();
    fetchVendors();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await axios.get('/api/collections');
      setCollections(response.data);
    } catch (error) {
      toast.error('Error fetching collections');
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axios.get('/api/vendors');
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/collections', formData);
      toast.success('Collection scheduled successfully!');
      setOpen(false);
      setFormData({
        title: '',
        description: '',
        scheduled_date: '',
        location: '',
        vendor_id: ''
      });
      fetchCollections();
    } catch (error) {
      toast.error('Error scheduling collection');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Collection Scheduling</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Schedule Collection
        </Button>
      </Box>

      <Grid container spacing={3}>
        {collections.map((collection) => (
          <Grid item xs={12} md={6} key={collection.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocalShipping sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    {collection.title}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {collection.description}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Location: {collection.location}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Scheduled: {collection.scheduled_date ? new Date(collection.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Chip
                    label={collection.status}
                    color={getStatusColor(collection.status)}
                    size="small"
                  />
                  <Typography variant="body2">
                    Items: {collection.items_collected}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  Total Weight: {collection.total_weight} kg
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Schedule Collection Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule New Collection</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Collection Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Scheduled Date"
                  name="scheduled_date"
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Vendor"
                  name="vendor_id"
                  value={formData.vendor_id}
                  onChange={handleChange}
                >
                  {vendors.map((vendor) => (
                    <MenuItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Schedule Collection
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default CollectionScheduling;