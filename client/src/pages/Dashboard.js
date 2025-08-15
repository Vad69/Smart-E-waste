import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  FiTrash2, 
  FiUsers, 
  FiTrendingUp, 
  FiAward,
  FiPlus,
  FiQrCode,
  FiTruck,
  FiBarChart3
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

// Components
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatCard from '../components/dashboard/StatCard';
import RecentActivity from '../components/dashboard/RecentActivity';
import EnvironmentalImpact from '../components/dashboard/EnvironmentalImpact';
import QuickActions from '../components/dashboard/QuickActions';

const DashboardContainer = styled.div`
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 10px;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #718096;
  margin: 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  margin-bottom: 30px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled(motion.div)`
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const WelcomeMessage = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  border-radius: 16px;
  margin-bottom: 30px;
  text-align: center;
`;

const WelcomeTitle = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 10px;
`;

const WelcomeText = styled.p`
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0;
`;

const fetchDashboardData = async () => {
  const response = await axios.get('/api/analytics/overview');
  return response.data;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');

  const { data: dashboardData, isLoading, error } = useQuery('dashboardData', fetchDashboardData);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading dashboard data</div>;

  const { overview, environmentalImpact, topContributors } = dashboardData || {};

  return (
    <DashboardContainer>
      <Header>
        <Title>Dashboard</Title>
        <Subtitle>Welcome to your E-Waste Management System</Subtitle>
      </Header>

      <WelcomeMessage>
        <WelcomeTitle>{greeting}, {user?.username}! 👋</WelcomeTitle>
        <WelcomeText>
          Track your environmental impact and manage e-waste efficiently
        </WelcomeText>
      </WelcomeMessage>

      <StatsGrid>
        <StatCard
          icon={<FiTrash2 />}
          title="Total E-Waste Items"
          value={overview?.totalItems || 0}
          change={overview?.monthlyItems || 0}
          changeLabel="this month"
          color="#667eea"
        />
        <StatCard
          icon={<FiUsers />}
          title="Active Users"
          value={overview?.totalUsers || 0}
          change={overview?.totalVendors || 0}
          changeLabel="vendors"
          color="#48bb78"
        />
        <StatCard
          icon={<FiTrendingUp />}
          title="Recycling Rate"
          value={`${Math.round(((overview?.totalItems || 0) > 0 ? 
            ((overview?.totalItems - (overview?.totalItems * 0.2)) / overview?.totalItems) * 100 : 0))}%`}
          change={overview?.yearlyItems || 0}
          changeLabel="this year"
          color="#ed8936"
        />
        <StatCard
          icon={<FiAward />}
          title="Your Green Score"
          value={user?.greenScore || 0}
          change={user?.totalEwasteContributed || 0}
          changeLabel="items contributed"
          color="#9f7aea"
        />
      </StatsGrid>

      <ContentGrid>
        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SectionTitle>
            <FiBarChart3 />
            Environmental Impact
          </SectionTitle>
          <EnvironmentalImpact data={environmentalImpact} />
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <SectionTitle>
            <FiAward />
            Top Contributors
          </SectionTitle>
          <TopContributors contributors={topContributors} />
        </Section>
      </ContentGrid>

      <ContentGrid>
        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <SectionTitle>
            <FiTrendingUp />
            Recent Activity
          </SectionTitle>
          <RecentActivity />
        </Section>

        <Section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <SectionTitle>
            <FiPlus />
            Quick Actions
          </SectionTitle>
          <QuickActions userRole={user?.role} />
        </Section>
      </ContentGrid>
    </DashboardContainer>
  );
};

const TopContributors = ({ contributors }) => {
  if (!contributors || contributors.length === 0) {
    return <div>No contributors yet</div>;
  }

  return (
    <div>
      {contributors.slice(0, 5).map((contributor, index) => (
        <ContributorItem key={contributor._id}>
          <Rank>{index + 1}</Rank>
          <ContributorInfo>
            <ContributorName>{contributor.username}</ContributorName>
            <ContributorRole>{contributor.role} • {contributor.department || contributor.building}</ContributorRole>
          </ContributorInfo>
          <ContributorStats>
            <Stat>{contributor.totalEwasteContributed} items</Stat>
            <Score>{contributor.greenScore} pts</Score>
          </ContributorStats>
        </ContributorItem>
      ))}
    </div>
  );
};

const ContributorItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e2e8f0;

  &:last-child {
    border-bottom: none;
  }
`;

const Rank = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => props.index === 0 ? '#ffd700' : props.index === 1 ? '#c0c0c0' : props.index === 2 ? '#cd7f32' : '#e2e8f0'};
  color: ${props => props.index < 3 ? 'white' : '#4a5568'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  margin-right: 12px;
`;

const ContributorInfo = styled.div`
  flex: 1;
`;

const ContributorName = styled.div`
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 2px;
`;

const ContributorRole = styled.div`
  font-size: 0.875rem;
  color: #718096;
`;

const ContributorStats = styled.div`
  text-align: right;
`;

const Stat = styled.div`
  font-size: 0.875rem;
  color: #4a5568;
  margin-bottom: 2px;
`;

const Score = styled.div`
  font-weight: 600;
  color: #48bb78;
`;

export default Dashboard;