import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  Box
} from '@mui/material';
import { EmojiEvents, Stars } from '@mui/icons-material';
import axios from 'axios';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get('/api/leaderboard');
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
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

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <EmojiEvents sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
        <Typography variant="h4">Leaderboard</Typography>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Points</TableCell>
                <TableCell>Items Reported</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.map((user, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '1.5rem' }}>
                      {getRankIcon(index + 1)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2 }}>
                        {user.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="subtitle1">
                        {user.username}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<Stars />}
                      label={user.level}
                      color={getLevelColor(user.level)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="h6" color="primary">
                      {user.points}
                    </Typography>
                  </TableCell>
                  <TableCell>{user.items_reported}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default Leaderboard;