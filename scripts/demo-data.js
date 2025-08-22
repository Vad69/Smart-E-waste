const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const EwasteItem = require('../models/EwasteItem');
const Vendor = require('../models/Vendor');
const Campaign = require('../models/Campaign');

// Sample data
const sampleUsers = [
  {
    username: 'admin',
    email: 'admin@ewaste.com',
    password: 'admin123',
    role: 'admin',
    department: 'IT',
    phone: '+1234567890'
  },
  {
    username: 'manager1',
    email: 'manager@ewaste.com',
    password: 'manager123',
    role: 'manager',
    department: 'Facilities',
    phone: '+1234567891'
  },
  {
    username: 'staff1',
    email: 'staff@ewaste.com',
    password: 'staff123',
    role: 'staff',
    department: 'Computer Science',
    phone: '+1234567892'
  },
  {
    username: 'student1',
    email: 'student@ewaste.com',
    password: 'student123',
    role: 'student',
    department: 'Computer Science',
    phone: '+1234567893'
  },
  {
    username: 'resident1',
    email: 'resident@ewaste.com',
    password: 'resident123',
    role: 'resident',
    building: 'Building A',
    room: '101',
    phone: '+1234567894'
  }
];

const sampleVendors = [
  {
    name: 'John Smith',
    companyName: 'GreenTech Recycling',
    email: 'john@greentech.com',
    phone: '+1987654321',
    services: ['recycling', 'refurbishment', 'disposal'],
    categories: ['computer', 'mobile', 'battery', 'lab_equipment'],
    coverage: {
      areas: ['Downtown', 'University District', 'Tech Park'],
      radius: 25
    },
    status: 'active',
    rating: {
      average: 4.5,
      totalReviews: 12
    }
  },
  {
    name: 'Sarah Johnson',
    companyName: 'EcoDispose Solutions',
    email: 'sarah@ecodispose.com',
    phone: '+1987654322',
    services: ['recycling', 'data_destruction', 'certification'],
    categories: ['computer', 'mobile', 'accessories'],
    coverage: {
      areas: ['Downtown', 'University District'],
      radius: 20
    },
    status: 'active',
    rating: {
      average: 4.2,
      totalReviews: 8
    }
  }
];

const sampleEwasteItems = [
  {
    name: 'Dell OptiPlex 7010 Desktop',
    category: 'computer',
    subcategory: 'desktop',
    brand: 'Dell',
    model: 'OptiPlex 7010',
    age: 8,
    condition: 'fair',
    classification: 'recyclable',
    department: 'Computer Science',
    location: {
      building: 'Engineering Building',
      room: 'CS Lab 101',
      floor: '1st Floor'
    },
    description: 'Outdated desktop computer from computer lab',
    estimatedWeight: 8.5,
    estimatedValue: 150,
    hazardousMaterials: ['lead', 'brominated_flame_retardants'],
    recyclingPotential: 85
  },
  {
    name: 'iPhone 8',
    category: 'mobile',
    subcategory: 'smartphone',
    brand: 'Apple',
    model: 'iPhone 8',
    age: 6,
    condition: 'good',
    classification: 'reusable',
    department: 'Computer Science',
    location: {
      building: 'Engineering Building',
      room: 'Mobile Lab',
      floor: '2nd Floor'
    },
    description: 'iPhone 8 for mobile development testing',
    estimatedWeight: 0.148,
    estimatedValue: 200,
    hazardousMaterials: ['none'],
    recyclingPotential: 90
  },
  {
    name: 'HP LaserJet Pro M404n',
    category: 'accessories',
    subcategory: 'printer',
    brand: 'HP',
    model: 'LaserJet Pro M404n',
    age: 7,
    condition: 'poor',
    classification: 'recyclable',
    department: 'Facilities',
    location: {
      building: 'Main Building',
      room: 'Print Room',
      floor: '1st Floor'
    },
    description: 'Office printer with paper feed issues',
    estimatedWeight: 12.5,
    estimatedValue: 100,
    hazardousMaterials: ['lead', 'pvc'],
    recyclingPotential: 75
  },
  {
    name: 'Samsung Galaxy Tab A',
    category: 'mobile',
    subcategory: 'tablet',
    brand: 'Samsung',
    model: 'Galaxy Tab A',
    age: 5,
    condition: 'excellent',
    classification: 'reusable',
    department: 'Education',
    location: {
      building: 'Education Building',
      room: 'Digital Learning Lab',
      floor: '3rd Floor'
    },
    description: 'Tablet for educational purposes',
    estimatedWeight: 0.5,
    estimatedValue: 250,
    hazardousMaterials: ['none'],
    recyclingPotential: 95
  },
  {
    name: 'Dell Latitude E6430',
    category: 'computer',
    subcategory: 'laptop',
    brand: 'Dell',
    model: 'Latitude E6430',
    age: 10,
    condition: 'broken',
    classification: 'recyclable',
    department: 'Business',
    location: {
      building: 'Business Building',
      room: 'MBA Lab',
      floor: '2nd Floor'
    },
    description: 'Laptop with broken screen and keyboard',
    estimatedWeight: 2.2,
    estimatedValue: 50,
    hazardousMaterials: ['lead', 'brominated_flame_retardants', 'pvc'],
    recyclingPotential: 70
  }
];

