# Pawse

A smart phone lockbox system that helps people stay focused, built for both schools and individuals. Combines custom hardware with a mobile app and an ML notification classifier.

Semifinalist at the UCI Stella Zhang New Venture Competition and the Beall & Butterworth Product Design Competition.


## Overview

Users lock their phones in a physical lockbox for a set duration. Schools can manage class sessions and track attendance, while individuals can set their own focus timers. An ML notification classifier runs in the background to surface only genuinely urgent notifications so emergencies are never missed.

The classifier uses a two-tier approach: a fine-tuned MobileBERT model (via Hugging Face) when internet is available, falling back to a local TF-IDF + Logistic Regression model when offline. This ensures the feature works reliably in any environment.

**Live classifier demo:** [Hugging Face Space](https://huggingface.co/spaces/nolmonone/pawse-classifier)


## Repository Structure

```
├── frontend-filterdemo/   # React Native (Expo) mobile app
├── hardware_prototype_ble/    # ESP32 firmware (C++)
└── tf-idf/               # Local offline ML classifier
```


## Features

**Mobile App (React Native / Expo)**
- School mode with live countdown timers and session management
- Monthly calendar view with session history logs
- Per-student attendance toggling
- Urgent notification modal with emergency override and resume prompt
- Native Android notification listener via Java module

**Hardware (ESP32)**
- Servo motor controls physical lock/unlock mechanism
- LCD display with scrolling status messages and live session countdown timer
- Communicates with app over Bluetooth

**ML Notification Classifier**
- Online: fine-tuned MobileBERT served via Hugging Face ([training notebook](https://colab.research.google.com/drive/1VNu23q_pq1BW_2QuMoce0KHn3iuaGJX2?usp=sharing))
- Offline: TF-IDF + Logistic Regression model running fully on-device
- Automatically falls back to local model when internet is unavailable
- Classifies notifications as urgent or non-urgent in real time

**Backend**
- Supabase for authentication and data persistence


## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native, Expo |
| Backend | Supabase |
| ML (online) | MobileBERT, Hugging Face |
| ML (offline) | TF-IDF + Logistic Regression, exported to JSON |
| Hardware | ESP32, servo motor, LCD, C++ |


## Getting Started

```bash
cd frontend-filterdemo
npm install
npx expo start
```

For hardware setup, see `hardware_prototype/` for ESP32 firmware and wiring instructions.
For the local classifier, see `tf-idf/train_model.py` to retrain the model.