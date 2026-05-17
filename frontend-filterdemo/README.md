# Pawse — Mobile App

A React Native / Expo app for managing focus sessions. Users set a timer, lock their phone in the Pawse hardware box, and the app filters incoming notifications using an ML classifier. Urgent notifications surface immediately; non-urgent ones are suppressed until the session ends.


## How the Classifier Works

The app uses a two-tier classifier depending on connectivity.

When online, notifications are sent to a fine-tuned MobileBERT model hosted on Hugging Face for higher accuracy inference.

When offline, a TF-IDF + Logistic Regression model runs fully on-device using weights exported to `model.json`. The model was trained in Python with scikit-learn on labeled notification data and reimplemented in JavaScript so it requires zero network calls.

Live demo: [Hugging Face Space](https://huggingface.co/spaces/nolmonone/pawse-classifier)


## Quick Start

Prerequisites:
- Node.js v18 or newer
- Expo Go app on your phone, or an Android/iOS simulator

```bash
cd frontend-filterdemo
npm install
npx expo start
```

Then either scan the QR code with Expo Go on Android, use the Camera app on iOS, or press `w` to open in browser.

If your phone cannot connect, run:

```bash
npx expo start --tunnel
```


## Project Structure

```
frontend-filterdemo/
├── App.js                        # App entry point, loads fonts and mounts navigator
├── index.js                      # Expo bootstrap
├── app.json                      # Expo config
├── model.json                    # Exported TF-IDF + LR model weights for offline inference
├── package.json                  # Dependencies
└── src/
    ├── theme.js                  # Design system: colors, spacing, fonts, shadows
    ├── components/
    │   ├── Header.js             # Shared top bar
    │   └── CircularProgress.js   # SVG progress ring for active session
    ├── context/
    │   └── PawseBoxContext.js    # Global state for hardware box connection
    ├── hooks/
    │   ├── usePawseBox.js        # Hook for Bluetooth box communication
    │   └── usePawseBoxWifi.js    # Hook for WiFi box communication
    ├── lib/
    │   ├── AuthContext.js        # Authentication state and helpers
    │   └── supabase.js           # Supabase client setup
    ├── navigation/
    │   └── AppNavigator.js       # Routes: SignIn, Main tabs, Profile modal
    ├── utils/
    │   └── responsive.js         # Responsive sizing utilities
    └── screens/
        ├── active-session/
        │   ├── classifier.js         # JS inference logic for on-device model
        │   ├── FeedCard.js           # Suppressed notification card component
        │   ├── notifications.js      # Notification data and simulation
        │   ├── NotifPanel.js         # Notification feed panel
        │   ├── UrgentModal.js        # Modal shown for urgent notifications
        │   ├── useNotifSimulator.js  # Hook for simulating incoming notifications
        │   └── utils.js              # Session helper utilities
        ├── ActiveSessionScreen.js    # Live timer and notification filtering
        ├── CalendarScreen.js         # Calendar sync settings
        ├── GracePeriodScreen.js      # Grace period before session locks
        ├── HomeScreen.js             # Set focus duration and start session
        ├── MiscScreens.js            # Filter settings and overrides
        ├── OverrideLogScreen.js      # Log of emergency overrides
        ├── ProfileScreen.js          # Edit profile
        ├── SchoolScreen.js           # School mode session management
        ├── SettingsScreen.js         # App preferences and sign out
        ├── SignInScreen.js           # Login screen
        ├── StatsScreen.js            # Focus stats and weekly chart
        └── SubscriptionScreen.js     # Subscription and plan management
```

## Tech Stack

| Layer | Technology |
|---|---|
| App | React Native, Expo |
| Navigation | React Navigation (native stack + bottom tabs) |
| ML (online) | MobileBERT via Hugging Face |
| ML (offline) | TF-IDF + Logistic Regression, exported to JSON |
| Training | Python, scikit-learn |
