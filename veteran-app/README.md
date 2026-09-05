# SAH Veteran Wellness Mobile App

A gamified mobile application for veterans to track their daily wellness, complete tasks, join groups, and earn points.

## Features

### 📋 Daily Wellness Assessment
- 5-question assessment based on Harvard Trauma Questionnaire (HTQ)
- Tracks: Intrusive Memories, Hypervigilance, Emotional Numbing, Somatic/Sleep, Coping/Safety
- Personalized risk level and recommendations

### ✅ Daily Tasks
- **Mental Tasks**: Breathing exercises, journaling, mindfulness, affirmations
- **Physical Tasks**: Walking, stretching, outdoor activities (with GPS tracking)
- **Social Tasks**: Connection check-ins, group activities
- Point rewards for completion with streak bonuses

### 📍 GPS Tracking
- Real-time location tracking for physical activities
- Distance and duration verification
- Activity history and statistics

### 👥 Veteran Groups
- Join groups for social activities
- Schedule and participate in group activities
- Earn bonus points for group participation
- Track group stats and leaderboard

### 🏆 Points & Rewards
- Earn points for completing tasks, activities, and social interactions
- Unlock badges and rewards (Bronze, Silver, Gold, Platinum)
- Streak bonuses for consecutive days
- Leaderboard to track progress

### 👤 Profile & Settings
- Military background info (branch, rank, years of service)
- GPS and notification preferences
- Privacy controls

### 📊 Admin Dashboard
- Overview of all veteran engagement
- Task completion analytics
- Group activity statistics
- Wellness trend analysis
- Data export (JSON/CSV)

## Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: React Navigation (Stack + Tab)
- **Storage**: AsyncStorage for local persistence
- **Location**: Expo Location API
- **Backend**: FastAPI (Python) running on `http://localhost:8001`

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)

### Installation & Launch

```bash
# 1. Navigate to app directory
cd veteran-app

# 2. Install dependencies
npm install

# 3. Run in web browser (desktop/laptop)
npm run web

# 4. Or run on mobile phone (iOS / Android with Expo Go)
npm start
```

### Running on Emulator

```bash
# Android
npm run android

# iOS (Mac only)
npm run ios
```

## Project Structure

```
veteran-app/
├── App.js                    # Main app with navigation
├── src/
│   ├── screens/
│   │   ├── LoginScreen.js      # Login with email
│   │   ├── AssessmentScreen.js # 5-question HTQ assessment
│   │   ├── DashboardScreen.js  # Home dashboard
│   │   ├── TasksScreen.js      # Task list with filters
│   │   ├── TaskDetailScreen.js # Task instructions
│   │   ├── GPSTrackingScreen.js# GPS activity tracking
│   │   ├── GroupsScreen.js     # Browse/join groups
│   │   ├── GroupDetailScreen.js# Group details & activities
│   │   ├── PointsScreen.js     # Points & rewards
│   │   ├── ProfileScreen.js    # User profile
│   │   └── AdminScreen.js      # Admin dashboard
│   ├── services/
│   │   ├── api.js              # Backend API client
│   │   └── storage.js          # Local storage service
│   └── components/             # Reusable components
└── package.json
```

## Backend Integration

The app connects to the FastAPI backend at `http://localhost:8000/api`. Key endpoints:

- `POST /api/veterans/` - Create veteran profile
- `POST /api/veterans/{id}/assessment` - Submit wellness assessment
- `GET /api/veterans/{id}/dashboard` - Get dashboard data
- `POST /api/veterans/{id}/tasks/generate` - Generate daily tasks
- `POST /api/veterans/{id}/gps/track` - Record GPS location
- `GET /api/groups` - List veteran groups
- `GET /api/admin/dashboard` - Admin analytics

## 5-Question Wellness Assessment

Based on Harvard Trauma Questionnaire (HTQ):

1. **Intrusive Memories**: "How much were you bothered by sudden, unwanted memories or reminders of past combat experiences?"
2. **Hypervigilance**: "How alert, jumpy, or 'on guard' did you feel during your day-to-day activities today?"
3. **Emotional Connection**: "Did you feel emotionally connected to the people around you today?"
4. **Physical & Sleep**: "How much did physical tension, racing thoughts, or sleep issues impact your energy levels today?"
5. **Coping & Safety**: "Right now, how grounded and in control of your stress levels do you feel?"

Each question is scored 1-4, total score 5-20.

## Data Collection for Admin

The app collects:
- Daily task completion rates
- GPS activity data (distance, duration)
- Social interaction frequency
- Group participation
- Points and streak data
- Wellness assessment scores

All data is encrypted and stored securely. Admin can export data for analysis.

## License

Internal use only — hackathon prototype.
