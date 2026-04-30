# 🐾 Pawse — Smart Focus Companion

A React Native / Expo app that demos a smart notification filter for focus sessions. Notifications are run through a TF-IDF + Logistic Regression classifier trained on ~300 labeled examples, then either allowed through (urgent) or suppressed (non-urgent) during a focus session.

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- npm (comes with Node)
- [Expo Go](https://expo.dev/client) app on your phone, OR an Android/iOS simulator

### Install & Run

```bash
git clone <repo-url>
cd frontend-filterdemo
npm install
npx expo start
```

Then either:
- **Phone**: Scan the QR code in your terminal with the Expo Go app (Android) or the Camera app (iOS)
- **Web**: Press `w` in the terminal to open in your browser
- **Simulator**: Press `a` (Android) or `i` (iOS)

If your phone won't connect, try:
```bash
npx expo start --tunnel
```

---

## Project Structure

```
frontend-filterdemo/
├── App.js              # App entry point — loads fonts & wraps navigator
├── index.js            # Expo bootstrap file
├── app.json            # Expo config (name, plugins, slug)
├── model.json          # Trained classifier weights (TF-IDF + LR)
├── package.json        # Dependencies
└── src/
    ├── theme.js        # Design system: colors, spacing, fonts, shadows
    ├── components/
    │   ├── Header.js              # Shared top bar (logo + profile avatar)
    │   └── CircularProgress.js    # SVG progress ring used in active session
    ├── navigation/
    │   └── AppNavigator.js        # Routes: SignIn → Main tabs → Profile modal
    └── screens/
        ├── SignInScreen.js        # Login screen (entry point)
        ├── HomeScreen.js          # Set focus duration, prep checklist, start
        ├── ActiveSessionScreen.js # Live session timer + notification demo
        ├── StatsScreen.js         # Focus stats, weekly chart, rewards grid
        ├── CalendarScreen.js      # Calendar sync settings + upcoming events
        ├── SettingsScreen.js      # Plan, theme, audio, sign out
        ├── ProfileScreen.js       # Edit name, birthday, email
        └── MiscScreens.js         # FilterSettings, Overrides, CalendarSync
```

---

## Key Files

| File | What it does |
|------|--------------|
| `App.js` | Loads custom Google Fonts (Nunito, DM Sans, Plus Jakarta Sans), then mounts the navigator. Shows a loading spinner until fonts are ready. |
| `model.json` | Output of `train.py` from the classifier project. Contains the TF-IDF vocabulary, IDF weights, logistic regression coefficients, and intercept. |
| `src/theme.js` | All colors, spacing, fonts, and shadow definitions. Change values here to update the entire app's look. |
| `ActiveSessionScreen.js` | The core demo — runs notifications through `tfidfClassify()` (a JS port of the Python model) and either suppresses them or shows an urgent modal. |

---

## How the Classifier Works

The classifier is trained in Python (separate repo) using `scikit-learn`:
1. **TF-IDF Vectorizer** with 1–2 word n-grams
2. **Logistic Regression** with balanced class weights

The trained model is exported to `model.json` and reimplemented in JavaScript inside `ActiveSessionScreen.js` so it runs on-device with zero network calls.

Accuracy on test data: **~80%** with 300 training examples.

---

## Demo Flow

1. Open the app → Sign In screen → tap any button to enter
2. Home screen → set focus duration (− / +) → tap **Start Session**
3. On the active session screen, tap **▶** to start the notification simulation
4. Watch as fake notifications roll in:
   - **Urgent** → red modal pops up, blocks further notifications until dismissed
   - **Non-urgent** → silently added to the suppressed feed below

---

## Common Issues

**"Plugin expo-font missing"** — Make sure `app.json` includes:
```json
{ "expo": { "plugins": ["expo-font"] } }
```

**App is blank on web** — Try opening in Chrome or Firefox (not Edge), and check the browser console for errors.

**QR code won't connect on phone** — Run `npx expo start --tunnel` instead. Phone and laptop need internet but not the same WiFi.

---

## Tech Stack

- **React Native** + **Expo** for the app
- **React Navigation** (native-stack + bottom-tabs)
- **MaterialIcons** from `@expo/vector-icons`
- **scikit-learn** (Python) for training the classifier
