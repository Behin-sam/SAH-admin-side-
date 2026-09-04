/**
 * Chat Screen
 * Therapist/counselor messaging with veterans
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

const ChatScreen = ({ route, navigation }) => {
  const { conversationId, counselorName } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      // Mock messages for demo
      const mockMessages = [
        {
          id: 'm1',
          sender_type: 'counselor',
          content: "Hi! I'm your assigned counselor. How are you feeling today?",
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'm2',
          sender_type: 'veteran',
          content: "Hey, I've been having some trouble sleeping lately. The nightmares are back.",
          created_at: new Date(Date.now() - 3000000).toISOString(),
        },
        {
          id: 'm3',
          sender_type: 'counselor',
          content: "I'm sorry to hear that. Sleep disturbances are common with what you're going through. Have you tried the breathing exercises we discussed?",
          created_at: new Date(Date.now() - 2400000).toISOString(),
        },
        {
          id: 'm4',
          sender_type: 'veteran',
          content: "Yeah, they help a little. But I wake up around 3 AM and can't fall back asleep.",
          created_at: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'm5',
          sender_type: 'counselor',
          content: "That's a common pattern. Let's work on a sleep routine together. I'd also like to discuss some EMDR techniques that might help with the nightmares. Can you come in this Thursday?",
          created_at: new Date(Date.now() - 1200000).toISOString(),
        },
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    setSending(true);
    const newMessage = {
      id: `m${Date.now()}`,
      sender_type: 'veteran',
      content: inputText.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    // Simulate counselor response after 2 seconds
    setTimeout(() => {
      const responses = [
        "Thank you for sharing that with me. Let's explore this further.",
        "I hear you. That sounds really difficult. What do you think would help right now?",
        "That's a great observation. Have you noticed any patterns in when this happens?",
        "I'm here for you. Let's work through this together.",
        "Your feelings are completely valid. Let's talk about some coping strategies.",
      ];
      const response = {
        id: `m${Date.now() + 1}`,
        sender_type: 'counselor',
        content: responses[Math.floor(Math.random() * responses.length)],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, response]);
      setSending(false);
    }, 2000);
  };

  const handleEmergency = () => {
    Alert.alert(
      '🚨 Emergency Support',
      'This will send an immediate message to an on-duty counselor.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Emergency',
          style: 'destructive',
          onPress: () => {
            const emergencyMsg = {
              id: `m${Date.now()}`,
              sender_type: 'veteran',
              content: '🚨 EMERGENCY: I need immediate support.',
              message_type: 'alert',
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, emergencyMsg]);
            Alert.alert('Sent', 'Your emergency message has been sent to an on-duty counselor.');
          },
        },
      ]
    );
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => {
    const isVeteran = item.sender_type === 'veteran';
    const isEmergency = item.message_type === 'alert';

    return (
      <View style={[styles.messageBubble, isVeteran ? styles.veteranBubble : styles.counselorBubble, isEmergency && styles.emergencyBubble]}>
        {isEmergency && (
          <View style={styles.emergencyBadge}>
            <Ionicons name="warning" size={12} color="#fff" />
            <Text style={styles.emergencyBadgeText}>EMERGENCY</Text>
          </View>
        )}
        <Text style={[styles.messageText, isVeteran && styles.veteranMessageText]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, isVeteran && styles.veteranMessageTime]}>
          {formatTime(item.created_at)}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{counselorName || 'Counselor'}</Text>
          <Text style={styles.headerStatus}>● Online</Text>
        </View>
        <TouchableOpacity onPress={handleEmergency} style={styles.emergencyButton}>
          <Ionicons name="warning" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
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
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={() => setInputText("I'm having a tough day.")}>
          <Text style={styles.quickActionText}>😔 Tough day</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => setInputText("Can we schedule a session?")}>
          <Text style={styles.quickActionText}>📅 Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => setInputText("I completed my tasks today!")}>
          <Text style={styles.quickActionText}>✅ Tasks done</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    padding: 16,
    paddingTop: 50,
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  emergencyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  veteranBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  counselorBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emergencyBubble: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  emergencyBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 20,
  },
  veteranMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  veteranMessageTime: {
    color: '#bfdbfe',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1f2937',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quickAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
  },
  quickActionText: {
    fontSize: 13,
    color: '#4b5563',
  },
});

export default ChatScreen;
