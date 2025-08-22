import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Box,
  Chip,
  LinearProgress
} from '@mui/material';
import { Person, EmojiEvents, Inventory, Campaign } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/profile');
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'Gold': return 'warning';
      case 'Silver': return 'default';
      case 'Bronze': return 'error';
      default: return 'primary';
    }
  };

  const getNextLevelPoints = (currentPoints) => {
    if (currentPoints < 200) return 200;
    if (currentPoints < 500) return 500;
    return 1000;
  };

  if (loading || !profile) {
    return <Container>Loading...</Container>;
  }

  const nextLevelPoints = getNextLevelPoints(profile.points.total_points);
  const progressToNextLevel = (profile.points.total_points / nextLevelPoints) * 100;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Info */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{ width: 100, height: 100, mx: 'auto', mb: 2, fontSize: '2rem' }}
              >
                {profile.user.username.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {profile.user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {profile.user.email}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {profile.user.department}
              </Typography>
              <Chip
                label={profile.user.role}
                color="primary"
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Points and Level */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmojiEvents sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Points & Level</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="h4" color="primary">
                    {profile.points.total_points}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Points
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Chip
                    label={profile.points.level}
                    color={getLevelColor(profile.points.level)}
                    size="large"
                    sx={{ fontSize: '1rem', height: 40 }}
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Progress to next level: {profile.points.total_points} / {nextLevelPoints}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(progressToNextLevel, 100)}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Inventory sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6">Items</Typography>
                  </Box>
                  <Typography variant="h4" color="success.main">
                    {profile.points.items_reported}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Items Reported
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Campaign sx={{ mr: 1, color: 'info.main' }} />
                    <Typography variant="h6">Campaigns</Typography>
                  </Box>
                  <Typography variant="h4" color="info.main">
                    {profile.points.campaigns_participated}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Participated
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile;