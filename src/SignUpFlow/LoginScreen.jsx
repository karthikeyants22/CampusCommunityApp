import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-simple-toast";
import authService from "../Authentication/authService";

export default function LoginScreen() {
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // ✅ Email validation regex
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateForm = () => {
    let tempErrors = {};

    if (!email.trim()) {
      tempErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      tempErrors.email = "Invalid email format";
    }

    if (!password.trim()) {
      tempErrors.password = "Password is required";
    } else if (password.length < 6) {
      tempErrors.password = "Password must be at least 6 characters";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleLogin = async () => {

    if (!validateForm()) return;
    const cleanEmail = email.trim();
    setLoading(true);
    const result = await authService.login(cleanEmail, password);
    if (result.status===200) {
      Toast.show("Login successful");
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    } else {
      Toast.show(result.data?.message || result.data?.error || "Login failed");
    }
    setLoading(false);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#1d1b2f" />
            </TouchableOpacity>
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#5b4ce2" />
              <Text style={styles.heroBadgeText}>Secure access</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSubtitle}>
            Sign in with your credentials to continue exploring Cvibe.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Account details</Text>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Email address</Text>
              <Text style={styles.labelHint}>Use your campus email</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="name@college.edu"
              placeholderTextColor="#9ca0b9"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity>
                <Text style={styles.subtleLink}>Forgot?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                placeholderTextColor="#9ca0b9"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#6b6f89"
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Signing in...' : 'Login'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EmailVerificationScreen')}>
              <Text style={styles.linkText}>Create one</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f6fb" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: "#ece9ff",
    borderRadius: 28,
    padding: 24,
    paddingTop: 32,
    marginBottom: 20,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(18, 20, 40, 0.2)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(91, 76, 226, 0.16)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  heroBadgeText: { color: "#1d1b2f", fontSize: 12, fontWeight: "600" },
  heroTitle: { fontSize: 26, fontWeight: "700", color: "#1d1b2f" },
  heroSubtitle: {
    marginTop: 10,
    color: "#5c607c",
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 20,
    shadowColor: "rgba(15, 17, 49, 0.08)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 6,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1c1b2f", marginBottom: 6 },
  fieldGroup: { marginTop: 14 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 13, fontWeight: "600", color: "#2a2a3b" },
  labelHint: { fontSize: 12, color: "#8f92b2" },
  subtleLink: { fontSize: 12, color: "#5b4ce2", fontWeight: "600" },
  textInput: {
    marginTop: 8,
    backgroundColor: "#f7f8fb",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1d1b2f",
    borderWidth: 1,
    borderColor: "#edf0fb",
  },
  passwordWrapper: {
    position: "relative",
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 27,
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: "#1f1fb8",
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footerRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  footerText: { color: "#6d708f", fontSize: 13 },
  linkText: { color: "#5b4ce2", fontSize: 13, fontWeight: "700" },
  errorText: { color: "#e05959", fontSize: 12, marginTop: 6, marginLeft: 4 },
});

