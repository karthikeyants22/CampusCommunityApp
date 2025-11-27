import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import Colors from "../Common/Colors";
import { useNavigation } from "@react-navigation/native";

// const highlights = ["Clubs & events", "Community posts", "Verified profiles","Announcement"];
const highlights = [ "Clubs & Events","Community Posts","Verified Profiles",
  "Announcements",
  "Campus News",
  "Student Achievements",
  // "Job & Internship Board",
 
  // "Lost & Found",
  // "Study Groups",
  // "Alumni Network",
  // "Campus Polls & Surveys",
  // "Event Registrations",
  "Coupons & Discounts",
  // "Academic Resources",
 
  // "Food & Hangout Spots",
  // "Skill Workshops",
  // "Sports & Competitions",
  // "Campus Radio"
];

export default function OnboardingScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView>
  <SafeAreaView style={styles.screen}>
      <View style={styles.heroContainer}>
        <View style={styles.rippleOne} />
        <View style={styles.rippleTwo} />
        <Image
          source={require("../Assets/OnBoardImg.png")}
          resizeMode="contain"
          style={styles.heroImage}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Campus social hub</Text>
        </View>
        <Text style={styles.title}>Connect, Engage, Thrive</Text>
        <Text style={styles.subtitle}>
          Cvibe keeps you plugged into everything happening around campus. Join
          clubs, follow events, and meet people who match your vibe.
        </Text>

        <View style={styles.highlightRow}>
          {highlights.map((item) => (
            <View key={item} style={styles.highlightChip}>
              <View style={styles.chipDot} />
              <Text style={styles.chipText}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("EmailVerificationScreen")}
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("LoginScreen")}>
          <Text style={styles.secondaryLink}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </ScrollView>
  
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f5fb",
    paddingHorizontal: 20,
  },
  heroContainer: {
    marginTop: 30,
    backgroundColor: "#ece9ff",
    borderRadius: 28,
    height: 260,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  heroImage: {
    width: "80%",
    height: "80%",
  },
  rippleOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.4)",
    top: -40,
    right: -60,
  },
  rippleTwo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.25)",
    bottom: -50,
    left: -40,
  },
  card: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 24,
    shadowColor: "rgba(16, 24, 40, 0.15)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(108, 63, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6c3bff",
    marginRight: 6,
  },
  badgeText: {
    color: "#6c3bff",
    fontWeight: "600",
    fontSize: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.black || "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#63657a",
    lineHeight: 20,
    marginTop: 10,
  },
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 18,
    gap: 10,
  },
  highlightChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f1ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#5b4ce2",
    marginRight: 8,
  },
  chipText: {
    color: "#383a56",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 26,
    backgroundColor: "#1f1fb8",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryLink: {
    marginTop: 14,
    textAlign: "center",
    color: "#6c3bff",
    fontWeight: "600",
    fontSize: 13,
  },
});
