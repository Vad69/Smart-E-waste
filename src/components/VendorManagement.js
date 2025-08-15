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
  Box,
  Rating,
  Chip
} from '@mui/material';
import { Add, Business, Phone, Email } from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

const VendorManagement = () => {
  const [vendors, setVendors] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    specialization: '',
    certification: ''
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await axios.get('/api/vendors');
      setVendors(response.data);
    } catch (error) {
      toast.error('Error fetching vendors');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/vendors', formData);
      toast.success('Vendor added successfully!');
      setOpen(false);
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        specialization: '',
        certification: ''
      });
      fetchVendors();
    } catch (error) {
      toast.error('Error adding vendor');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Vendor Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Add Vendor
        </Button>
      </Box>

      <Grid container spacing={3}>
        {vendors.map((vendor) => (
          <Grid item xs={12} md={6} lg={4} key={vendor.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Business sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    {vendor.name}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Contact: {vendor.contact_person}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Email sx={{ mr: 1, fontSize: 16 }} />
                  <Typography variant="body2">
                    {vendor.email}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Phone sx={{ mr: 1, fontSize: 16 }} />
                  <Typography variant="body2">
                    {vendor.phone}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Specialization: {vendor.specialization}
                </Typography>
                
                <Chip
                  label={vendor.certification}
                  color="success"
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Rating value={vendor.rating} readOnly size="small" />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    ({vendor.rating})
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add Vendor Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Vendor</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Vendor Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contact Person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder="e.g., Computers, Mobile Devices, Batteries"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Certification"
                  name="certification"
                  value={formData.certification}
                  onChange={handleChange}
                  placeholder="e.g., CPCB Authorized, E-Waste Management License"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Add Vendor
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default VendorManagement;