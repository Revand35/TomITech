// mock-accounts.js - Data akun acak untuk testing
// File ini berisi data akun dummy untuk keperluan testing aplikasi

export const mockAccounts = [
  {
    id: 'user_001',
    email: 'sari.wijaya@email.com',
    displayName: 'Sari Wijaya',
    role: 'UMKM Owner',
    company: 'Toko Hijau Sari',
    industry: 'Retail & F&B',
    joinDate: '2024-01-15',
    avatar: '👩‍💼',
    stats: {
      forumPosts: 12,
      quizCompleted: 8,
      activeDays: 45,
      ecoScore: 87,
      wasteManaged: 250,
      economicValue: 7500000
    },
    preferences: {
      notifications: true,
      theme: 'light',
      language: 'id'
    }
  },
  {
    id: 'user_002',
    email: 'budi.santoso@email.com',
    displayName: 'Budi Santoso',
    role: 'Environmental Consultant',
    company: 'Eco Solutions Indonesia',
    industry: 'Environmental Services',
    joinDate: '2024-02-03',
    avatar: '👨‍🔬',
    stats: {
      forumPosts: 28,
      quizCompleted: 15,
      activeDays: 67,
      ecoScore: 92,
      wasteManaged: 450,
      economicValue: 12500000
    },
    preferences: {
      notifications: true,
      theme: 'dark',
      language: 'id'
    }
  },
  {
    id: 'user_003',
    email: 'maya.putri@email.com',
    displayName: 'Maya Putri',
    role: 'Sustainability Manager',
    company: 'Green Tech Solutions',
    industry: 'Technology',
    joinDate: '2024-01-28',
    avatar: '👩‍💻',
    stats: {
      forumPosts: 19,
      quizCompleted: 12,
      activeDays: 52,
      ecoScore: 89,
      wasteManaged: 320,
      economicValue: 9800000
    },
    preferences: {
      notifications: false,
      theme: 'light',
      language: 'en'
    }
  },
  {
    id: 'user_004',
    email: 'ahmad.rahman@email.com',
    displayName: 'Ahmad Rahman',
    role: 'Waste Management Specialist',
    company: 'Limbah Bersih Co.',
    industry: 'Waste Management',
    joinDate: '2024-03-10',
    avatar: '👨‍🔧',
    stats: {
      forumPosts: 35,
      quizCompleted: 20,
      activeDays: 78,
      ecoScore: 95,
      wasteManaged: 680,
      economicValue: 18500000
    },
    preferences: {
      notifications: true,
      theme: 'light',
      language: 'id'
    }
  },
  {
    id: 'user_005',
    email: 'lina.sari@email.com',
    displayName: 'Lina Sari',
    role: 'Green Accounting Analyst',
    company: 'Eco Finance Group',
    industry: 'Finance & Accounting',
    joinDate: '2024-02-18',
    avatar: '👩‍💼',
    stats: {
      forumPosts: 22,
      quizCompleted: 18,
      activeDays: 61,
      ecoScore: 91,
      wasteManaged: 380,
      economicValue: 11200000
    },
    preferences: {
      notifications: true,
      theme: 'dark',
      language: 'id'
    }
  },
  {
    id: 'user_006',
    email: 'david.kurniawan@email.com',
    displayName: 'David Kurniawan',
    role: 'Circular Economy Expert',
    company: 'Circular Hub Indonesia',
    industry: 'Consulting',
    joinDate: '2024-01-05',
    avatar: '👨‍🎓',
    stats: {
      forumPosts: 41,
      quizCompleted: 25,
      activeDays: 89,
      ecoScore: 96,
      wasteManaged: 520,
      economicValue: 15200000
    },
    preferences: {
      notifications: true,
      theme: 'light',
      language: 'en'
    }
  },
  {
    id: 'user_007',
    email: 'rina.melati@email.com',
    displayName: 'Rina Melati',
    role: 'Sustainable Business Owner',
    company: 'Eco Fashion Store',
    industry: 'Fashion & Retail',
    joinDate: '2024-03-22',
    avatar: '👩‍🎨',
    stats: {
      forumPosts: 15,
      quizCompleted: 9,
      activeDays: 38,
      ecoScore: 84,
      wasteManaged: 180,
      economicValue: 6200000
    },
    preferences: {
      notifications: false,
      theme: 'light',
      language: 'id'
    }
  },
  {
    id: 'user_008',
    email: 'tono.wijaya@email.com',
    displayName: 'Tono Wijaya',
    role: 'Environmental Engineer',
    company: 'Green Engineering Ltd',
    industry: 'Engineering',
    joinDate: '2024-02-12',
    avatar: '👨‍🔬',
    stats: {
      forumPosts: 31,
      quizCompleted: 16,
      activeDays: 73,
      ecoScore: 93,
      wasteManaged: 420,
      economicValue: 13800000
    },
    preferences: {
      notifications: true,
      theme: 'dark',
      language: 'id'
    }
  }
];

/**
 * Get random account from mock data
 * @returns {Object} - Random account data
 */
export function getRandomAccount() {
  const randomIndex = Math.floor(Math.random() * mockAccounts.length);
  return mockAccounts[randomIndex];
}

/**
 * Get account by ID
 * @param {string} id - Account ID
 * @returns {Object|null} - Account data or null if not found
 */
export function getAccountById(id) {
  return mockAccounts.find(account => account.id === id) || null;
}

/**
 * Get all accounts
 * @returns {Array} - All mock accounts
 */
export function getAllAccounts() {
  return mockAccounts;
}

/**
 * Generate random stats for new account
 * @returns {Object} - Random stats data
 */
export function generateRandomStats() {
  return {
    forumPosts: Math.floor(Math.random() * 50) + 1,
    quizCompleted: Math.floor(Math.random() * 30) + 1,
    activeDays: Math.floor(Math.random() * 100) + 1,
    ecoScore: Math.floor(Math.random() * 40) + 60, // 60-100
    wasteManaged: Math.floor(Math.random() * 500) + 100,
    economicValue: Math.floor(Math.random() * 20000000) + 1000000
  };
}

console.log('✅ Mock accounts loaded - 8 test accounts available');
