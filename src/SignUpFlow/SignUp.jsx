import React, { useState, useEffect } from "react";
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
import authService from "../Authentication/authService";
import { useAppContext } from "../Context/AppContext";
import Toast from "react-native-simple-toast";

const maskEmail = (email) => {
  if (!email) return "your email";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(local.length, 2));
  const obfuscation = local.length > visible.length ? "****" : "";
  return `${visible}${obfuscation}@${domain}`;
};

export default function SignUpScreen() {
  const navigation = useNavigation();
  const { appData, updateField } = useAppContext();

  const [verificationCode, setVerificationCode] = useState("12345");
  const [password, setPassword] = useState("Test1234");
  const [confirmPassword, setConfirmPassword] = useState("Test1234");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roles, setRoles] = useState([]);
  const [otpticket, setotpticket] = useState("");

  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpStatus, setOtpStatus] = useState("idle");
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const maskedEmail = maskEmail(appData?.email);
  const otpIconMeta = isOtpVerified
    ? { icon: "checkmark-circle", color: "#2fb07b" }
    : {
        icon: "close-circle",
        color: otpStatus === "error" ? "#ff6b6b" : "#c4c6d9",
  };

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const validateForm = () => {
    let tempErrors = {};

    if (!verificationCode.trim()) {
      tempErrors.verificationCode = "Verification code is required";
    } else if (verificationCode.length < 4) {
      tempErrors.verificationCode = "Code must be at least 4 digits";
    }

    if (!password.trim()) {
      tempErrors.password = "Password is required";
    } else if (password.length < 6) {
      tempErrors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword.trim()) {
      tempErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      tempErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleCodeChange = (value) => {
    setVerificationCode(value);
    if (isOtpVerified) {
      setIsOtpVerified(false);
    }
    if (otpStatus !== "idle") {
      setOtpStatus("idle");
    }
  };

  const handleVerifyOtp = async () => {
    // navigation.navigate("ProfileSetupScreen");

    if (verifying) return;
    setVerifying(true);
    setIsOtpVerified(false);
    setOtpStatus("idle");

    try {
      // Call your backend OTP verify API
      const result = await authService.verifyOtp(appData.email, verificationCode);

      if (result.isSuccess) {
        setotpticket(result.data.otpTicket);
        setRoles(result.data.roles);
        setIsOtpVerified(true);
        setOtpStatus("success");
        Toast.show(result.data?.message || "OTP verified");

        //Alert.alert("OTP Verified", "You can continue now.");
      } else {
        Toast.show(
          result.data?.error || result.message || result.data?.message || "OTP verification failed"
        );

        setIsOtpVerified(false);
        setOtpStatus("error");
        //Alert.alert("Invalid OTP", result.message || "Please try again");
      }
    } catch (error) {
      setIsOtpVerified(false);
      setOtpStatus("error");
      //Alert.alert("Verification failed", error.message);
    }
    setVerifying(false);
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || resending) return;
    if (!appData?.email) {
      Toast.show("Email missing. Go back and enter your email again.");
      return;
    }
    try {
      setResending(true);
      const response = await authService.SendVerificationCode(appData.email);
      if (response.status >= 200 && response.status < 300) {
        Toast.show(response.data?.message || "OTP sent again");
        setResendTimer(30);
      } else {
        Toast.show(response.data?.message || response.data?.error || "Failed to resend OTP");
      }
    } catch (error) {
      Toast.show(error?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const handleSelect = (roleKey) => {
 
    setSelectedRole(roleKey);
  };
  const handleSignUp = () => {

    if (!validateForm()) return;

    if (!isOtpVerified) {
              Toast.show("Otp not verified");

     // Alert.alert("OTP not verified", "Please verify your OTP before continuing.");
      return;
    }
        if (selectedRole===null) {
              Toast.show("Select Student or Staff");

     // Alert.alert("OTP not verified", "Please verify your OTP before continuing.");
      return;
    }

    // Save data into context
    updateField({
      role: selectedRole,
      password: password,
      confirmPassword: confirmPassword,
      otpvalnumber:otpticket
    }); // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦
    // Navigate to Profile setup
    navigation.navigate("ProfileSetupScreen");
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color="#1c1b2e" />
            </TouchableOpacity>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Create account</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Sign up</Text>
          <Text style={styles.heroSubtitle}>Join Cvibe</Text>
          <Text style={styles.heroDescription}>
            Enter the verification code we sent to{" "}
            <Text style={styles.heroDescriptionBold}>{maskedEmail}</Text> to
            continue.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Verification code</Text>
              <Text style={styles.labelHint}>Sent to {maskedEmail}</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter verification code"
                placeholderTextColor="#9fa2b7"
                keyboardType="numeric"
                value={verificationCode}
                onChangeText={handleCodeChange}
                autoCapitalize="none"
              />
              <Ionicons
                name={otpIconMeta.icon}
                size={22}
                color={otpIconMeta.color}
              />
            </View>
            {errors.verificationCode && (
              <Text style={styles.error}>{errors.verificationCode}</Text>
            )}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                isOtpVerified && styles.verifyButtonSuccess,
                (verifying || isOtpVerified) && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerifyOtp}
              disabled={verifying || isOtpVerified}
            >
              <Ionicons
                name={isOtpVerified ? "shield-checkmark" : "shield-outline"}
                size={18}
                color="#fff"
                style={styles.verifyButtonIcon}
              />
              <Text style={styles.verifyButtonText}>
                {isOtpVerified
                  ? "OTP verified"
                  : verifying
                  ? "Verifying..."
                  : "Verify OTP"}
              </Text>
            </TouchableOpacity>
            <View style={styles.resendRow}>
              <Text style={styles.resendHint}>Didn’t get the code?</Text>
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={resendTimer > 0 || resending}
              >
                <Text
                  style={[
                    styles.resendLink,
                    (resendTimer > 0 || resending) && styles.resendLinkDisabled,
                  ]}
                >
                  {resending
                    ? "Sending..."
                    : resendTimer > 0
                    ? `Resend in ${resendTimer}s`
                    : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Choose your role</Text>
              <Text style={styles.labelHint}>
                {roles.length ? "Pick the best fit" : "Unlock after OTP"}
              </Text>
            </View>
            <View style={styles.rolesWrap}>
              {roles.length === 0 ? (
                <Text style={styles.rolesPlaceholder}>
                  Verify your OTP to see available roles.
                </Text>
              ) : (
                roles.map((role) => (
                  <TouchableOpacity
                    key={role.roleKey}
                    style={[
                      styles.rolePill,
                      selectedRole === role.roleKey && styles.rolePillSelected,
                    ]}
                    onPress={() => handleSelect(role.roleKey)}
                  >
                    <Text
                      style={[
                        styles.rolePillText,
                        selectedRole === role.roleKey &&
                          styles.rolePillTextSelected,
                      ]}
                    >
                      {role.roleName}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <Text style={styles.labelHint}>Min. 6 characters</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Create a password"
                placeholderTextColor="#9fa2b7"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.inlineIconButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#6e718d"
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.error}>{errors.password}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Confirm password</Text>
              <Text style={styles.labelHint}>Match the password</Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Re-enter your password"
                placeholderTextColor="#9fa2b7"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                style={styles.inlineIconButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#6e718d"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.error}>{errors.confirmPassword}</Text>
            )}
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp}>
            <Text style={styles.primaryButtonText}>
              Continue to profile setup
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
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
    marginBottom: 24,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(17, 19, 40, 0.15)",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroBadge: {
    backgroundColor: "rgba(108, 99, 255, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "#5a4ada",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  heroTitle: { fontSize: 26, fontWeight: "700", color: "#1c1b2e" },
  heroSubtitle: { fontSize: 20, fontWeight: "600", color: "#6c63ff", marginTop: 4 },
  heroDescription: {
    marginTop: 12,
    color: "#585a78",
    fontSize: 14,
    lineHeight: 20,
  },
  heroDescriptionBold: { color: "#1c1b2e", fontWeight: "600" },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 20,
    shadowColor: "rgba(18, 20, 40, 0.15)",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  fieldGroup: { marginTop: 18 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 14, fontWeight: "600", color: "#1c1b2e" },
  labelHint: { fontSize: 12, color: "#8c8faa" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f8fb",
    borderRadius: 18,
    paddingHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#edf0fb",
  },
  textInput: { flex: 1, fontSize: 16, color: "#1c1b2e", paddingVertical: 14 },
  inlineIconButton: { paddingLeft: 12 },
  verifyButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#6c63ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  verifyButtonDisabled: { opacity: 0.7 },
  verifyButtonSuccess: { backgroundColor: "#2fb07b" },
  verifyButtonIcon: { marginRight: 8 },
  verifyButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  resendHint: { color: "#8c8faa", fontSize: 12 },
  resendLink: { color: "#5b4ce2", fontWeight: "600", fontSize: 12 },
  resendLinkDisabled: { color: "#c1c4d9" },
  rolesWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  rolePill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dcdff1",
    backgroundColor: "#f7f8fb",
    marginRight: 10,
    marginBottom: 10,
  },
  rolePillSelected: {
    backgroundColor: "rgba(108, 99, 255, 0.15)",
    borderColor: "#6c63ff",
  },
  rolePillText: { color: "#4c4e66", fontWeight: "500" },
  rolePillTextSelected: { color: "#2f1c6a" },
  rolesPlaceholder: { color: "#a0a3bc", fontSize: 13, marginTop: 4 },
  primaryButton: {
    marginTop: 30,
    backgroundColor: "#1f1fb8",
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
  error: { color: "#ff6b6b", fontSize: 12, marginTop: 6, marginLeft: 4 },
})





