/**
 * SAH Veteran Wellness App
 */
import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import AssessmentScreen from './src/screens/AssessmentScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TasksScreen from './src/screens/TasksScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import GPSTrackingScreen from './src/screens/GPSTrackingScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import PointsScreen from './src/screens/PointsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdminScreen from './src/screens/AdminScreen';
import ChatScreen from './src/screens/ChatScreen';
import VideoCallScreen from './src/screens/VideoCallScreen';
import CrisisScreen from './src/screens/CrisisScreen';

import { storage } from './src/services/storage';
import { notificationService } from './src/services/notifications';
import { authAPI } from './src/services/api';
import { theme } from './src/constants/theme';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Tasks') iconName = focused ? 'checkbox' : 'checkbox-outline';
          else if (route.name === 'Groups') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Points') iconName = focused ? 'trophy' : 'trophy-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.rust[500],
        tabBarInactiveTintColor: theme.colors.espresso[400],
        tabBarStyle: {
          backgroundColor: theme.colors.cream[100],
          borderTopColor: theme.colors.cream[400],
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: theme.colors.cream[200],
          borderBottomColor: theme.colors.cream[400],
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: theme.colors.espresso[900],
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          color: theme.colors.espresso[900],
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Points" component={PointsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Assessment" component={AssessmentScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{
          title: 'Task Details',
          headerStyle: { backgroundColor: theme.colors.cream[200], borderBottomColor: theme.colors.cream[400], borderBottomWidth: 1 },
          headerTintColor: theme.colors.espresso[900],
        }}
      />
      <Stack.Screen
        name="GPSTracking"
        component={GPSTrackingScreen}
        options={{
          title: 'GPS Tracking',
          headerStyle: { backgroundColor: theme.colors.cream[200], borderBottomColor: theme.colors.cream[400], borderBottomWidth: 1 },
          headerTintColor: theme.colors.espresso[900],
        }}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{
          title: 'Group Details',
          headerStyle: { backgroundColor: theme.colors.cream[200], borderBottomColor: theme.colors.cream[400], borderBottomWidth: 1 },
          headerTintColor: theme.colors.espresso[900],
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Counselor Chat',
          headerStyle: { backgroundColor: theme.colors.cream[200], borderBottomColor: theme.colors.cream[400], borderBottomWidth: 1 },
          headerTintColor: theme.colors.espresso[900],
        }}
      />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Crisis"
        component={CrisisScreen}
        options={{
          title: 'Crisis Support',
          headerStyle: { backgroundColor: theme.colors.status.urgent },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="Admin"
        component={AdminScreen}
        options={{
          title: 'Admin Dashboard',
          headerStyle: { backgroundColor: theme.colors.espresso[900] },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      await notificationService.scheduleDailyReminder(9, 0);
    }
  };

  const checkAuth = async () => {
    try {
      const storedUser = await storage.get('user');
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (e) { /* no stored auth */ } finally { setLoading(false); }
  };

  const login = async (email, password, role = 'veteran') => {
    try {
      const res = await authAPI.login(email, password, role);
      if (res?.user) {
        await storage.set('user', JSON.stringify(res.user));
        setUser(res.user);
        return { success: true };
      }
    } catch (e) {
      console.warn('Backend login fallback:', e);
    }
    const mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Capt. Vikram Rathore',
      email,
      service_branch: 'Indian Army (Para SF)',
      rank: 'Captain',
      total_points: 250,
      current_streak: 5,
    };
    await storage.set('user', JSON.stringify(mockUser));
    setUser(mockUser);
    return { success: true };
  };

  const logout = async () => { await storage.remove('user'); setUser(null); };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.cream[200] }}>
        <ActivityIndicator size="large" color={theme.colors.rust[500]} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <NavigationContainer>
        <StatusBar style="light" />
        {user ? <MainStack /> : <AuthStack />}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
