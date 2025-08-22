import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Box,
  LinearProgress,
  Chip,
  Button
} from '@mui/material';
import {
  Inventory,
  Recycling,
  TrendingUp,
  Campaign,
  LocalShipping,
  Business,
  EmojiEvents
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, campaignsRes, collectionsRes] = await Promise.all([
        axios.get('/api/analytics/dashboard'),
        axios.get('/api/campaigns'),
        axios.get('/api/collections')
      ]);

      setAnalytics(analyticsRes.data);
      setCampaigns(campaignsRes.data.slice(0, 3)); // Show only first 3
      setCollections(collectionsRes.data.slice(0, 3)); // Show only first 3
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  const statusData = analytics?.items_by_status ? 
    Object.entries(analytics.items_by_status).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value
    })) : [];

  const categoryData = analytics?.items_by_category ?
    Object.entries(analytics.items_by_category).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value
    })) : [];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Inventory sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6">Total Items</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {analytics?.total_items || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                E-waste items registered
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Recycling sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6">Total Weight</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {analytics?.total_weight_kg?.toFixed(1) || 0} kg
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total e-waste weight
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Campaign sx={{ color: 'secondary.main', mr: 1 }} />
                <Typography variant="h6">Active Campaigns</Typography>
              </Box>
              <Typography variant="h4" color="secondary.main">
                {analytics?.active_campaigns || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ongoing awareness campaigns
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Business sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h6">Vendors</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {analytics?.registered_vendors || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Registered vendors
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Items by Status
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Items by Category
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2e7d32" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Activity Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Recent Campaigns</Typography>
              <Button onClick={() => navigate('/campaigns')}>View All</Button>
            </Box>
            {campaigns.map((campaign) => (
              <Box key={campaign.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="subtitle1">{campaign.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {campaign.description}
                </Typography>
                <Chip 
                  label={campaign.campaign_type} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Scheduled Collections</Typography>
              <Button onClick={() => navigate('/collections')}>View All</Button>
            </Box>
            {collections.map((collection) => (
              <Box key={collection.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="subtitle1">{collection.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {collection.location}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {collection.scheduled_date ? new Date(collection.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                </Typography>
                <Chip 
                  label={collection.status} 
                  size="small" 
                  color={collection.status === 'completed' ? 'success' : 'warning'} 
                  variant="outlined" 
                />
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;