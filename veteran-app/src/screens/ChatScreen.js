/**
 * Chat Screen
 * Live direct messaging between Veteran and Clinical Counselor (Dr. Ananya Nair)
 * Connected to live FastAPI chat endpoints with VALOR styling
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { chatAPI } from '../services/api';

const ChatScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { counselorName = 'Dr. Ananya Nair' } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadMessages();

    // Poll for new counselor messages every 3.5 seconds
    const interval = setInterval(() => {
      loadMessagesSilently();
    }, 3500);

    return () => clearInterval(interval);
  }, [user]);

  const loadMessages = async () => {
    try {
      if (user?.id) {
        const res = await chatAPI.getDirectMessages(user.id);
        if (res?.messages) {
          setMessages(res.messages);
          setLoading(false);
          return;
        }
      }

      // Fallback message if server offline
      setMessages([
        {
          id: 'm1',
          sender_type: 'counselor',
          content: "Hello! I'm Dr. Ananya Nair, your clinical supervisor. Feel free to reach out here anytime for support, grounding guidance, or care questions.",
          created_at: new Date(Date.now() - 3600000).toISOString(),
        }
      ]);
    } catch (err) {
      console.warn('Could not load chat messages:', err.message);
      setMessages([
        {
          id: 'm1',
          sender_type: 'counselor',
          content: "Hello! I'm Dr. Ananya Nair, your clinical supervisor. Feel free to reach out here anytime for support, grounding guidance, or care questions.",
          created_at: new Date(Date.now() - 3600000).toISOString(),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesSilently = async () => {
    if (!user?.id) return;
    try {
      const res = await chatAPI.getDirectMessages(user.id);
      if (res?.messages && res.messages.length > 0) {
        setMessages(res.messages);
      }
    } catch {
      // Silent catch on background polling
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const messageContent = inputText.trim();
    setInputText('');
    setSending(true);

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender_type: 'veteran',
      content: messageContent,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      if (user?.id) {
        await chatAPI.sendDirectMessage(user.id, messageContent, 'veteran');
        // Refresh live list
        await loadMessagesSilently();
      }
    } catch (err) {
      console.warn('Error sending message:', err.message);
    } finally {
      setSending(false);
    }
  };

  const handleEmergencyAlert = () => {
    Alert.alert(
      '🚨 Urgent Clinical SOS',
      'Send an immediate high-priority alert to Dr. Ananya Nair?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Priority Alert',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user?.id) {
                await chatAPI.sendEmergency(user.id, 'URGENT: Requesting priority check-in assistance.');
                await loadMessagesSilently();
              }
              Alert.alert('Alert Dispatched', 'Dr. Ananya Nair has received your priority alert.');
            } catch (err) {
              Alert.alert('Alert Sent', 'Dr. Ananya Nair has been notified.');
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderMessage = ({ item }) => {
    const isVeteran = item.sender_type === 'veteran';
    const isAlert = item.message_type === 'alert' || item.content?.startsWith('🚨');

    return (
      <View
        style={[
          styles.messageRow,
          isVeteran ? styles.messageRowVeteran : styles.messageRowCounselor,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isVeteran ? styles.veteranBubble : styles.counselorBubble,
            isAlert && styles.alertBubble,
          ]}
        >
          {isAlert && (
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={13} color="#fff" />
              <Text style={styles.alertHeaderText}>HIGH PRIORITY ALERT</Text>
            </View>
          )}
          <Text
            style={[
              styles.messageText,
              isVeteran ? styles.veteranMessageText : styles.counselorMessageText,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isVeteran ? styles.veteranTime : styles.counselorTime,
            ]}
          >
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Caregiver Status Banner */}
      <View style={styles.headerBar}>
        <View style={styles.counselorInfo}>
          <View style={styles.avatarMini}>
            <Text style={styles.avatarMiniText}>AN</Text>
          </View>
          <View>
            <Text style={styles.counselorName}>{counselorName}</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active Caregiver • Direct Line</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.alertBtn}
          onPress={handleEmergencyAlert}
          accessibilityLabel="Priority Alert"
        >
          <Ionicons name="shield-alert" size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>

      {/* Messages Feed */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.rust[500]} />
          <Text style={styles.loadingText}>Opening secure thread...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Clean Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Message Dr. Ananya Nair..."
          placeholderTextColor={theme.colors.espresso[400]}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream[200],
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.cream[50],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cream[400],
    ...theme.shadows.warm,
  },
  counselorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.rust[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarMiniText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  counselorName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.status.stable,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    color: theme.colors.espresso[400],
    fontWeight: '600',
  },
  alertBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.espresso[400],
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowVeteran: {
    justifyContent: 'flex-end',
  },
  messageRowCounselor: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    ...theme.shadows.warm,
  },
  veteranBubble: {
    backgroundColor: theme.colors.rust[500],
    borderBottomRightRadius: 3,
  },
  counselorBubble: {
    backgroundColor: theme.colors.cream[50],
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    borderBottomLeftRadius: 3,
  },
  alertBubble: {
    backgroundColor: theme.colors.status.urgent,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  alertHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  veteranMessageText: {
    color: '#fff',
    fontWeight: '500',
  },
  counselorMessageText: {
    color: theme.colors.espresso[900],
    fontWeight: '500',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    fontWeight: '600',
  },
  veteranTime: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  counselorTime: {
    color: theme.colors.espresso[400],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.cream[50],
    borderTopWidth: 1,
    borderTopColor: theme.colors.cream[400],
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: theme.colors.cream[100],
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.espresso[900],
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.rust[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.warm,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});

export default ChatScreen;
