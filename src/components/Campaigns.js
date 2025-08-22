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
  Chip,
  Box,
  LinearProgress
} from '@mui/material';
import { Add, Campaign, EmojiEvents } from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

const campaignTypes = ['awareness', 'collection', 'challenge'];

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    campaign_type: '',
    start_date: '',
    end_date: '',
    target_participants: '',
    reward_points: ''
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/campaigns');
      setCampaigns(response.data);
    } catch (error) {
      toast.error('Error fetching campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/campaigns', formData);
      toast.success('Campaign created successfully!');
      setOpen(false);
      setFormData({
        title: '',
        description: '',
        campaign_type: '',
        start_date: '',
        end_date: '',
        target_participants: '',
        reward_points: ''
      });
      fetchCampaigns();
    } catch (error) {
      toast.error('Error creating campaign');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getCampaignTypeColor = (type) => {
    switch (type) {
      case 'awareness': return 'info';
      case 'collection': return 'success';
      case 'challenge': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Awareness Campaigns</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Create Campaign
        </Button>
      </Box>

      <Grid container spacing={3}>
        {campaigns.map((campaign) => (
          <Grid item xs={12} md={6} lg={4} key={campaign.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Campaign sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="h2">
                    {campaign.title}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {campaign.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={campaign.campaign_type}
                    color={getCampaignTypeColor(campaign.campaign_type)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  {campaign.reward_points > 0 && (
                    <Chip
                      icon={<EmojiEvents />}
                      label={`${campaign.reward_points} points`}
                      color="secondary"
                      size="small"
                    />
                  )}
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Duration: {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Participation: {campaign.actual_participants} / {campaign.target_participants}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(campaign.actual_participants / campaign.target_participants) * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  disabled={new Date() > new Date(campaign.end_date)}
                >
                  {new Date() > new Date(campaign.end_date) ? 'Campaign Ended' : 'Join Campaign'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Campaign Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Campaign</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Campaign Title"
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Campaign Type"
                  name="campaign_type"
                  value={formData.campaign_type}
                  onChange={handleChange}
                  required
                >
                  {campaignTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Target Participants"
                  name="target_participants"
                  type="number"
                  value={formData.target_participants}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reward Points"
                  name="reward_points"
                  type="number"
                  value={formData.reward_points}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Create Campaign
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Campaigns;