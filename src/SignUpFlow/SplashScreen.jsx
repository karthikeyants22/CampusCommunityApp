// SplashScreen.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { ACCESS_TOKEN_KEY } from "../Authentication/axiosClient";

const SplashScreen = () => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);

        console.log("TOKEN",token)

        setTimeout(() => {
          if (token) {
            console.log("TOKE",token)

            navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
          } else {
            navigation.reset({ index: 0, routes: [{ name: "OnboardingScreen" }] });
          }
        }, 2500); // wait for animation
      } catch (error) {
        console.log("Error loading from AsyncStorage:", error);
      }
    };

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        })
      ),
    ]).start();

    loadData();
  }, []);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  return (
    <View style={styles.screen}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <Animated.View
        style={[
          styles.pulseCircle,
          {
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.logoText}>Cvibe</Text>
        <Text style={styles.tagline}>Campus energy, everywhere</Text>
      </Animated.View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#1b1242",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glowOne: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(112, 70, 255, 0.35)",
    top: -60,
    right: -40,
  },
  glowTwo: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(255, 118, 219, 0.25)",
    bottom: -80,
    left: -60,
  },
  pulseCircle: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  logoWrapper: {
    backgroundColor: "rgba(15, 9, 35, 0.65)",
    paddingVertical: 32,
    paddingHorizontal: 48,
    borderRadius: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  logoText: {
    fontSize: 48,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 6,
  },
  tagline: {
    marginTop: 10,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1,
  },
});
