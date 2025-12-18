

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// import Icon from 'react-native-vector-icons/MaterialIcons';
// import Feather from 'react-native-vector-icons/Feather';
// import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import appConfig from './app.json';

import Colors from './src/Common/Colors';

import HomeScreen from './src/ScreenComponents/Home';
import ChannelScreen from './src/ScreenComponents/Channels';
import DealsScreen from './src/ScreenComponents/Deals';
import JobsScreen from './src/ScreenComponents/Jobs';
import DiscountDetailsScreen from './src/ScreenComponents/DiscountDetails';

import UploadScreen from './src/HomeScreens/UploadScreenOption';
import OnboardingScreen from './src/SignUpFlow/StartingScreen';
import SignUpScreen from './src/SignUpFlow/SignUp';
import ProfileSetupScreen from './src/SignUpFlow/ProfileSetUp';
import EmailVerificationScreen from './src/SignUpFlow/EmailSetupScreen';
import { AppProvider } from "./src/Context/AppContext"; // 👈 import
import LoginScreen from './src/SignUpFlow/LoginScreen';
import SplashScreen from './src/SignUpFlow/SplashScreen';
import ProfileInfo from './src/ScreenComponents/ProfileInfo';
import authService from "./src/Authentication/authService";

const LOGO_IMAGE = require("./src/Assets/OnBoardImg.png");
const APP_NAME = appConfig.displayName || appConfig.name || 'App';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AppHeader() {
  const insets = useSafeAreaInsets();

   useEffect( () => {


  }, []);


  return (
    //   <View style={[styles.headerWrapper, { paddingTop: insets.top || 0 }]}>
    //     <View style={styles.headerContainer}>
    //       <View style={styles.headerLeft}>
    //         <Image source={LOGO_IMAGE} style={styles.logo} resizeMode="contain" />
    //         <Text style={styles.appName}>{APP_NAME}</Text>
    //       </View>
    //       <View style={styles.headerRight}>
    //         <TouchableOpacity
    //           accessibilityRole="button"
    //           accessibilityLabel="Notifications"
    //           style={styles.iconButton}
    //           hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    //         >
    //           <Feather name="bell" size={22} color={Colors.black} />
    //         </TouchableOpacity>
    //         <TouchableOpacity
    //           accessibilityRole="button"
    //           accessibilityLabel="Profile"
    //           style={styles.iconButton}
    //           hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    //         >
    //           <Feather name="user" size={22} color={Colors.black} />
    //         </TouchableOpacity>
    //       </View>
    //     </View>
    //   </View>
    <View style={styles.header}>
      <View style={styles.brandBlock}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandInitial}>C</Text>
        </View>
        <Text style={styles.brandName}>Cvibe</Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
          <Feather name="bell" size={20} color="#2D3A4A" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
        <View style={styles.profileBubble}>
          <Text style={styles.profileInitial}>D</Text>
        </View>
      </View>
    </View>

  );

}

// Bottom Tabs
function BottomTabs() {
  const renderTabIcon = (route, focused, size) => {
    let IconCmp = Feather;
    let iconName = 'home';

    if (route.name === 'Home') {
      IconCmp = Feather;
      iconName = 'home';
    } else if (route.name === 'Channel') {
      IconCmp = MaterialIcons;
      iconName = 'chat-bubble-outline';
    } else if (route.name === 'Benefits') {
      IconCmp = Feather;
      iconName = 'tag';
    } else if (route.name === 'Jobs') {
      IconCmp = Feather;
      iconName = 'briefcase';
    } else {
      IconCmp = Feather;
      iconName = 'user';
    }

    const tint = focused ? '#1F2937' : '#9CA3AF';
    return (
      <View style={styles.tabIconMinimal}>
        <IconCmp name={iconName} size={size + 2} color={tint} />
        {focused ? <View style={styles.tabActiveDot} /> : null}
      </View>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ size, focused }) => renderTabIcon(route, focused, size),
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#1F2937',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: Colors.white,
          elevation: 0,
          shadowOpacity: 0,
          borderTopWidth: 0.5,
          borderTopColor: '#E5E7EB',
          height: 56,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        header: () => <AppHeader />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Channel" component={ChannelScreen} />
      <Tab.Screen name="Benefits" component={DealsScreen} />
      <Tab.Screen name="Jobs" component={JobsScreen} />
      <Tab.Screen name="Profile" component={ProfileInfo} />

    </Tab.Navigator>
  );
}

function App() {
  return (
    <AppProvider>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f7fb' }} edges={['top', 'left', 'right']}>
          <StatusBar barStyle='light-content' backgroundColor="#ffff" translucent={true} />
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{ headerShown: false }}
            //initialRouteName="OnboardingScreen"
            >
              <Stack.Screen
                name="SplashScreen"
                component={SplashScreen}
                options={{
                  //  title: 'Upload',
                  animationEnabled: true,
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="OnboardingScreen"
                component={OnboardingScreen}
                options={{
                  //  title: 'Upload',
                  animationEnabled: true,
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="EmailVerificationScreen"
                component={EmailVerificationScreen}
                options={{
                  //  title: 'Upload',
                  animationEnabled: true,
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="SignUpScreen"
                component={SignUpScreen}
                options={{
                  //  title: 'Upload',
                  animationEnabled: true,
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="LoginScreen"
                component={LoginScreen}
                options={{
                  //  title: 'Upload',
                  animationEnabled: true,
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="ProfileSetupScreen"
                component={ProfileSetupScreen}
                options={{
                  //  title: 'Upload',
                  animationEnabled: true,
                  headerShown: false,
                }}
              />
              {/* Bottom Tab as initial route */}
              <Stack.Screen name="MainTabs" component={BottomTabs} />

              {/* Other Screens */}
              <Stack.Screen
                name="DiscountDetails"
                component={DiscountDetailsScreen}
                options={{
                  animationEnabled: true,
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="UploadScreen"
                component={UploadScreen}
                options={{
                  title: 'Upload',
                  animationEnabled: true,
                }}
              />
              {/* <Stack.Screen name="UploadScreen" component={UploadScreen} options={{ title: 'Upload' }} /> */}
              {/* Future Screens can be added below */}
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </SafeAreaProvider>
    </AppProvider>
  );
}

export default App;

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 8,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.black,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
    marginStart:15,marginEnd:15
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  brandName: {
    marginLeft: 10,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
  },
  profileBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  tabIconMinimal: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabActiveDot: {
    width: 16,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#1F2937',
    marginTop: 4,
  },
});
