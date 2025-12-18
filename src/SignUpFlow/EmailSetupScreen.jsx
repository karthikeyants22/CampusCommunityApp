import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import authService from "../Authentication/authService";
import { useAppContext } from "../Context/AppContext";
import Toast from "react-native-simple-toast";

export default function EmailVerificationScreen() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { updateField } = useAppContext();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const isValidEmail = useMemo(() => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return re.test(email.trim());
  }, [email]);

  const showError = touched && email.length > 0 && !isValidEmail;

  const onSubmit = async () => {
          

    const cleanEmail = email.trim();
    updateField("email", cleanEmail);
    setLoading(true);
      

    const result = await authService.SendVerificationCode(cleanEmail);

    if (result.status === 200) {
      Toast.show(result.data?.message || "Verification code sent");
      navigation.navigate("main");
    } else {
      Toast.show(result.data?.error || result.data?.message || "Something went wrong!");
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: "padding", android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 16, android: 0 })}
      >
        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            isWide && styles.scrollContentWide,
          ]}
        >
          <View style={[styles.card, isWide && styles.cardWide]}>
            <View style={styles.hero}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Account security</Text>
              </View>
              <Text style={styles.title}>Verify your email</Text>
              <Text style={styles.subtitle}>
                We will send a one-time code to make sure this email belongs to you.
                Verifying keeps your workspace secure on every screen size.
              </Text>

              <View style={styles.progressTrack}>
                <View style={[styles.progressDot, styles.progressDotActive]} />
                <View style={[styles.progressDot, styles.progressDotActive]} />
                <View style={[styles.progressDot, styles.progressDotEnd]} />
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Email address</Text>
              <View
                style={[
                  styles.inputWrap,
                  showError && styles.inputErrorBorder,
                ]}
              >
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onBlur={() => setTouched(true)}
                  placeholder="name@company.com"
                  placeholderTextColor="#9B96B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  returnKeyType="done"
                />
              </View>
              {showError ? (
                <Text style={styles.errorText}>Enter a valid email to continue.</Text>
              ) : (
                <Text style={styles.helperText}>We never share your email with anyone.</Text>
              )}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.cta,
                  (!isValidEmail || loading) && styles.ctaDisabled,
                ]}
                onPress={onSubmit}
                disabled={!isValidEmail || loading}
              >
                <Text style={styles.ctaText}>
                  {loading ? "Sending..." : "Send verification code"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => navigation.navigate("LoginScreen")}
              >
                <Text style={styles.secondaryText}>
                  Already have an account? <Text style={styles.signInLink}>Log in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F2FF" },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  scrollContentWide: {
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 26,
    shadowColor: "#4E3EF5",
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  cardWide: { width: 520 },
  hero: { marginBottom: 24 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF0FF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  badgeText: { color: "#4A39C6", fontSize: 12, fontWeight: "600" },
  title: { color: "#1D154F", fontSize: 28, fontWeight: "700", marginBottom: 10 },
  subtitle: { color: "#6F6A92", fontSize: 15, lineHeight: 22 },
  progressTrack: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: "#DFDCF2",
    marginRight: 6,
  },
  progressDotEnd: { marginRight: 0 },
  progressDotActive: { backgroundColor: "#6C3BFF" },
  fieldWrap: { marginBottom: 32 },
  label: { color: "#1F1A3D", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  inputWrap: {
    backgroundColor: "#F8F7FF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E1FF",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    fontSize: 15,
    color: "#1D154F",
    height: 48,
  },
  helperText: { marginTop: 8, color: "#8A86A9", fontSize: 12 },
  inputErrorBorder: { borderColor: "#F05A5A" },
  errorText: { marginTop: 8, color: "#F05A5A", fontSize: 12 },
  footer: { marginTop: 8 },
  cta: {
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6C3BFF",
    shadowColor: "#6C3BFF",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryAction: { paddingVertical: 18 },
  secondaryText: { textAlign: "center", color: "#6F6A92", fontSize: 14 },
  signInLink: { color: "#6C3BFF", fontWeight: "600" },
});
