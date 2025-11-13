// testing-account-service.js - Service untuk akun testing yang terintegrasi dengan data
// File ini menghubungkan akun testing dengan data input yang sudah ada

import { getRandomAccount } from './mock-accounts.js';
import { getActivitiesFromLocalStorage, getActivityStatsFromLocalStorage, getInputHistory } from './local-storage-service.js';

/**
 * Get testing account with integrated data
 * @returns {Promise<Object>} - Testing account with real data
 */
export async function getTestingAccountWithData() {
  try {
    // Get the base testing account (using first account as fixed testing account)
    const testingAccount = getRandomAccount();
    
    // Get real data from Local Storage
    const activities = await getActivitiesFromLocalStorage();
    const stats = await getActivityStatsFromLocalStorage();
    const inputHistory = await getInputHistory();
    
    // Calculate real stats from data
    const realStats = {
      forumPosts: testingAccount.stats.forumPosts, // Keep original
      quizCompleted: testingAccount.stats.quizCompleted, // Keep original
      activeDays: testingAccount.stats.activeDays, // Keep original
      ecoScore: stats.totalEcoScore || 0,
      wasteManaged: stats.totalWasteManaged || 0,
      economicValue: stats.totalEconomicValue || 0,
      activitiesCount: activities.length,
      inputHistoryCount: inputHistory.length
    };
    
    // Create enhanced testing account with real data
    const enhancedAccount = {
      ...testingAccount,
      stats: realStats,
      realData: {
        activities: activities,
        inputHistory: inputHistory,
        lastActivity: activities.length > 0 ? activities[0] : null,
        dataSummary: {
          totalActivities: activities.length,
          totalInputHistory: inputHistory.length,
          lastActivityDate: activities.length > 0 ? activities[0].createdAt : null,
          ecoScore: stats.totalEcoScore || 0,
          wasteManaged: stats.totalWasteManaged || 0,
          economicValue: stats.totalEconomicValue || 0
        }
      }
    };
    
    console.log('✅ Testing account loaded with real data:', enhancedAccount.realData.dataSummary);
    return enhancedAccount;
    
  } catch (error) {
    console.error('❌ Error loading testing account with data:', error);
    // Fallback to basic testing account
    return getRandomAccount();
  }
}

/**
 * Update testing account stats with latest data
 * @param {Object} account - Current account object
 * @returns {Promise<Object>} - Updated account with latest stats
 */
export async function updateTestingAccountStats(account) {
  try {
    const stats = await getActivityStatsFromLocalStorage();
    const activities = await getActivitiesFromLocalStorage();
    
    return {
      ...account,
      stats: {
        ...account.stats,
        ecoScore: stats.totalEcoScore || 0,
        wasteManaged: stats.totalWasteManaged || 0,
        economicValue: stats.totalEconomicValue || 0,
        activitiesCount: activities.length
      },
      realData: {
        ...account.realData,
        activities: activities,
        dataSummary: {
          ...account.realData.dataSummary,
          totalActivities: activities.length,
          ecoScore: stats.totalEcoScore || 0,
          wasteManaged: stats.totalWasteManaged || 0,
          economicValue: stats.totalEconomicValue || 0
        }
      }
    };
  } catch (error) {
    console.error('❌ Error updating testing account stats:', error);
    return account;
  }
}

/**
 * Get testing account data summary for display
 * @param {Object} account - Testing account object
 * @returns {Object} - Data summary for UI display
 */
export function getTestingAccountDataSummary(account) {
  if (!account.realData) {
    return {
      hasData: false,
      message: 'Belum ada data input'
    };
  }
  
  const { dataSummary } = account.realData;
  
  return {
    hasData: dataSummary.totalActivities > 0,
    totalActivities: dataSummary.totalActivities,
    totalInputHistory: dataSummary.totalInputHistory,
    ecoScore: dataSummary.ecoScore,
    wasteManaged: dataSummary.wasteManaged,
    economicValue: dataSummary.economicValue,
    lastActivityDate: dataSummary.lastActivityDate,
    message: dataSummary.totalActivities > 0 
      ? `Anda memiliki ${dataSummary.totalActivities} aktivitas dan ${dataSummary.totalInputHistory} data input`
      : 'Belum ada data input'
  };
}

console.log('✅ Testing account service loaded');