const sampleCampaigns = [
  {
    title: 'Spring E-Waste Collection Drive',
    description: 'Join us for our annual spring e-waste collection drive. Help us make our campus greener by properly disposing of your electronic waste.',
    type: 'collection_drive',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-03-31'),
    targetAudience: ['students', 'staff', 'faculty'],
    departments: ['Computer Science', 'Engineering', 'Business'],
    goals: {
      targetItems: 100,
      targetWeight: 500,
      targetParticipants: 50
    },
    status: 'active',
    tags: ['spring', 'collection', 'campus']
  },
  {
    title: 'Digital Sustainability Challenge',
    description: 'A month-long challenge to promote digital sustainability. Learn about e-waste and earn points for sustainable practices.',
    type: 'challenge',
    startDate: new Date('2024-04-01'),
    endDate: new Date('2024-04-30'),
    targetAudience: ['students', 'staff'],
    departments: ['Computer Science', 'Environmental Science'],
    goals: {
      targetItems: 75,
      targetWeight: 300,
      targetParticipants: 100
    },
    status: 'draft',
    tags: ['challenge', 'sustainability', 'education']
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ewaste-management');
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await EwasteItem.deleteMany({});
    await Vendor.deleteMany({});
    await Campaign.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      const savedUser = await user.save();
      createdUsers.push(savedUser);
      console.log(`   Created user: ${savedUser.username} (${savedUser.role})`);
    }

    // Create vendors
    console.log('🏢 Creating vendors...');
    const createdVendors = [];
    for (const vendorData of sampleVendors) {
      const vendor = new Vendor(vendorData);
      const savedVendor = await vendor.save();
      createdVendors.push(savedVendor);
      console.log(`   Created vendor: ${savedVendor.companyName}`);
    }

    // Create e-waste items
    console.log('🗑️  Creating e-waste items...');
    const createdItems = [];
    for (const itemData of sampleEwasteItems) {
      const item = new EwasteItem({
        ...itemData,
        reportedBy: createdUsers.find(u => u.role === 'staff' || u.role === 'student')?._id || createdUsers[0]._id
      });
      
      // Generate QR code
      const qrCode = `EW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      item.qrCode = qrCode;
      
      // Add timeline
      item.timeline.push({
        action: 'Item Reported',
        status: 'reported',
        user: item.reportedBy,
        notes: 'E-waste item reported by user'
      });

      const savedItem = await item.save();
      createdItems.push(savedItem);
      console.log(`   Created item: ${savedItem.name}`);
    }

    // Create campaigns
    console.log('🎯 Creating campaigns...');
    for (const campaignData of sampleCampaigns) {
      const campaign = new Campaign({
        ...campaignData,
        organizers: [{
          user: createdUsers.find(u => u.role === 'manager')?._id || createdUsers[0]._id,
          role: 'coordinator'
        }]
      });
      
      const savedCampaign = await campaign.save();
      console.log(`   Created campaign: ${savedCampaign.title}`);
    }

    // Update user stats
    console.log('📊 Updating user statistics...');
    for (const user of createdUsers) {
      if (user.role === 'staff' || user.role === 'student') {
        user.totalEwasteContributed = Math.floor(Math.random() * 5) + 1;
        user.updateGreenScore();
        await user.save();
      }
    }

    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Users: ${createdUsers.length}`);
    console.log(`   Vendors: ${createdVendors.length}`);
    console.log(`   E-Waste Items: ${createdItems.length}`);
    console.log(`   Campaigns: ${sampleCampaigns.length}`);
    console.log('');
    console.log('🔑 Demo Login Credentials:');
    console.log('   Admin: admin@ewaste.com / admin123');
    console.log('   Manager: manager@ewaste.com / manager123');
    console.log('   Staff: staff@ewaste.com / staff123');
    console.log('   Student: student@ewaste.com / student123');
    console.log('   Resident: resident@ewaste.com / resident123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedDatabase();