/**
 * VALOR Profile Screen
 * Comprehensive Veteran Profile & Clinical Configuration
 * - Avatar / PFP selection (8 tactical presets or custom image URL)
 * - Service Details (Rank, Branch, Years, Deployments, Unit)
 * - Personal Details (Bio, Creed, Phone, Home City)
 * - Emergency Battle Buddy Contact (Name, Phone, One-tap Call)
 * - Full interactive Edit Profile modal with backend sync
 * - Gamification stats & Medals showcase
 * - Counselor management & Preferences
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  Modal,
  TextInput,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { COUNSELORS_LIST } from './DashboardScreen';
import { veteranAPI, chatAPI } from '../services/api';
import { storage } from '../services/storage';

// 8 Tactical Avatar Presets
const AVATAR_PRESETS = [
  { id: 'eagle', label: 'Tactical Eagle', icon: 'shield', color: '#8C4A1E', bg: '#F7DFCC' },
  { id: 'lightning', label: 'Lightning Strike', icon: 'flash', color: '#1D4ED8', bg: '#DBEAFE' },
  { id: 'swords', label: 'Crossed Sabres', icon: 'git-network', color: '#047857', bg: '#D1FAE5' },
  { id: 'anchor', label: 'Naval Command', icon: 'boat', color: '#0369A1', bg: '#E0F2FE' },
  { id: 'medic', label: 'Combat Medic', icon: 'medkit', color: '#B91C1C', bg: '#FEE2E2' },
  { id: 'recon', label: 'Special Recon', icon: 'eye', color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'star', label: 'Valor Medal', icon: 'star', color: '#D97706', bg: '#FEF3C7' },
  { id: 'warrior', label: 'Commando', icon: 'person', color: '#374151', bg: '#E5E7EB' },
];

const MEDALS = [
  { id: 'm1', name: 'First Mission', desc: 'Completed first recovery exercise', icon: 'ribbon', unlocked: true },
  { id: 'm2', name: 'Bilateral Master', desc: 'Verified 5+ GPS grounding walks', icon: 'navigate', unlocked: true },
  { id: 'm3', name: 'Consistent Warrior', desc: 'Maintained 5-day wellness streak', icon: 'flame', unlocked: true },
  { id: 'm4', name: 'Squad Comrade', desc: 'Joined peer support network', icon: 'people', unlocked: true },
];

const ProfileScreen = ({ navigation }) => {
  const { user, setUser, logout } = useAuth();

  // Local settings toggles
  const [gpsEnabled, setGpsEnabled] = useState(user?.gps_enabled ?? true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notifications_enabled ?? true);

  // Modals
  const [counselorModalVisible, setCounselorModalVisible] = useState(false);
  const [counselorsList, setCounselorsList] = useState(COUNSELORS_LIST);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCounselors = async () => {
    try {
      const res = await chatAPI.listCounselors();
      if (res?.counselors && res.counselors.length > 0) {
        setCounselorsList(res.counselors);
      }
    } catch (e) {
      console.warn('Profile counselor list fallback:', e);
    }
  };

  useEffect(() => {
    loadCounselors();
  }, []);

  // Selected avatar
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_url || 'eagle');

  // Edit Form Fields
  const [formName, setFormName] = useState(user?.name || 'Vikramaditya Rathore');
  const [formRank, setFormRank] = useState(user?.rank || 'Major');
  const [formBranch, setFormBranch] = useState(user?.service_branch || 'Indian Army (Para SF)');
  const [formYears, setFormYears] = useState(String(user?.years_of_service || '14'));
  const [formDeployments, setFormDeployments] = useState(String(user?.deployment_count || '4'));
  const [formBio, setFormBio] = useState(
    user?.bio || 'Service before self. Focused on somatic recovery, bilateral walks, and supporting fellow combat veterans.'
  );
  const [formPhone, setFormPhone] = useState(user?.phone_number || '+91 98765 43210');
  const [formCity, setFormCity] = useState(user?.home_city || 'Chandigarh, PB');
  const [formEmergencyName, setFormEmergencyName] = useState(user?.emergency_contact_name || 'Lt. Col. Ankit Sharma');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState(user?.emergency_contact_phone || '+91 98111 22233');

  const handleSaveProfile = async () => {
    setSaving(true);
    const payload = {
      name: formName,
      rank: formRank,
      service_branch: formBranch,
      years_of_service: parseInt(formYears, 10) || 0,
      deployment_count: parseInt(formDeployments, 10) || 0,
      bio: formBio,
      phone_number: formPhone,
      home_city: formCity,
      emergency_contact_name: formEmergencyName,
      emergency_contact_phone: formEmergencyPhone,
      avatar_url: selectedAvatar,
      gps_enabled: gpsEnabled,
      notifications_enabled: notificationsEnabled,
    };

    try {
      if (user?.id) {
        await veteranAPI.updateProfile(user.id, payload).catch((err) => {
          console.warn('Backend profile update note:', err.message);
        });
      }

      const updatedUser = {
        ...user,
        ...payload,
      };

      if (setUser) setUser(updatedUser);
      await storage.set('user', JSON.stringify(updatedUser));

      setEditModalVisible(false);
      const successMsg = 'Your military service and recovery profile have been updated.';
      if (Platform.OS === 'web') {
        window.alert(`Profile Updated! ✅\n\n${successMsg}`);
      } else {
        Alert.alert('Profile Updated! ✅', successMsg);
      }
    } catch (err) {
      console.warn('Save profile error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAvatarPreset = async (presetId) => {
    setSelectedAvatar(presetId);
    setAvatarModalVisible(false);

    const updated = { ...user, avatar_url: presetId };
    if (setUser) setUser(updated);
    if (user?.id) {
      await veteranAPI.updateProfile(user.id, { avatar_url: presetId }).catch(() => {});
    }
    await storage.set('user', JSON.stringify(updated));
  };

  const handleCallEmergency = () => {
    const phone = formEmergencyPhone.replace(/[^0-9+]/g, '');
    if (Platform.OS === 'web') {
      window.open(`tel:${phone}`);
    } else {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Call Failed', `Could not initiate call to ${phone}.`);
      });
    }
  };

  const handleLogout = () => {
    const doLogout = () => {
      if (logout) logout();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out of your account?')) {
        doLogout();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out of your account?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: doLogout },
        ]
      );
    }
  };

  const handleSelectCounselor = async (counselor) => {
    try {
      if (user?.id) {
        await chatAPI.chooseCounselor(user.id, counselor.id, counselor.name);
      }
    } catch (e) {
      console.warn('Counselor select api error:', e);
    }

    const updated = {
      ...user,
      assignedCounselorId: counselor.id,
      assignedCounselorName: counselor.name,
      assignedCounselorTitle: counselor.title,
      assignedCounselorSpecialty: counselor.specialty,
    };
    if (setUser) setUser(updated);
    await storage.set('user', JSON.stringify(updated));

    setCounselorModalVisible(false);
    if (Platform.OS === 'web') {
      window.alert(`Assigned to ${counselor.name}!\n\nYour clinical channel is now linked to ${counselor.institution}.`);
    } else {
      Alert.alert('Counselor Assigned! 🩺', `Your clinical channel is now linked to ${counselor.name}.`);
    }
  };

  const assignedCounselor = user?.assignedCounselorName || 'Dr. Ananya Nair, MD';
  const avatarObj = AVATAR_PRESETS.find((p) => p.id === selectedAvatar) || AVATAR_PRESETS[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* 1. HERO PROFILE CARD */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          {/* Avatar with Edit Camera Overlay */}
          <TouchableOpacity
            style={[styles.avatarWrap, { backgroundColor: avatarObj.bg, borderColor: avatarObj.color }]}
            onPress={() => setAvatarModalVisible(true)}
            activeOpacity={0.85}
          >
            {selectedAvatar.startsWith('http') || selectedAvatar.startsWith('data:') ? (
              <Image source={{ uri: selectedAvatar }} style={styles.avatarImg} />
            ) : (
              <Ionicons name={avatarObj.icon} size={38} color={avatarObj.color} />
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Titles & Military Branch */}
          <View style={styles.heroMeta}>
            <Text style={styles.heroName}>{formName}</Text>
            <View style={styles.rankPill}>
              <Ionicons name="shield-checkmark" size={12} color="#8C4A1E" style={{ marginRight: 4 }} />
              <Text style={styles.rankText}>
                {formRank} • {formBranch}
              </Text>
            </View>
            <Text style={styles.cityText}>
              <Ionicons name="location-outline" size={12} color="#6B7280" /> {formCity}
            </Text>
          </View>
        </View>

        {/* Bio Creed */}
        <Text style={styles.heroBio}>"{formBio}"</Text>

        {/* Action Buttons: Edit Profile & Change Avatar */}
        <View style={styles.heroActionsRow}>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => setEditModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.editProfileBtnText}>Edit Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeAvatarBtn}
            onPress={() => setAvatarModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="images-outline" size={16} color="#8C4A1E" style={{ marginRight: 6 }} />
            <Text style={styles.changeAvatarBtnText}>Change PFP</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. RECOVERY STATS GRID */}
      <View style={styles.statsCard}>
        <Text style={styles.sectionHeaderTitle}>RECOVERY MILESTONES</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={[styles.statIconBadge, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="trophy" size={18} color="#D97706" />
            </View>
            <Text style={styles.statBoxVal}>{user?.total_points || 250}</Text>
            <Text style={styles.statBoxLbl}>Valor XP</Text>
          </View>

          <View style={styles.statBox}>
            <View style={[styles.statIconBadge, { backgroundColor: '#FFEDD5' }]}>
              <Ionicons name="flame" size={18} color="#EA580C" />
            </View>
            <Text style={styles.statBoxVal}>{user?.current_streak || 5} d</Text>
            <Text style={styles.statBoxLbl}>Streak</Text>
          </View>

          <View style={styles.statBox}>
            <View style={[styles.statIconBadge, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
            </View>
            <Text style={styles.statBoxVal}>{user?.tasks_completed || 12}</Text>
            <Text style={styles.statBoxLbl}>Tasks Done</Text>
          </View>

          <View style={styles.statBox}>
            <View style={[styles.statIconBadge, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="people" size={18} color="#2563EB" />
            </View>
            <Text style={styles.statBoxVal}>{user?.groups_joined || 2}</Text>
            <Text style={styles.statBoxLbl}>Squads</Text>
          </View>
        </View>
      </View>

      {/* 3. MILITARY & SERVICE DOSSIER */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="document-text-outline" size={18} color="#8C4A1E" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Military Service Dossier</Text>
        </View>

        <View style={styles.dossierRow}>
          <Text style={styles.dossierLabel}>Rank & Designation</Text>
          <Text style={styles.dossierValue}>{formRank}</Text>
        </View>
        <View style={styles.dossierDivider} />

        <View style={styles.dossierRow}>
          <Text style={styles.dossierLabel}>Service Branch</Text>
          <Text style={styles.dossierValue}>{formBranch}</Text>
        </View>
        <View style={styles.dossierDivider} />

        <View style={styles.dossierRow}>
          <Text style={styles.dossierLabel}>Years of Active Service</Text>
          <Text style={styles.dossierValue}>{formYears} Years</Text>
        </View>
        <View style={styles.dossierDivider} />

        <View style={styles.dossierRow}>
          <Text style={styles.dossierLabel}>Deployments / Theatres</Text>
          <Text style={styles.dossierValue}>{formDeployments} Missions</Text>
        </View>
        <View style={styles.dossierDivider} />

        <View style={styles.dossierRow}>
          <Text style={styles.dossierLabel}>Registered Contact</Text>
          <Text style={styles.dossierValue}>{formPhone}</Text>
        </View>
      </View>

      {/* 4. EMERGENCY & BATTLE BUDDY CONTACT */}
      <View style={[styles.sectionCard, styles.emergencyCard]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, { color: '#991B1B' }]}>Emergency Battle Buddy</Text>
        </View>
        <Text style={styles.emergencySub}>
          Your designated trusted peer or next-of-kin who can be reached during acute distress or trauma escalation.
        </Text>

        <View style={styles.battleBuddyBox}>
          <View>
            <Text style={styles.battleBuddyName}>{formEmergencyName}</Text>
            <Text style={styles.battleBuddyPhone}>{formEmergencyPhone}</Text>
          </View>
          <TouchableOpacity
            style={styles.emergencyCallBtn}
            onPress={handleCallEmergency}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.emergencyCallBtnText}>Call Ally</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 5. MEDALS & COMMENDATIONS */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="medal-outline" size={18} color="#D97706" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Commendations & Medals</Text>
        </View>
        <View style={styles.medalsRow}>
          {MEDALS.map((m) => (
            <View key={m.id} style={styles.medalCard}>
              <View style={styles.medalIconBadge}>
                <Ionicons name={m.icon} size={20} color="#D97706" />
              </View>
              <Text style={styles.medalName}>{m.name}</Text>
              <Text style={styles.medalDesc}>{m.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 6. CLINICAL COUNSELOR CHANNEL */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="medkit-outline" size={18} color="#0D9488" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Assigned Clinical Care Lead</Text>
        </View>

        <View style={styles.counselorBox}>
          <View style={styles.counselorInfo}>
            <Text style={styles.counselorName}>{assignedCounselor}</Text>
            <Text style={styles.counselorSub}>
              {user?.assignedCounselorTitle || 'Senior Defense Psychologist • AFMC'}
            </Text>
          </View>
          <View style={styles.counselorBtnGroup}>
            <TouchableOpacity
              style={styles.changeCounselorBtn}
              onPress={() => setCounselorModalVisible(true)}
            >
              <Text style={styles.changeCounselorBtnText}>Change</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatCounselorBtn}
              onPress={() => navigation.navigate('Chat', { counselorName: assignedCounselor })}
            >
              <Ionicons name="chatbubble" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.chatCounselorBtnText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 7. RECOVERY PREFERENCES */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="settings-outline" size={18} color="#4B5563" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Preferences & Hardware Permissions</Text>
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>GPS Movement Verification</Text>
            <Text style={styles.switchSubtitle}>Track verified walking for Valor Recovery Points</Text>
          </View>
          <Switch
            value={gpsEnabled}
            onValueChange={setGpsEnabled}
            trackColor={{ false: '#E5E7EB', true: '#FDE68A' }}
            thumbColor={gpsEnabled ? '#8C4A1E' : '#9CA3AF'}
          />
        </View>
        <View style={styles.dossierDivider} />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Daily Check-In Reminders</Text>
            <Text style={styles.switchSubtitle}>Harvard Trauma protocol push notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#E5E7EB', true: '#FDE68A' }}
            thumbColor={notificationsEnabled ? '#8C4A1E' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* 8. SIGN OUT BUTTON */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
        <Text style={styles.logoutBtnText}>Sign Out of VALOR Account</Text>
      </TouchableOpacity>

      <Text style={styles.footerVersion}>VALOR Veteran Recovery System • v2.4 Secure Clinical Build</Text>

      {/* ─────────────────────────────────────────────────────────────
          MODAL A: AVATAR / PFP SELECTOR MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={avatarModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Tactical Profile Avatar</Text>
              <TouchableOpacity onPress={() => setAvatarModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Select a specialized military crest or emblem to represent your profile on the peer network.
            </Text>

            <View style={styles.avatarGrid}>
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = selectedAvatar === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.avatarGridItem,
                      { backgroundColor: preset.bg, borderColor: isSelected ? preset.color : '#E5E7EB' },
                      isSelected && styles.avatarGridItemSelected,
                    ]}
                    onPress={() => handleSelectAvatarPreset(preset.id)}
                  >
                    <Ionicons name={preset.icon} size={28} color={preset.color} />
                    <Text style={[styles.avatarGridLabel, { color: preset.color }]}>{preset.label}</Text>
                    {isSelected && (
                      <View style={[styles.selectedCheck, { backgroundColor: preset.color }]}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Image URL Option */}
            <View style={styles.customUrlBox}>
              <Text style={styles.customUrlLabel}>Or enter direct image URL:</Text>
              <TextInput
                style={styles.customUrlInput}
                placeholder="https://example.com/avatar.jpg"
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={(e) => {
                  if (e.nativeEvent.text.trim()) {
                    handleSelectAvatarPreset(e.nativeEvent.text.trim());
                  }
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL B: EDIT PROFILE MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Veteran Dossier</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 12 }}>
              <Text style={styles.inputSectionHeader}>PERSONAL INFORMATION</Text>

              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. Major Vikramaditya Rathore"
              />

              <Text style={styles.inputLabel}>Personal Recovery Creed / Bio</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                value={formBio}
                onChangeText={setFormBio}
                multiline
                placeholder="Your personal motto or current recovery focus..."
              />

              <Text style={styles.inputLabel}>Home Station / City</Text>
              <TextInput
                style={styles.textInput}
                value={formCity}
                onChangeText={setFormCity}
                placeholder="e.g. Chandigarh, Punjab"
              />

              <Text style={styles.inputLabel}>Personal Phone</Text>
              <TextInput
                style={styles.textInput}
                value={formPhone}
                onChangeText={setFormPhone}
                keyboardType="phone-pad"
                placeholder="+91 98765 43210"
              />

              <Text style={[styles.inputSectionHeader, { marginTop: 18 }]}>MILITARY RECORD</Text>

              <Text style={styles.inputLabel}>Current / Veteran Rank</Text>
              <TextInput
                style={styles.textInput}
                value={formRank}
                onChangeText={setFormRank}
                placeholder="e.g. Major / Subedar / Commander"
              />

              <Text style={styles.inputLabel}>Service Branch & Unit</Text>
              <TextInput
                style={styles.textInput}
                value={formBranch}
                onChangeText={setFormBranch}
                placeholder="e.g. Indian Army (Para SF)"
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Years of Service</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formYears}
                    onChangeText={setFormYears}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Deployments</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formDeployments}
                    onChangeText={setFormDeployments}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text style={[styles.inputSectionHeader, { marginTop: 18, color: '#DC2626' }]}>
                EMERGENCY BATTLE BUDDY
              </Text>

              <Text style={styles.inputLabel}>Emergency Contact Name & Relation</Text>
              <TextInput
                style={styles.textInput}
                value={formEmergencyName}
                onChangeText={setFormEmergencyName}
                placeholder="e.g. Priya Sharma (Spouse) or Lt. Col. Ankit"
              />

              <Text style={styles.inputLabel}>Emergency Contact Phone</Text>
              <TextInput
                style={styles.textInput}
                value={formEmergencyPhone}
                onChangeText={setFormEmergencyPhone}
                keyboardType="phone-pad"
                placeholder="+91 98111 22233"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Dossier'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL C: COUNSELOR SELECTION MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal visible={counselorModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Assigned Clinical Lead</Text>
              <TouchableOpacity onPress={() => setCounselorModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Your clinical lead receives encrypted assessment notes and provides trauma counseling.
            </Text>

            <ScrollView style={{ maxHeight: 380, marginTop: 12 }}>
              {counselorsList.map((c) => {
                const isCurrent = assignedCounselor === c.name;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.counselorSelectItem, isCurrent && styles.counselorSelectItemActive]}
                    onPress={() => handleSelectCounselor(c)}
                  >
                    <View style={styles.counselorAvatarCircle}>
                      <Text style={styles.counselorAvatarText}>{c.avatar || 'CL'}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.counselorItemName}>{c.name}</Text>
                      <Text style={styles.counselorItemTitle}>{c.title}</Text>
                      <Text style={styles.counselorItemInst}>{c.institution || c.specialty || c.specialization}</Text>
                    </View>
                    {isCurrent && (
                      <Ionicons name="checkmark-circle" size={20} color="#0D9488" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 16,
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8C4A1E',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroMeta: {
    flex: 1,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7DFCC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  rankText: {
    color: '#8C4A1E',
    fontSize: 12,
    fontWeight: '800',
  },
  cityText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  heroBio: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 18,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  editProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C4A1E',
    paddingVertical: 10,
    borderRadius: 12,
  },
  editProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  changeAvatarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7DFCC',
    paddingVertical: 10,
    borderRadius: 12,
  },
  changeAvatarBtnText: {
    color: '#8C4A1E',
    fontSize: 13,
    fontWeight: '800',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statBoxVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  statBoxLbl: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  emergencyCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  emergencySub: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
    marginBottom: 12,
  },
  dossierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  dossierLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  dossierValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },
  dossierDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  battleBuddyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  battleBuddyName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  battleBuddyPhone: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 2,
  },
  emergencyCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emergencyCallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  medalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  medalCard: {
    width: '48%',
    backgroundColor: '#FFFDF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    padding: 10,
  },
  medalIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  medalName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  medalDesc: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  counselorBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  counselorInfo: {
    marginBottom: 10,
  },
  counselorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F766E',
  },
  counselorSub: {
    fontSize: 12,
    color: '#115E59',
    marginTop: 2,
  },
  counselorBtnGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  changeCounselorBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  changeCounselorBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  chatCounselorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#0D9488',
  },
  chatCounselorBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  switchSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginTop: 10,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
  footerVersion: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 16,
  },
  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  avatarGridItem: {
    width: '47%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  avatarGridItemSelected: {
    borderWidth: 2,
  },
  avatarGridLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
  selectedCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customUrlBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  customUrlLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  customUrlInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  /* Edit modal form */
  inputSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C4A1E',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#8C4A1E',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  /* Counselor select */
  counselorSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  counselorSelectItemActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  counselorAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counselorAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  counselorItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  counselorItemTitle: {
    fontSize: 11,
    color: '#4B5563',
  },
  counselorItemInst: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
});

export default ProfileScreen;
