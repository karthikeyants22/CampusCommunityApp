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
import { Dropdown } from "react-native-element-dropdown";
import { useAppContext } from "../Context/AppContext";
import authService from "../Authentication/authService";
import Toast from "react-native-simple-toast";

export default function ProfileSetupScreen() {
  const navigation = useNavigation();
  const { appData } = useAppContext();

  const [degrees, setDegrees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [fullName, setFullName] = useState("");
  const [userName, setUserName] = useState("");
  const [gender, setGender] = useState("");
  const [year, setYear] = useState("");
  const [studentId, setStudentId] = useState("");
  const [staffId, setStaffId] = useState("");

  const [degreeId, setDegreeId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [designationId, setDesignationId] = useState(null);

  const isStudent =
    appData.role === 3 || appData.role === "student" || appData.role === "STUDENT";

  const fetchReferenceData = async () => {
    if (appData.role === undefined || appData.role === null || appData.role === "") {
      setRefError("Role is missing. Please go back and select a role.");
      return;
    }
    setRefLoading(true);
    setRefError("");
    try {
      const res = await authService.getUsers({ roleKey: appData.role });
      if (res.isSuccess) {
        const deg = Array.isArray(res.data?.degrees)
          ? res.data.degrees.map((d) => ({
              label: `${d.degreeAbbr} - ${d.degreeName}`,
              value: d.degreeId,
            }))
          : [];
        const deps = Array.isArray(res.data?.departments)
          ? res.data.departments.map((d) => ({ label: d.departmentName, value: d.departmentId }))
          : [];
        const des = Array.isArray(res.data?.designations)
          ? res.data.designations.map((d) => ({ label: d.designationName, value: d.designationId }))
          : [];
        setDegrees(deg);
        setDepartments(deps);
        setDesignations(des);
        setDegreeId((prev) => (prev && !deg.find((x) => x.value === prev) ? null : prev));
        setDepartmentId((prev) =>
          prev && !deps.find((x) => x.value === prev) ? null : prev
        );
        setDesignationId((prev) =>
          prev && !des.find((x) => x.value === prev) ? null : prev
        );
      } else {
        setRefError(res.message || "Unable to load reference data");
        setDegrees([]);
        setDepartments([]);
        setDesignations([]);
      }
    } catch (e) {
      setRefError("Failed to load reference data");
      setDegrees([]);
      setDepartments([]);
      setDesignations([]);
    } finally {
      setRefLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, [appData.role]);

  const handleRetryReference = () => {
    fetchReferenceData();
  };

  const handleSubmit = async () => {

    if (refLoading || submitting) return;
    // Trim/sanitize
    const name = (fullName || "").trim();
    const uname = (userName || "").trim();
    const genderLower = (gender || "").toString().toLowerCase();
    const yearNum = year ? parseInt(String(year), 10) : null;

    // Resolve roleKey to numeric (2=staff, 3=student)
    let roleKey = appData.role;
    if (typeof roleKey !== "number") {
      const rk = String(roleKey || "").toLowerCase();
      roleKey = rk === "student" ? 3 : rk === "staff" ? 2 : null;
    }
    if (roleKey !== 2 && roleKey !== 3) {
      Toast.show("Invalid role. Please go back and choose again.");
      return;
    }

    // Username rules: 3-30, letters/numbers/dot/underscore/hyphen
    const usernameOk = /^[A-Za-z0-9._-]{3,30}$/.test(uname);
    const nextErrors = {};
    if (!name) nextErrors.fullName = "Full name is required";
    if (!usernameOk) nextErrors.userName = "Username must be 3-30 chars (letters, numbers, ., _, -)";

    // Role-specific validation
    if (roleKey === 3) {
      if (!degreeId) nextErrors.degreeId = "Please select a degree";
      if (!departmentId) nextErrors.departmentId = "Please select a department";
      if (!yearNum || !Number.isInteger(yearNum) || yearNum < 1990 || yearNum > (new Date().getFullYear() + 1)) {
        nextErrors.year = "Enter a valid year of joining";
      }
      if (!studentId || !String(studentId).trim()) nextErrors.studentId = "Student ID is required";
    } else if (roleKey === 2) {
      if (!departmentId) nextErrors.departmentId = "Please select a department";
      if (!designationId) nextErrors.designationId = "Please select a designation";
      if (!staffId || !String(staffId).trim()) nextErrors.staffId = "Staff ID is required";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const result = await authService.Registeruser(
      name,
      uname,
      appData.email,
      appData.password,
      roleKey,
      appData.otpvalnumber,
      degreeId,
      departmentId,
      genderLower,
      yearNum,
      roleKey === 3 ? String(studentId).trim() : null,
      roleKey === 2 ? designationId : null,
      roleKey === 2 ? String(staffId).trim() : null
    );

    setSubmitting(false);
    if (result.status === 200) {
      Toast.show("Account created successfully");
      navigation.reset({ index: 0, routes: [{ name: "LoginScreen" }] });
    } else {
      Toast.show(result.data?.message || result.data?.error || "Registration failed");
    }
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
              <Ionicons name="arrow-back" size={20} color="#1c1b2f" />
            </TouchableOpacity>
            <View style={styles.heroBadges}>
              <View style={[styles.metaPill, styles.rolePill]}>
                <Ionicons
                  name={isStudent ? "school-outline" : "briefcase-outline"}
                  size={14}
                  color="#5b4ce2"
                />
                <Text style={styles.metaPillText}>
                  {isStudent ? "Student flow" : "Staff flow"}
                </Text>
              </View>
              <View style={styles.metaPill}>
                <Ionicons name="checkmark-done" size={14} color="#2fb07b" />
                <Text style={styles.metaPillText}>Step 2 of 2</Text>
              </View>
            </View>
          </View>
          <Text style={styles.heroTitle}>Complete your profile</Text>
          <Text style={styles.heroSubtitle}>
            {isStudent
              ? "Share your academic journey so we can tailor the campus experience for you."
              : "Add your faculty details to help students recognize and reach you faster."}
          </Text>
        </View>

        <View style={styles.formCard}>
          {refError ? (
            <View style={styles.inlineError}>
              <Text style={styles.inlineErrorText}>{refError}</Text>
              <TouchableOpacity onPress={handleRetryReference}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {refLoading ? (
            <View style={styles.statusPill}>
              <Ionicons name="sync" size={14} color="#5b4ce2" />
              <Text style={styles.statusPillText}>Loading reference data...</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Basic info</Text>
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Full name</Text>
              <Text style={styles.labelHint}>As per records</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your full name"
              placeholderTextColor="#9da1b9"
              value={fullName}
              onChangeText={setFullName}
            />
            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Username</Text>
              <Text style={styles.labelHint}>Visible to peers</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. karthi_raj"
              placeholderTextColor="#9da1b9"
              value={userName}
              onChangeText={setUserName}
              autoCapitalize="none"
            />
            {errors.userName ? <Text style={styles.errorText}>{errors.userName}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Gender</Text>
              <Text style={styles.labelHint}>Pick one</Text>
            </View>
            <View style={styles.choiceRow}>
              {['Male', 'Female', 'Other'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.choiceChip,
                    gender === option && styles.choiceChipSelected,
                  ]}
                  onPress={() => setGender(option)}
                >
                  <Text
                    style={[
                      styles.choiceChipText,
                      gender === option && styles.choiceChipTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            {isStudent ? "Academic details" : "Professional details"}
          </Text>

          {isStudent ? (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Degree</Text>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={degrees}
                  labelField="label"
                  valueField="value"
                  placeholder="Select degree"
                  value={degreeId}
                  onChange={(item) => setDegreeId(item.value)}
                  disable={refLoading || degrees.length === 0}
                />
                {errors.degreeId ? (
                  <Text style={styles.errorText}>{errors.degreeId}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Department</Text>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={departments}
                  labelField="label"
                  valueField="value"
                  placeholder="Select department"
                  value={departmentId}
                  onChange={(item) => setDepartmentId(item.value)}
                  disable={refLoading || departments.length === 0}
                />
                {errors.departmentId ? (
                  <Text style={styles.errorText}>{errors.departmentId}</Text>
                ) : null}
              </View>

              <View style={styles.inlineFields}>
                <View style={[styles.fieldGroup, styles.inlineField]}>
                  <Text style={styles.label}>Year of joining</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="2024"
                    placeholderTextColor="#9da1b9"
                    value={year}
                    onChangeText={setYear}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  {errors.year ? <Text style={styles.errorText}>{errors.year}</Text> : null}
                </View>
                <View style={[styles.fieldGroup, styles.inlineField]}>
                  <Text style={styles.label}>Student ID</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Campus ID"
                    placeholderTextColor="#9da1b9"
                    value={studentId}
                    onChangeText={setStudentId}
                    autoCapitalize="characters"
                  />
                  {errors.studentId ? (
                    <Text style={styles.errorText}>{errors.studentId}</Text>
                  ) : null}
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Department</Text>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={departments}
                  labelField="label"
                  valueField="value"
                  placeholder="Select department"
                  value={departmentId}
                  onChange={(item) => setDepartmentId(item.value)}
                  disable={refLoading || departments.length === 0}
                />
                {errors.departmentId ? (
                  <Text style={styles.errorText}>{errors.departmentId}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Designation</Text>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={designations}
                  labelField="label"
                  valueField="value"
                  placeholder="Select designation"
                  value={designationId}
                  onChange={(item) => setDesignationId(item.value)}
                  disable={refLoading || designations.length === 0}
                />
                {errors.designationId ? (
                  <Text style={styles.errorText}>{errors.designationId}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Staff ID</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Faculty ID"
                  placeholderTextColor="#9da1b9"
                  value={staffId}
                  onChangeText={setStaffId}
                  autoCapitalize="characters"
                />
                {errors.staffId ? <Text style={styles.errorText}>{errors.staffId}</Text> : null}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (refLoading || submitting) && styles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={refLoading || submitting}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? "Submitting..." : "Save & continue"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f6f7fb" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: "#ece9ff",
    borderRadius: 28,
    padding: 24,
    paddingTop: 32,
    marginBottom: 22,
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
  heroBadges: { flexDirection: "row", alignItems: "center", gap: 10 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(91, 76, 226, 0.12)",
    gap: 6,
  },
  rolePill: { backgroundColor: "rgba(91, 76, 226, 0.2)" },
  metaPillText: { color: "#1c1b2f", fontSize: 12, fontWeight: "600" },
  heroTitle: { fontSize: 24, fontWeight: "700", color: "#1c1b2f" },
  heroSubtitle: {
    marginTop: 10,
    color: "#5b5f7c",
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
  inlineError: {
    backgroundColor: "#ffe9e9",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inlineErrorText: { color: "#c24141", fontSize: 13, flex: 1, marginRight: 12 },
  retryText: { color: "#5b4ce2", fontWeight: "600", fontSize: 13 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(91, 76, 226, 0.12)",
    gap: 6,
    marginBottom: 12,
  },
  statusPillText: { color: "#5b4ce2", fontSize: 12, fontWeight: "600" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1b2f",
    marginTop: 8,
    marginBottom: 6,
  },
  fieldGroup: { marginTop: 12 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 13, fontWeight: "600", color: "#2a2a3b" },
  labelHint: { fontSize: 12, color: "#8f92b2" },
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
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  choiceChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f4f4fb",
    borderWidth: 1,
    borderColor: "#e0e3f3",
  },
  choiceChipSelected: {
    backgroundColor: "rgba(91, 76, 226, 0.15)",
    borderColor: "#5b4ce2",
  },
  choiceChipText: { color: "#4a4e6b", fontWeight: "500" },
  choiceChipTextSelected: { color: "#2a246a" },
  dropdown: {
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#f7f8fb",
    borderWidth: 1,
    borderColor: "#edf0fb",
  },
  placeholderStyle: { fontSize: 14, color: "#9da1b9" },
  selectedTextStyle: { fontSize: 15, color: "#1d1b2f" },
  inlineFields: { flexDirection: "row", gap: 12 },
  inlineField: { flex: 1 },
  primaryButton: {
    marginTop: 28,
    backgroundColor: "#1f1fb8",
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  errorText: { color: "#e05959", fontSize: 12, marginTop: 6, marginLeft: 4 },
});
