import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import Colors from "../Common/Colors";
import { useAppContext } from "../Context/AppContext";
import authService from "../Authentication/authService";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

const FALLBACK_TEXT = "";
const DOTS = Array.from({ length: 90 });
const SCREEN_WIDTH = Dimensions.get("window").width;
const AVATAR_ORIGIN = "https://dealtime-best-illustrated-preparation.trycloudflare.com";
const ANDROID_13 = 33;

const ProfileInfo = () => {
  const navigation = useNavigation();
  const { appData } = useAppContext();
  const [activeTab, setActiveTab] = useState("Posts");
  const [isFollowing, setIsFollowing] = useState(false);
  const pagerRef = useRef(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [avatarUpdating, setAvatarUpdating] = useState(false);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const displayText = (value) => {
    if (value === null || value === undefined) {
      return FALLBACK_TEXT;
    }
    const text = String(value).trim();
    return text.length > 0 ? text : FALLBACK_TEXT;
  };

  const resolvedProfile = useMemo(
    () => (profileData && typeof profileData === "object" ? profileData : appData),
    [profileData, appData]
  );

  const { firstName, lastName } = useMemo(() => {
    const fullName =
      resolvedProfile?.fullName ||
      resolvedProfile?.name ||
      resolvedProfile?.username ||
      [resolvedProfile?.firstName, resolvedProfile?.lastName].filter(Boolean).join(" ");
    const nameSource = displayText(fullName);
    const parts = nameSource.trim().split(/\s+/);
    return {
      firstName: parts[0] || "",
    // lastName: parts.slice(1).join(" ") || "Sterling",
    };
  }, [resolvedProfile]);

  const profileInitial = useMemo(() => {
    const letter = resolvedProfile?.avatarInitial || firstName?.charAt(0) || "A";
    return letter.toUpperCase();
  }, [firstName, resolvedProfile]);

  const avatarUrl = useMemo(
    () =>
      resolvedProfile?.avatarUrl ||
      resolvedProfile?.avatarUrlFull ||
      resolvedProfile?.profileImage ||
      resolvedProfile?.avatar,
    [resolvedProfile]
  );

  console.log("AVAT",avatarUrl)

  const avatarUri = useMemo(() => {
    
    if (!avatarUrl) return "";
    if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
    return `${AVATAR_ORIGIN}${avatarUrl}`;
  }, [avatarUrl]);

  const applyAvatarUrl = (url) => {
    if (!url) return;
    const resolvedUrl = /^https?:\/\//i.test(url) ? url : `${AVATAR_ORIGIN}${url}`;
    setProfileData((prev) => ({ ...(prev || {}), avatarUrl: resolvedUrl }));
  };

  const handleAvatarResponse = async (response) => {
    if (response?.didCancel) return;
    if (response?.errorCode) {
      setAvatarError(response.errorMessage || "Unable to access image.");
      return;
    }
    const asset = response?.assets?.[0];
    if (!asset?.uri) {
      setAvatarError("No image selected.");
      return;
    }

    setAvatarUpdating(true);
    setAvatarError("");
    const res = await authService.updateAvatar(asset);
    if (res?.isSuccess) {
      const newUrl =
        res.data?.avatarUrl ||
        res.data?.profileImage ||
        res.data?.avatar ||
        res.data?.data?.avatarUrl ||
        asset.uri;
      applyAvatarUrl(newUrl);
    } else {
      setAvatarError(res?.message || "Upload failed.");
    }
    setAvatarUpdating(false);
  };

  const createAndroidPermissionSet = (version, intents) => {
    const permissions = new Set();
    if (intents.includes("camera")) {
      permissions.add(PermissionsAndroid.PERMISSIONS.CAMERA);
    }
    if (intents.includes("library")) {
      const readMediaImages = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
      const readExternal = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const writeExternal = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;

      if (version >= ANDROID_13 && readMediaImages) {
        permissions.add(readMediaImages);
      } else if (readExternal) {
        permissions.add(readExternal);
        if (version <= 28 && writeExternal) {
          permissions.add(writeExternal);
        }
      }
    }
    return Array.from(permissions).filter(Boolean);
  };

  const requestAndroidPermissions = async (intents) => {
    const version = Number(Platform.Version) || 0;
    const required = createAndroidPermissionSet(version, intents);
    if (!required.length) {
      return { granted: true };
    }

    const toRequest = [];
    for (const key of required) {
      const has = await PermissionsAndroid.check(key);
      if (!has) {
        toRequest.push(key);
      }
    }

    if (!toRequest.length) {
      return { granted: true };
    }

    const result = await PermissionsAndroid.requestMultiple(toRequest);
    const denied = [];
    for (const key of toRequest) {
      if (result[key] !== PermissionsAndroid.RESULTS.GRANTED) {
        denied.push(key);
      }
    }

    return { granted: denied.length === 0, denied };
  };

  const launchWithPermission = async (source) => {
    if (Platform.OS === "android") {
      const intents = source === "camera" ? ["camera"] : ["library"];
      const { granted } = await requestAndroidPermissions(intents);
      if (!granted) {
        setAvatarError("Permission denied. Please enable it in settings.");
        return;
      }
    }

    if (source === "camera") {
      launchCamera({ mediaType: "photo", quality: 0.8 }, handleAvatarResponse);
    } else {
      launchImageLibrary(
        { mediaType: "photo", quality: 0.8, selectionLimit: 1,includeExtra:true },
        handleAvatarResponse
      );
    }
  };

  const subtitleText = useMemo(() => {
    const roleText = displayText(
      resolvedProfile?.occupation ||
        resolvedProfile?.designation ||
        resolvedProfile?.role
    );
    if (roleText !== FALLBACK_TEXT) {
      return roleText;
    }
    const departmentText = displayText(
      resolvedProfile?.departmentName || resolvedProfile?.department
    );
    const yearText = displayText(
      resolvedProfile?.yearOfJoining || resolvedProfile?.year
    );
    if (departmentText !== FALLBACK_TEXT && yearText !== FALLBACK_TEXT) {
      return `${departmentText} - Class of ${yearText}`;
    }
    if (departmentText !== FALLBACK_TEXT) {
      return departmentText;
    }
    return displayText(resolvedProfile?.role);
  }, [resolvedProfile]);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError("");
      const res = await authService.getUsersList();

      console.log("RESSSSS>>>>>>>>>>>",res)
      if (!isMounted) return;
      if (res.isSuccess) {
        const payload = res.data?.data ?? res.data;
        setProfileData(payload || null);
        if (typeof payload?.viewerFollowing === "boolean") {
          setIsFollowing(payload.viewerFollowing);
        }
      } else {
        setProfileError(res.message || "Unable to load profile info");
      }
      setProfileLoading(false);
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const postsCount = resolvedProfile?.postsCount ?? 0;
    const followersCount = resolvedProfile?.followersCount ?? 0;
    const followingCount = resolvedProfile?.followingCount ?? 0;
    return [
      { label: "Posts", value: String(postsCount) },
      { label: "Followers", value: String(followersCount) },
      { label: "Following", value: String(followingCount) },
    ];
  }, [isFollowing, resolvedProfile]);

  const tabs = ["Posts", "Bookmarks", "Announcements"];
  const posts = [
    { id: "1", likes: "244", tone: styles.postToneWarm },
    { id: "2", likes: "1.2k", tone: styles.postToneLight },
    { id: "3", likes: "89", tone: styles.postToneCool },
    { id: "4", likes: "", tone: styles.postToneEmpty, dashed: true },
  ];

  const bookmarkItems = [
    { id: "b1", title: "Saved Project Brief", time: "Updated 3 days ago" },
    { id: "b2", title: "Studio Lighting Notes", time: "Saved last week" },
  ];

  const announcementItems = [
    { id: "a1", title: "Portfolio Review Week", time: "Starts Monday" },
    { id: "a2", title: "Internship Applications", time: "Closes Oct 12" },
  ];

  const interactions = [
    {
      id: "1",
      title: "Campus Workshop Announcement",
      body:
        "Shared a new update regarding the upcoming Design Thinking seminar in Hall B.",
      time: "2 HOURS AGO",
      icon: "volume-2",
    },
    {
      id: "2",
      title: "Commented on 'Eco-Campus'",
      body: '"This initiative is exactly what our department has been advocating for!"',
      time: "YESTERDAY",
      icon: "message-square",
    },
  ];

  const handleStatPress = (label) => {
    if (label === "Followers") {
      navigation.navigate("FollowersList", { initialTab: "followers" });
      return;
    }
    if (label === "Following") {
      navigation.navigate("FollowersList", { initialTab: "following" });
    }
  };

  const renderPostItem = ({ item }) => (
    <View
      style={[
        styles.postCard,
        item.tone,
        item.dashed && styles.postCardDashed,
      ]}
    >
      {!item.dashed && (
        <View style={styles.postOverlay}>
          <Feather name="heart" size={12} color={Colors.white} />
          <Text style={styles.postLikes}>{item.likes}</Text>
        </View>
      )}
      {item.dashed && (
        <View style={styles.postEmptyIcon}>
          <Feather name="image" size={22} color="#b9b9c6" />
        </View>
      )}
    </View>
  );

  const renderBookmarkItem = ({ item }) => (
    <View style={styles.listRow}>
      <View style={styles.listIcon}>
        <Feather name="bookmark" size={16} color="#2563EB" />
      </View>
      <View style={styles.listText}>
        <Text style={styles.listTitle}>{item.title}</Text>
        <Text style={styles.listMeta}>{item.time}</Text>
      </View>
    </View>
  );

  const renderAnnouncementItem = ({ item }) => (
    <View style={styles.listRow}>
      <View style={styles.listIcon}>
        <Feather name="bell" size={16} color="#2563EB" />
      </View>
      <View style={styles.listText}>
        <Text style={styles.listTitle}>{item.title}</Text>
        <Text style={styles.listMeta}>{item.time}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
        

        
          <TouchableOpacity
            style={styles.avatarWrap}
            activeOpacity={0.85}
            onPress={() => setShowAvatarSheet(true)}
          >
            <View style={styles.avatarOuter}>
              <View style={styles.avatarInner}>
                {avatarUri ? (
                  <Image source={{ uri:avatarUri }} style={styles.avatarImage} />
                ) : profileInitial ? (
                  <Text style={styles.avatarText}>{profileInitial}</Text>
                ) : (
                  <Feather name="user" size={30} color={Colors.black} />
                )}
                {avatarUpdating || profileLoading ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color={Colors.white} />
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.avatarEditBadge}>
              <Feather name="camera" size={12} color={Colors.white} />
            </View>
          </TouchableOpacity>
          {avatarError ? (
            <Text style={styles.avatarError}>{avatarError}</Text>
          ) : null}
        </View>

        <View style={styles.profileSheet}>
          {profileError ? (
            <Text style={styles.errorTextInline}>{profileError}</Text>
          ) : null}
          {profileLoading ? (
            <View style={styles.skeletonContainer}>
              <View style={styles.skeletonNameRow}>
                <View style={styles.skeletonLineLarge} />
                <View style={styles.skeletonLineSmall} />
              </View>
              <View style={styles.skeletonStatsRow}>
                <View style={styles.skeletonStat} />
                <View style={styles.skeletonStat} />
                <View style={styles.skeletonStat} />
              </View>
              <View style={styles.skeletonTabsRow}>
                <View style={styles.skeletonTab} />
                <View style={styles.skeletonTab} />
                <View style={styles.skeletonTab} />
              </View>
              <View style={styles.skeletonGrid}>
                <View style={styles.skeletonCard} />
                <View style={styles.skeletonCard} />
                <View style={styles.skeletonCard} />
                <View style={styles.skeletonCard} />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.nameRow}>
                <View style={styles.nameBlock}>
                  <Text style={styles.namePrimary}>{firstName}</Text>
                  {/* <Text style={styles.nameAccent}>{lastName.toUpperCase()}</Text> */}
                  <Text style={styles.subtitleText}>
                    {displayText(resolvedProfile?.username) !== FALLBACK_TEXT
                      ? `@${displayText(resolvedProfile?.username)}`
                      : ""}
                  </Text>
                </View>
                {/* <TouchableOpacity
                  style={[
                    styles.followButton,
                    isFollowing && styles.followButtonActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setIsFollowing((current) => !current)}
                >
                  <Text
                    style={[
                      styles.followButtonText,
                      isFollowing && styles.followButtonTextActive,
                    ]}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity> */}
              </View>

              <View style={styles.statsRow}>
                {stats.map((item) => (
                  <View key={item.label} style={styles.statItem}>
                    <Text
                      onPress={() => handleStatPress(item.label)}
                      style={styles.statValue}
                    >
                      {item.value}
                    </Text>
                    <Text style={styles.statLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.tabsRow}>
                {tabs.map((tab, index) => (
                  <TouchableOpacity
                    key={tab}
                    style={styles.tabItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setActiveTab(tab);
                      pagerRef.current?.scrollTo({
                        x: index * SCREEN_WIDTH,
                        animated: true,
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        tab === activeTab && styles.tabTextActive,
                      ]}
                    >
                      {tab}
                    </Text>
                    {tab === activeTab && <View style={styles.tabUnderline} />}
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView
                ref={pagerRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabPagerContent}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / SCREEN_WIDTH
                  );
                  setActiveTab(tabs[index] || "Posts");
                }}
              >
                <View style={styles.tabPage}>
                  <FlatList
                    data={posts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPostItem}
                    numColumns={2}
                    columnWrapperStyle={styles.gridRow}
                    contentContainerStyle={styles.gridContent}
                    scrollEnabled={false}
                  />
                </View>
                <View style={styles.tabPage}>
                  <FlatList
                    data={bookmarkItems}
                    keyExtractor={(item) => item.id}
                    renderItem={renderBookmarkItem}
                    contentContainerStyle={styles.listBlock}
                    scrollEnabled={false}
                  />
                </View>
                <View style={styles.tabPage}>
                  <FlatList
                    data={announcementItems}
                    keyExtractor={(item) => item.id}
                    renderItem={renderAnnouncementItem}
                    contentContainerStyle={styles.listBlock}
                    scrollEnabled={false}
                  />
                </View>
              </ScrollView>
            </>
          )}
        </View>

        <View style={styles.interactionSection}>
          <Text style={styles.sectionTitle}>RECENT INTERACTION</Text>
          {interactions.map((item) => (
            <View key={item.id} style={styles.interactionRow}>
              <View style={styles.interactionIcon}>
                <Feather name={item.icon} size={16} color={Colors.white} />
              </View>
              <View style={styles.interactionText}>
                <Text style={styles.interactionTitle}>{item.title}</Text>
                <Text style={styles.interactionBody}>{item.body}</Text>
                <Text style={styles.interactionTime}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={showAvatarSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvatarSheet(false)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowAvatarSheet(false)}
          />
        </View>
        <View style={styles.sheetCard}>
          <Text style={styles.sheetTitle}>Update Profile Image</Text>
          <Text style={styles.sheetSubtitle}>Choose a source</Text>
          <TouchableOpacity
            style={styles.sheetOption}
            activeOpacity={0.85}
            onPress={() => {
              setShowAvatarSheet(false);
              launchWithPermission("camera");
            }}
          >
            <View style={styles.sheetIcon}>
              <Feather name="camera" size={18} color="#2563EB" />
            </View>
            <Text style={styles.sheetLabel}>Take a photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetOption}
            activeOpacity={0.85}
            onPress={() => {
              setShowAvatarSheet(false);
              launchWithPermission("library");
            }}
          >
            <View style={styles.sheetIcon}>
              <Feather name="image" size={18} color="#2563EB" />
            </View>
            <Text style={styles.sheetLabel}>Choose from gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetCancel}
            activeOpacity={0.85}
            onPress={() => setShowAvatarSheet(false)}
          >
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFF",
  },
  content: {
    paddingBottom: 80,
  },
  hero: {
    backgroundColor: "#EAF0FF",
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 56,
  },
  dots: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    opacity: 0.45,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 8,
    marginVertical: 10,
    backgroundColor: "#CBD5F5",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101828",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#1F2937",
  },
  avatarWrap: {
    alignSelf: "flex-start",
    marginLeft: 12,
  },
  avatarOuter: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101828",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  avatarInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
   backgroundColor: "#93C5FD",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 96,
    height: 96,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: "700",
    color: "#1a1a22",
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarError: {
    marginTop: 10,
    marginLeft: 12,
    fontSize: 12,
    color: "#D92D20",
    fontWeight: "600",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 6,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileSheet: {
    marginTop: -32,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 10,
  },
  errorTextInline: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D92D20",
    marginBottom: 10,
  },
  skeletonContainer: {
    paddingVertical: 4,
  },
  skeletonNameRow: {
    gap: 10,
    marginBottom: 16,
  },
  skeletonLineLarge: {
    height: 26,
    width: "55%",
    borderRadius: 12,
    backgroundColor: "#E4E7EC",
  },
  skeletonLineSmall: {
    height: 14,
    width: "38%",
    borderRadius: 10,
    backgroundColor: "#E4E7EC",
  },
  skeletonStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    marginTop: 6,
  },
  skeletonStat: {
    width: (SCREEN_WIDTH - 44) / 3,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E4E7EC",
  },
  skeletonTabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  skeletonTab: {
    height: 14,
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#E4E7EC",
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  skeletonCard: {
    width: "48%",
    height: 150,
    borderRadius: 26,
    marginBottom: 14,
    backgroundColor: "#E4E7EC",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  nameBlock: {
    flex: 1,
    paddingRight: 16,
  },
  namePrimary: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1F2937",
  },
  nameAccent: {
    fontSize: 30,
    fontWeight: "800",
    color: "#2563EB",
    marginTop: -2,
  },
  subtitleText: {
    fontSize: 14,
    color: "#667085",
    marginTop: 4,
  },
  followButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "#2563EB",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    marginTop: 10,
  },
  followButtonActive: {
    backgroundColor: "#EAF0FF",
    borderWidth: 1,
    borderColor: "#2563EB",
    shadowOpacity: 0,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
  followButtonTextActive: {
    color: "#2563EB",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E4E7EC",
    paddingVertical: 16,
    marginBottom: 18,
  },
  statItem: {
    alignItems: "center",
    width: (SCREEN_WIDTH - 44) / 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#94A3B8",
    marginTop: 6,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  tabItem: {
    alignItems: "center",
    flex: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  tabTextActive: {
    color: "#2563EB",
  },
  tabUnderline: {
    height: 2,
    width: 38,
    backgroundColor: "#2563EB",
    borderRadius: 1,
    marginTop: 8,
  },
  tabPagerContent: {
    width: SCREEN_WIDTH * 3,
  },
  tabPage: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 22,
  },
  gridRow: {
    justifyContent: "space-between",
  },
  gridContent: {
    paddingBottom: 6,
  },
  postCard: {
    width: "48%",
    height: 150,
    borderRadius: 26,
    marginBottom: 14,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  postToneWarm: {
    backgroundColor: "#F8FAFF",
  },
  postToneLight: {
    backgroundColor: "#EDF2FF",
  },
  postToneCool: {
    backgroundColor: "#F1F5FF",
  },
  postToneEmpty: {
    backgroundColor: "#F5F7FF",
  },
  postCardDashed: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D0D5DD",
  },
  postOverlay: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(31, 41, 55, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    margin: 10,
  },
  postLikes: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.white,
    marginLeft: 6,
  },
  postEmptyIcon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listBlock: {
    marginTop: 6,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#E4E7EC",
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  listText: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  listMeta: {
    fontSize: 12,
    color: "#667085",
    marginTop: 4,
  },
  interactionSection: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 2,
    color: "#94A3B8",
    marginBottom: 18,
  },
  interactionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  interactionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  interactionText: {
    flex: 1,
  },
  interactionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  interactionBody: {
    fontSize: 13,
    color: "#475467",
    lineHeight: 18,
  },
  interactionTime: {
    fontSize: 11,
    letterSpacing: 1,
    color: "#94A3B8",
    marginTop: 6,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  sheetCard: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  sheetSubtitle: {
    fontSize: 12,
    color: "#667085",
    marginTop: 6,
    marginBottom: 16,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  sheetIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sheetLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  sheetCancel: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#F1F5FF",
    alignItems: "center",
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
});

export default ProfileInfo;
