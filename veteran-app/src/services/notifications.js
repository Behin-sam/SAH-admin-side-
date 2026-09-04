/**
 * Push Notification Service
 * Handles task reminders, group events, and counselor messages
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {
  // ─── Permission ──────────────────────────────────────────────────────────

  requestPermission: async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Get push token
    if (Platform.OS !== 'web') {
      const token = await Notifications.getExpoPushTokenAsync();
      console.log('Push token:', token.data);
    }

    return true;
  },

  // ─── Task Reminders ──────────────────────────────────────────────────────

  scheduleTaskReminder: async (taskTitle, taskType, delayMinutes = 30) => {
    const typeEmoji = taskType === 'mental' ? '🧠' : taskType === 'physical' ? '💪' : '👥';
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${typeEmoji} Task Reminder`,
        body: `Don't forget: ${taskTitle}`,
        data: { type: 'task_reminder', taskType },
        sound: true,
      },
      trigger: {
        seconds: delayMinutes * 60,
      },
    });
  },

  scheduleDailyReminder: async (hour = 9, minute = 0) => {
    // Cancel existing daily reminders
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule daily task reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌅 Good morning, warrior!',
        body: "Your daily wellness tasks are ready. Let's make today count!",
        data: { type: 'daily_reminder' },
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });

    // Evening check-in reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 Evening Check-in',
        body: "How was your day? Complete your wellness assessment before bed.",
        data: { type: 'evening_reminder' },
        sound: true,
      },
      trigger: {
        hour: 20,
        minute: 0,
        repeats: true,
      },
    });
  },

  // ─── Group Events ────────────────────────────────────────────────────────

  scheduleGroupEventReminder: async (eventTitle, eventTime, location) => {
    // Schedule 1 hour before event
    const eventDate = new Date(eventTime);
    const reminderDate = new Date(eventDate.getTime() - 60 * 60 * 1000);

    if (reminderDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '👥 Group Event Soon',
          body: `${eventTitle} starts in 1 hour at ${location || 'TBD'}`,
          data: { type: 'group_event' },
          sound: true,
        },
        trigger: {
          date: reminderDate,
        },
      });
    }
  },

  // ─── Counselor Messages ──────────────────────────────────────────────────

  scheduleCounselorMessage: async (counselorName, preview) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💬 Message from ${counselorName}`,
        body: preview || 'You have a new message',
        data: { type: 'counselor_message' },
        sound: true,
      },
      trigger: null, // Immediate
    });
  },

  // ─── Streak & Points ────────────────────────────────────────────────────

  scheduleStreakReminder: async (streakCount) => {
    if (streakCount > 0 && streakCount % 7 === 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Streak Bonus!',
          body: `Amazing! You've maintained a ${streakCount}-day streak! Keep it up!`,
          data: { type: 'streak_bonus' },
          sound: true,
        },
        trigger: null,
      });
    }
  },

  // ─── Emergency ───────────────────────────────────────────────────────────

  sendEmergencyNotification: async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 Emergency Support',
        body: 'An on-duty counselor has been notified. Help is on the way.',
        data: { type: 'emergency' },
        sound: true,
      },
      trigger: null,
    });
  },

  // ─── Utility ─────────────────────────────────────────────────────────────

  cancelAll: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  getScheduledCount: async () => {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications.length;
  },
};

export default notificationService;
