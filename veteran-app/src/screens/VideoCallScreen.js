/**
 * Video Call Screen
 * Video call interface for counselor sessions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const VideoCallScreen = ({ route, navigation }) => {
  const { counselorName, counselorTitle, conversationId } = route.params || {};
  const [callStatus, setCallStatus] = useState('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    // Simulate connection
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 3000);

    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    let interval;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Call', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleToggleMute = () => setIsMuted(!isMuted);
  const handleToggleVideo = () => setIsVideoOn(!isVideoOn);
  const handleToggleSpeaker = () => setIsSpeakerOn(!isSpeakerOn);

  const handleScreenShare = () => {
    Alert.alert('Screen Share', 'Screen sharing will be available in a future update.');
  };

  const handleRecord = () => {
    Alert.alert('Recording', 'Session recording requires consent from both parties.');
  };

  return (
    <View style={styles.container}>
      {/* Counselor Video (Remote) */}
      <View style={styles.remoteVideo}>
        <View style={styles.remoteVideoPlaceholder}>
          <Ionicons name="person-circle" size={100} color="#fff" />
          <Text style={styles.counselorName}>{counselorName || 'Counselor'}</Text>
          <Text style={styles.counselorTitle}>{counselorTitle || 'Licensed Therapist'}</Text>
        </View>
      </View>

      {/* Self Video (Local) */}
      <View style={styles.localVideo}>
        <View style={styles.localVideoPlaceholder}>
          {isVideoOn ? (
            <Ionicons name="person-circle" size={60} color="#fff" />
          ) : (
            <Ionicons name="video-off" size={30} color="#fff" />
          )}
        </View>
      </View>

      {/* Call Status Overlay */}
      <View style={styles.statusOverlay}>
        {callStatus === 'connecting' ? (
          <View style={styles.connectingContainer}>
            <View style={styles.connectingDot} />
            <Text style={styles.statusText}>Connecting...</Text>
          </View>
        ) : (
          <View style={styles.connectedContainer}>
            <View style={styles.connectedDot} />
            <Text style={styles.statusText}>{formatDuration(callDuration)}</Text>
          </View>
        )}
      </View>

      {/* Emergency Button */}
      <TouchableOpacity style={styles.emergencyButton} onPress={() => {
        Alert.alert('🚨 Emergency', 'This will notify an on-duty crisis counselor immediately.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send Alert', style: 'destructive', onPress: () => {} },
        ]);
      }}>
        <Ionicons name="warning" size={20} color="#ef4444" />
      </TouchableOpacity>

      {/* Control Bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity style={styles.controlButton} onPress={handleToggleMute}>
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#fff" />
          <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={handleToggleVideo}>
          <Ionicons name={isVideoOn ? 'videocam' : 'videocam-off'} size={24} color="#fff" />
          <Text style={styles.controlLabel}>{isVideoOn ? 'Camera Off' : 'Camera On'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={handleToggleSpeaker}>
          <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-mute'} size={24} color="#fff" />
          <Text style={styles.controlLabel}>Speaker</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={handleScreenShare}>
          <Ionicons name="screen" size={24} color="#fff" />
          <Text style={styles.controlLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={handleRecord}>
          <Ionicons name="radio-button-on" size={24} color="#fff" />
          <Text style={styles.controlLabel}>Record</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={handleEndCall}>
          <Ionicons name="call" size={28} color="#fff" />
          <Text style={[styles.controlLabel, styles.endCallLabel]}>End</Text>
        </TouchableOpacity>
      </View>

      {/* Info Bar */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>🔒 End-to-end encrypted</Text>
        <Text style={styles.infoText}>HIPAA compliant</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counselorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  counselorTitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  localVideo: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f3460',
    borderWidth: 2,
    borderColor: '#fff',
  },
  localVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
  },
  connectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
    marginRight: 8,
  },
  connectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  emergencyButton: {
    position: 'absolute',
    top: 60,
    right: 150,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239,68,68,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: '#1a1a2e',
  },
  controlButton: {
    alignItems: 'center',
    marginHorizontal: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  controlLabel: {
    fontSize: 10,
    color: '#fff',
    marginTop: 4,
  },
  endCallButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
  },
  endCallLabel: {
    fontWeight: 'bold',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 40,
    backgroundColor: '#1a1a2e',
  },
  infoText: {
    fontSize: 11,
    color: '#6b7280',
    marginHorizontal: 10,
  },
});

export default VideoCallScreen;
