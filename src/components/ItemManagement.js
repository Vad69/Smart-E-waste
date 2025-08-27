import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  Box,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Avatar,
  Pagination
} from '@mui/material';
import {
  Add,
  QrCode,
  Edit,
  Delete,
  Visibility
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';
import QRCode from 'react-qr-code';

const categories = [
  'Computer',
  'Laptop',
  'Mobile',
  'Tablet',
  'Monitor',
  'Printer',
  'Scanner',
  'Projector',
  'Battery',
  'Cable',
  'Other'
];

const conditions = ['Working', 'Non-working', 'Damaged'];

const ItemManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subcategory: '',
    department: '',
    location: '',
    condition: '',
    age_years: '',
    weight_kg: ''
  });

  useEffect(() => {
    fetchItems();
  }, [page]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/items?page=${page}&per_page=10`);
      setItems(response.data.items);
      setTotalPages(response.data.pages);
    } catch (error) {
      toast.error('Error fetching items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/items', formData);
      toast.success('Item added successfully!');
      setOpen(false);
      setFormData({
        name: '',
        category: '',
        subcategory: '',
        department: '',
        location: '',
        condition: '',
        age_years: '',
        weight_kg: ''
      });
      fetchItems();
      
      // Show QR code dialog
      setSelectedItem(response.data);
      setQrDialogOpen(true);
    } catch (error) {
      toast.error('Error adding item');
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">E-Waste Items Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Add New Item
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>QR Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Condition</TableCell>
              <TableCell>Classification</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Weight (kg)</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                      <QrCode />
                    </Avatar>
                    {item.qr_code}
                  </Box>
                </TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.department}</TableCell>
                <TableCell>{item.condition}</TableCell>
                <TableCell>
                  <Chip
                    label={item.classification}
                    color={getClassificationColor(item.classification)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.status}
                    color={getStatusColor(item.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{item.weight_kg}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => {
                      setSelectedItem(item);
                      setQrDialogOpen(true);
                    }}
                  >
                    <QrCode />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(e, value) => setPage(value)}
          color="primary"
        />
      </Box>

      {/* Add Item Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New E-Waste Item</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Item Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  {categories.map((option) => (
                    <MenuItem key={option} value={option.toLowerCase()}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Subcategory"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Condition"
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  required
                >
                  {conditions.map((option) => (
                    <MenuItem key={option} value={option.toLowerCase()}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Age (Years)"
                  name="age_years"
                  type="number"
                  value={formData.age_years}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Weight (kg)"
                  name="weight_kg"
                  type="number"
                  step="0.1"
                  value={formData.weight_kg}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Add Item
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>QR Code Generated</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedItem.qr_code || selectedItem.qr_code}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <QRCode value={selectedItem.qr_code || selectedItem.qr_code} size={200} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Print this QR code and attach it to the item for tracking
              </Typography>
              {selectedItem.classification && (
                <Chip
                  label={`Auto-classified as: ${selectedItem.classification}`}
                  color={getClassificationColor(selectedItem.classification)}
                  sx={{ mt: 2 }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
          <Button variant="contained">Print QR Code</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ItemManagement;