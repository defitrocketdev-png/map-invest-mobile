# DeFit Atlas App

**Version:** 1.0.0

This is an [Expo](https://expo.dev) project built with React Native and Expo Router for file-based routing. The project uses Expo's managed workflow with a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

## Get started

1. Install dependencies

   ```bash
   yarn install
   ```

2. Start the development server

   ```bash
   yarn start
   ```

Open the app in your development client on:

- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- Physical device with the dev client installed

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Development Build

This project uses a custom development build (dev client) instead of Expo Go. To create a new development build:

```bash
# For iOS
eas build --profile development --platform ios

# For Android
eas build --profile development --platform android
```

## Available Scripts

- `yarn start` - Start the Expo development server
- `yarn android` - Build and run on Android device/emulator (creates native build)
- `yarn ios` - Build and run on iOS simulator (creates native build)
- `yarn web` - Run in web browser
- `yarn lint` - Run ESLint
- `yarn reset-project` - Reset to a blank project

**Note:** `yarn android` and `yarn ios` are used for building native projects when needed, but for day-to-day development with your existing dev client, just use `yarn start`.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
