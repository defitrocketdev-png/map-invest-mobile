import { Colors } from '@/constants/theme';
import { Image } from 'expo-image';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PermissionExplanationScreenProps {
  onRequestPermission: () => void;
  permissionType: 'initial' | 'upgrade'; // initial = no permission, upgrade = only "when in use"
}

export function PermissionExplanationScreen({
  onRequestPermission,
  permissionType = 'initial'
}: PermissionExplanationScreenProps) {

  const openSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Opens the app's settings page in iOS Settings app
        const supported = await Linking.canOpenURL('app-settings:');
        if (supported) {
          await Linking.openURL('app-settings:');
        } else {
          console.error('Cannot open app settings');
        }
      } else {
        // Opens the app's settings page in Android Settings
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  };

  const isUpgrade = permissionType === 'upgrade';

  return (
    <View style={styles.container}>
      {/* Logo at center top */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.title}>
          {isUpgrade ? 'Enable Background Tracking' : 'Location Access Required'}
        </Text>

        <Text style={styles.description}>
          {isUpgrade
            ? 'To continue tracking your discoveries when the app is in the background, please enable "Always" location permission. This allows MapInvest to record explored areas even when you\'re not actively using the app.'
            : 'MapInvest reveals areas as you explore real-world locations. Location access helps us track and display your discovered areas on the map.'
          }
        </Text>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>
            {isUpgrade ? 'How to enable:' : 'What to do:'}
          </Text>

          {isUpgrade ? (
            <>
              <Text style={styles.instructionStep}>
                1. Tap "Open Settings" below
              </Text>
              <Text style={styles.instructionStep}>
                2. Go to Location settings
              </Text>
              <Text style={styles.instructionStep}>
                {Platform.OS === 'ios'
                  ? '3. Select "Always"'
                  : '3. Select "Allow all the time"'
                }
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.instructionStep}>
                {Platform.OS === 'ios'
                  ? '1. Tap "Open Settings" below'
                  : '1. Tap "Continue" below'
                }
              </Text>
              <Text style={styles.instructionStep}>
                {Platform.OS === 'ios'
                  ? '2. Go to Location settings'
                  : '2. Select "While using the app"'
                }
              </Text>
              <Text style={styles.instructionStep}>
                {Platform.OS === 'ios'
                  ? '3. Select "Always"'
                  : '3. Then change to "Allow all the time"'
                }
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        {isUpgrade ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={openSettings}
          >
            <Text style={styles.primaryButtonText}>Open Settings</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={Platform.OS === 'ios' ? openSettings : onRequestPermission}
          >
            <Text style={styles.primaryButtonText}>
              {Platform.OS === 'ios' ? 'Open Settings' : 'Continue'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info text */}
      <Text style={styles.infoText}>
        {Platform.OS === 'ios'
          ? 'You can change location permissions anytime in Settings → Privacy → Location Services'
          : 'You can change location permissions anytime in Settings → Apps → MapInvest → Permissions'
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  instructionsContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  instructionStep: {
    fontSize: 13,
    color: '#444444',
    lineHeight: 20,
    marginBottom: 6,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoText: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 16,
  },
});
