// Run this in your app's console to reset everything for testing
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function resetDevelopment() {
  try {
    await AsyncStorage.clear();
    console.log('✅ AsyncStorage cleared');
    console.log('🔄 Please restart the app');
    return true;
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
    return false;
  }
}
