/**
 * Direct Messaging Screen
 * Peer-to-peer messaging between comrades with VALOR design system styling
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { friendsAPI } from '../services/api';

const DMScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { friendId, friendName = 'Comrade' } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  const vetId = user?.id || '550e8400-e29b-41d4-a716-446655440001';

  const loadMessagesSilently = useCallback(async () => {
    if (!vetId || !friendId) return;
    try {
      const res = await friendsAPI.getDMThread(vetId, friendId);
      if (res?.messages) {
        setMessages((prev) => {
          // Merge optimistic messages not yet confirmed by server
          const serverIds = new Set(res.messages.map((m) => m.id));
          const pending = prev.filter((m) => m.id.startsWith('temp-') && !serverIds.has(m.id));
          return [...res.messages, ...pending];
        });
      }
    } catch {
      // background poll catch
    }
  }, [vetId, friendId]);

  const loadMessages = useCallback(async () => {
    try {
      if (vetId && friendId) {
        const res = await friendsAPI.getDMThread(vetId, friendId);
        if (res?.messages && res.messages.length > 0) {
          setMessages(res.messages);
          setLoading(false);
          return;
        }
      }
      setMessages([
        {
          id: 'welcome',
          sender_id: friendId,
          content: `Connected with ${friendName}. Stand united, keep each other strong! 🤝`,
          created_at: new Date().toISOString(),
          is_mine: false,
        },
      ]);
    } catch (err) {
      console.warn('Could not load DM thread:', err.message);
      setMessages([
        {
          id: 'welcome',
          sender_id: friendId,
          content: `Connected with ${friendName}. Stand united, keep each other strong! 🤝`,
          created_at: new Date().toISOString(),
          is_mine: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [vetId, friendId, friendName]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => {
      loadMessagesSilently();
    }, 3500);
    return () => clearInterval(interval);
  }, [loadMessages, loadMessagesSilently]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender_id: vetId,
      content,
      created_at: new Date().toISOString(),
      is_mine: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await friendsAPI.sendDM(vetId, friendId, content);
      await loadMessagesSilently();
    } catch (err) {
      console.warn('Error sending DM:', err.message);
    } finally {
      setSending(false);
    }
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
    const isMine = item.is_mine || item.sender_id === vetId;

    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowOther]}>
        <View style={[styles.messageBubble, isMine ? styles.mineBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMine ? styles.mineText : styles.otherText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMine ? styles.mineTime : styles.otherTime]}>
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header bar with Friend info */}
      <View style={styles.chatHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.espresso[900]} />
        </TouchableOpacity>
        <View style={styles.friendAvatar}>
          <Ionicons name="person" size={18} color="#fff" />
        </View>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerFriendName}>{friendName}</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>Active Comrade</Text>
          </View>
        </View>
      </View>

      {/* Message List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.colors.rust[500]} />
          <Text style={styles.loadingText}>Opening secure dispatch...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id || `msg-${Math.random()}`}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder={`Message ${friendName}...`}
          placeholderTextColor={theme.colors.espresso[400]}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream[100],
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cream[400],
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.rust[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerFriendName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    color: theme.colors.espresso[400],
    fontWeight: '600',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: theme.colors.espresso[400],
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  mineBubble: {
    backgroundColor: theme.colors.rust[500],
    borderBottomRightRadius: 3,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 3,
    borderWidth: 1,
    borderColor: theme.colors.cream[300],
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  mineText: {
    color: '#fff',
  },
  otherText: {
    color: theme.colors.espresso[900],
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  mineTime: {
    color: 'rgba(255,255,255,0.75)',
  },
  otherTime: {
    color: theme.colors.espresso[400],
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: theme.colors.cream[400],
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.cream[100],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
    fontSize: 14,
    color: theme.colors.espresso[900],
    borderWidth: 1,
    borderColor: theme.colors.cream[300],
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.rust[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginBottom: 1,
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.cream[400],
  },
});

export default DMScreen;
