/**
 * SAH Veteran Wellness App
 */
import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator, Platform } from 'react-native';
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
import CrisisScreen from './src/screens/CrisisScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import DMScreen from './src/screens/DMScreen';

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
          if (route.name === 'Dashboard') iconName = focused ? 'shield' : 'shield-outline';
          else if (route.name === 'Tasks') iconName = focused ? 'checkbox' : 'checkbox-outline';
          else if (route.name === 'Groups') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Friends') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Points') iconName = focused ? 'trophy' : 'trophy-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
              backgroundColor: focused ? '#F7DFCC' : 'transparent',
            }}>
              <Ionicons name={iconName} size={20} color={focused ? '#8C4A1E' : '#786F68'} />
            </View>
          );
        },
        tabBarActiveTintColor: '#8C4A1E',
        tabBarInactiveTintColor: '#786F68',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8DCCE',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 6,
          shadowColor: '#282524',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 8,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomColor: '#E8DCCE',
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#1C1917',
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: 17,
          color: '#1C1917',
          letterSpacing: -0.3,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ headerTitle: 'VALOR Headquarters' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ headerTitle: 'Daily Recovery Drills' }} />
      <Tab.Screen name="Groups" component={GroupsScreen} options={{ headerTitle: 'Squadrons & Units' }} />
      <Tab.Screen name="Friends" component={FriendsScreen} options={{ headerTitle: 'Comrades & Comms' }} />
      <Tab.Screen name="Points" component={PointsScreen} options={{ headerTitle: 'Valor Vault & Honors' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerTitle: 'Veteran Dossier' }} />
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
      <Stack.Screen
        name="DM"
        component={DMScreen}
        options={{
          headerShown: false,
        }}
      />
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
        name="Assessment"
        component={AssessmentScreen}
        options={{
          title: 'Daily Wellness Check-In',
          headerStyle: { backgroundColor: theme.colors.cream[200], borderBottomColor: theme.colors.cream[400], borderBottomWidth: 1 },
          headerTintColor: theme.colors.espresso[900],
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
    try {
      if (Platform.OS === 'web') return;
      const granted = await notificationService.requestPermission();
      if (granted) {
        await notificationService.scheduleDailyReminder(9, 0);
      }
    } catch (e) {
      console.warn('Notifications setup skipped:', e);
    }
  };

  const checkAuth = async () => {
    try {
      const storedUser = await storage.get('user');
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (e) { /* no stored auth */ } finally { setLoading(false); }
  };

  const login = async (email, password, role = 'veteran', customUser = null) => {
    if (customUser) {
      await storage.set('user', JSON.stringify(customUser));
      setUser(customUser);
      return { success: true, user: customUser };
    }
    try {
      const res = await authAPI.login(email, password, role);
      if (res?.user) {
        await storage.set('user', JSON.stringify(res.user));
        setUser(res.user);
        return { success: true, user: res.user };
      }
    } catch (e) {
      console.warn('Backend login fallback:', e);
    }
    // Mock user fallback based on email/role
    let mockUser;
    const emailLower = (email || '').toLowerCase();
    if (role === 'counselor' || emailLower.includes('nair') || emailLower.includes('counselor')) {
      mockUser = {
        id: 'counselor-01',
        name: 'Dr. Ananya Nair',
        email: email || 'a.nair@amrita-health.org',
        role: 'counselor',
        rank: 'Clinical Lead',
        service_branch: 'Trauma & Wellness Specialist',
        total_points: 999,
        current_streak: 30,
        tasks_completed: 150,
        isEmailVerified: true,
      };
    } else if (emailLower.includes('kabir')) {
      mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Maj. Kabir Singh',
        email: email || 'kabir.singh@iaf.gov.in',
        role: 'veteran',
        rank: 'Major',
        service_branch: 'Indian Air Force',
        total_points: 420,
        current_streak: 12,
        tasks_completed: 24,
        isEmailVerified: true,
      };
    } else if (emailLower.includes('arjun')) {
      mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Sub. Arjun Das',
        email: email || 'arjun.das@navy.gov.in',
        role: 'veteran',
        rank: 'Subedar',
        service_branch: 'Indian Navy (MARCOS)',
        total_points: 180,
        current_streak: 3,
        tasks_completed: 8,
        isEmailVerified: true,
      };
    } else {
      mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Capt. Vikram Rathore',
        email: email || 'vikram.rathore@para.mod.gov.in',
        role: 'veteran',
        rank: 'Captain',
        service_branch: 'Indian Army (Para SF)',
        total_points: 335,
        current_streak: 5,
        tasks_completed: 16,
        isEmailVerified: true,
      };
    }
    await storage.set('user', JSON.stringify(mockUser));
    setUser(mockUser);
    return { success: true, user: mockUser };
  };

  const register = async (userData) => {
    try {
      const res = await authAPI.register(userData);
      if (res?.user) {
        await storage.set('user', JSON.stringify(res.user));
        setUser(res.user);
        return { success: true, user: res.user };
      }
    } catch (e) {
      console.warn('Backend register fallback:', e);
    }
    const isCounselor = userData.role === 'counselor';
    const mockUser = isCounselor
      ? {
          id: `counselor-${Date.now()}`,
          name: userData.name || 'Dr. Clinical Counselor',
          email: userData.email,
          role: 'counselor',
          rank: 'Clinical Specialist',
          title: userData.title || 'Licensed Clinical Counselor',
          specialization: userData.specialization || 'Trauma & PTSD Recovery',
          institution: userData.institution || 'Amrita Health & Rehabilitation',
          avatarUrl: 'https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200',
          isEmailVerified: true,
        }
      : {
          id: `vet-${Date.now()}`,
          name: userData.name || 'Veteran Soldier',
          email: userData.email,
          role: 'veteran',
          rank: userData.rank || 'Soldier',
          service_branch: userData.service_branch || userData.serviceBranch || 'Indian Army',
          total_points: 50,
          current_streak: 1,
          tasks_completed: 0,
          isEmailVerified: true,
          assignedCounselorId: 'counselor-01',
          assignedCounselorName: 'Dr. Ananya Nair',
        };
    await storage.set('user', JSON.stringify(mockUser));
    setUser(mockUser);
    return { success: true, user: mockUser };
  };

  const logout = async () => {
    try {
      await storage.remove('user');
    } catch (e) {
      console.warn('Logout storage remove failed:', e);
    }
    setUser(null);
  };

  const updatePoints = async (pointsToAdd) => {
    if (!user) return;
    const newTotal = (user.total_points || 0) + pointsToAdd;
    const updatedUser = {
      ...user,
      total_points: newTotal,
    };
    try {
      await storage.set('user', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('storage updatePoints error:', e);
    }
    setUser(updatedUser);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.cream[200] }}>
        <ActivityIndicator size="large" color={theme.colors.rust[500]} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, register, updatePoints }}>
      <NavigationContainer>
        <StatusBar style="light" />
        {user ? <MainStack /> : <AuthStack />}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
