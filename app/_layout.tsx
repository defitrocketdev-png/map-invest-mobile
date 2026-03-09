// IMPORTANT: Import backgroundLocation service FIRST to ensure TaskManager.defineTask runs at module load time
import '@/services/backgroundLocation';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initDB } from '@/services/database';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Initialize database early on app start
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        console.log('✅ Database initialized in RootLayout');
      } catch (error) {
        console.error('❌ Failed to initialize database:', error);
      }
    };

    initialize();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
