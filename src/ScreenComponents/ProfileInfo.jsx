import React, { useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import Colors from "../Common/Colors";
import { useAppContext } from "../Context/AppContext";

const FALLBACK_TEXT = "Not provided";

const ProfileInfo = () => {
  const { appData } = useAppContext();

  const basicDetails = useMemo(
    () => [
      { label: "Full Name", value: appData?.name },
      { label: "Email", value: appData?.email },
      { label: "Phone", value: appData?.phone },
      { label: "Gender", value: appData?.gender },
      { label: "Age", value: appData?.age },
      { label: "Occupation", value: appData?.occupation },
      { label: "Country", value: appData?.country },
      { label: "City", value: appData?.city },
      { label: "Role", value: appData?.role },
    ],
    [appData]
  );

  const displayText = (value) => {
    if (value === null || value === undefined) {
      return FALLBACK_TEXT;
    }
    const text = String(value).trim();
    return text.length > 0 ? text : FALLBACK_TEXT;
  };

  const profileInitial = useMemo(() => {
    const name = displayText(appData?.name);
    return name && name !== FALLBACK_TEXT ? name.charAt(0).toUpperCase() : null;
  }, [appData]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          {profileInitial ? (
            <Text style={styles.avatarText}>{profileInitial}</Text>
          ) : (
            <Feather name="user" size={34} color={Colors.black} />
          )}
        </View>
        <Text style={styles.profileName}>{displayText(appData?.name)}</Text>
        <Text style={styles.profileRole}>
          {displayText(appData?.occupation) !== FALLBACK_TEXT
            ? displayText(appData?.occupation)
            : displayText(appData?.role)}
        </Text>
        <TouchableOpacity style={styles.editButton} activeOpacity={0.85}>
          <Feather name="edit-2" size={16} color={Colors.white} />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Details</Text>
        <View>
          {basicDetails.map((detail, index) => (
            <View
              key={detail.label}
              style={[
                styles.detailRow,
                index !== basicDetails.length - 1 && styles.detailRowSpacing,
              ]}
            >
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text style={styles.detailValue}>{displayText(detail.value)}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    padding: 20,
  },
  profileCard: {
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "600",
    color: Colors.black,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.black,
  },
  profileRole: {
    fontSize: 16,
    color: "#555555",
    marginTop: 4,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  editButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.black,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailRowSpacing: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 15,
    color: "#666666",
    flex: 1,
    marginRight: 12,
  },
  detailValue: {
    fontSize: 15,
    color: Colors.black,
    flex: 1,
    textAlign: "right",
  },
});

export default ProfileInfo;
