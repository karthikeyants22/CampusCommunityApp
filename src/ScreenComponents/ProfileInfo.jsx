import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  RefreshControl,
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
  Alert
} from "react-native";
import moment from "moment";
import Feather from "react-native-vector-icons/Feather";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNavigation } from "@react-navigation/native";
import Colors from "../Common/Colors";
import { useAppContext } from "../Context/AppContext";
import authService from "../Authentication/authService";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

const FALLBACK_TEXT = "";
const DOTS = Array.from({ length: 90 });
const SCREEN_WIDTH = Dimensions.get("window").width;
const AVATAR_ORIGIN = "https://archived-howto-attacked-regularly.trycloudflare.com";
const ANDROID_13 = 33;
const SAVED_PAGE_SIZE = 10;
const POSTS_PAGE_SIZE = 10;

const ProfileInfo = () => {
  const navigation = useNavigation();
  const { appData } = useAppContext();
  const [activeTab, setActiveTab] = useState("Posts");
  const [isFollowing, setIsFollowing] = useState(false);
  const pagerRef = useRef(null);
  const postsFetchingRef = useRef(false);
  const savedFetchingRef = useRef(false);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [avatarUpdating, setAvatarUpdating] = useState(false);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");
  const [postsPage, setPostsPage] = useState(1);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsInitialized, setPostsInitialized] = useState(false);
  const [savedPosts, setSavedPosts] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState("");
  const [savedCursor, setSavedCursor] = useState(1);
  const [savedHasMore, setSavedHasMore] = useState(false);
  const [savedInitialized, setSavedInitialized] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

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

  const handleLogout = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          navigation.navigate('SplashScreen');
        },
      },
    ]);
  }, [navigation]);
  const avatarUri = useMemo(() => {

    if (!avatarUrl) return "";
    if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
    return `${AVATAR_ORIGIN}${avatarUrl}`;
  }, [avatarUrl]);

  const profileUserId = useMemo(
    () => resolvedProfile?.id ?? resolvedProfile?.userId ?? resolvedProfile?._id ?? null,
    [resolvedProfile]
  );

  const applyAvatarUrl = (url) => {
    if (!url) return;
    const resolvedUrl = /^https?:\/\//i.test(url) ? url : `${AVATAR_ORIGIN}${url}`;
    setProfileData((prev) => ({ ...(prev || {}), avatarUrl: resolvedUrl }));
  };

  const handleAvatarResponse = async (response) => {

    console.log("RESSSSSSSSSS", response)
    if (response?.didCancel) return;
    if (response?.errorCode) {
      setAvatarError(response.errorMessage || "Unable to access image.");
      return;
    }
    const asset = response?.assets?.[0];
    console.log("ASEEEE", asset)
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
        { mediaType: "photo", quality: 0.8, selectionLimit: 1, includeExtra: true },
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


  const handleMainScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent || {};
    if (!layoutMeasurement || !contentOffset || !contentSize) {
      return;
    }
    const paddingToBottom = 240;
    const isNearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    if (!isNearEnd) {
      return;
    }
    if (activeTab === "Posts") {
      if (!postsHasMore || postsFetchingRef.current) {
        return;
      }
      loadUserPosts(postsPage, { append: true });
      return;
    }
    if (activeTab === "Bookmarks") {
      if (!savedHasMore || savedFetchingRef.current) {
        return;
      }
      loadSavedPosts(savedCursor, { append: true });
    }
  };

  const handleRefreshProfile = async () => {
    if (refreshingProfile) {
      return;
    }
    setRefreshingProfile(true);
    setProfileError("");
    setPostsError("");
    setSavedError("");

    const profileRes = await authService.getUsersList();
    if (profileRes?.isSuccess) {
      const payload = profileRes.data?.data ?? profileRes.data;
      setProfileData(payload || null);
      if (typeof payload?.viewerFollowing === "boolean") {
        setIsFollowing(payload.viewerFollowing);
      }
    } else {
      setProfileError(profileRes?.message || "Unable to load profile info");
    }

    if (profileUserId) {
      setPostsPage(1);
      await loadUserPosts(1, { append: false });
    }

    setSavedCursor(1);
    await loadSavedPosts(1, { append: false });

    setRefreshingProfile(false);
  };

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError("");
      const res = await authService.getUsersList();

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

  const extractSavedList = (payload = {}) => {
    const data =
      payload?.data ??
      payload?.result ??
      payload?.payload ??
      payload;

    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.posts)) {
      return data.posts;
    }
    if (Array.isArray(data?.items)) {
      return data.items;
    }
    if (Array.isArray(data?.rows)) {
      return data.rows;
    }
    if (Array.isArray(payload?.posts)) {
      return payload.posts;
    }
    return [];
  };

  const extractUserPostsList = (payload = {}) => {
    const data =
      payload?.data ??
      payload?.result ??
      payload?.payload ??
      payload;

    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.posts)) {
      return data.posts;
    }
    if (Array.isArray(data?.items)) {
      return data.items;
    }
    if (Array.isArray(data?.rows)) {
      return data.rows;
    }
    if (Array.isArray(payload?.posts)) {
      return payload.posts;
    }
    return [];
  };

  const resolvePostsHasMore = (payload = {}, currentPage = 1, listLength = 0) => {
    const candidates = [
      payload?.hasMore,
      payload?.hasNextPage,
      payload?.meta?.hasMore,
      payload?.meta?.hasNextPage,
      payload?.pagination?.hasMore,
      payload?.pagination?.hasNextPage,
    ];

    for (const flag of candidates) {
      if (typeof flag === "boolean") {
        return flag;
      }
    }

    if (payload?.links?.next != null) {
      return true;
    }

    if (payload?.nextPage != null) {
      const nextPage = Number(payload.nextPage);
      if (Number.isFinite(nextPage)) {
        return nextPage > currentPage;
      }
    }

    if (payload?.totalPages != null) {
      const totalPages = Number(payload.totalPages);
      const page = Number(payload.page ?? currentPage);
      if (Number.isFinite(totalPages) && Number.isFinite(page)) {
        return page < totalPages;
      }
    }

    return listLength >= POSTS_PAGE_SIZE;
  };

  const resolvePostsPage = (payload = {}, fallbackPage = 1) => {
    const next =
      payload?.nextPage ??
      payload?.meta?.nextPage ??
      payload?.pagination?.nextPage;

    if (next !== undefined && next !== null) {
      return next;
    }
    return fallbackPage + 1;
  };

  const normalizeUserPost = (post = {}, index = 0) => {
    const fallbackId = `post-${index}-${Date.now()}`;
    const safeId = post?.id ?? post?._id ?? post?.postId ?? fallbackId;
    const rawContent = typeof post?.content === "string" ? post.content : "";
    const trimmed = rawContent.trim();
    const title =
      post?.title ||
      post?.headline ||
      post?.name ||
      (trimmed ? trimmed.split(/\n+/)[0] : "") ||
      "Post";
    const createdAt =
      post?.createdAt ||
      post?.created_at ||
      post?.updatedAt ||
      null;
    let timeLabel = "";
    if (createdAt) {
      const parsed = moment(createdAt);
      if (parsed.isValid()) {
        const absolute = parsed.format("MMM D, YYYY");
        const relative = parsed.fromNow();
        timeLabel = `${absolute} - ${relative}`;
      } else {
        timeLabel = new Date(createdAt).toLocaleDateString();
      }
    }
    const mediaItem = Array.isArray(post?.media) ? post.media[0] : null;
    const thumbnail =
      mediaItem?.url ||
      mediaItem?.publicUrl ||
      mediaItem?.metadata?.publicUrl ||
      mediaItem?.metadata?.url ||
      "";

    return {
      id: String(safeId),
      title,
      time: timeLabel,
      thumbnail,
      raw: post,
    };
  };

  const resolveSavedHasMore = (payload = {}, currentCursor = 1, listLength = 0) => {
    const candidates = [
      payload?.hasMore,
      payload?.hasNextPage,
      payload?.meta?.hasMore,
      payload?.meta?.hasNextPage,
      payload?.pagination?.hasMore,
      payload?.pagination?.hasNextPage,
      payload?.data?.hasMore,
      payload?.data?.hasNextPage,
    ];

    for (const flag of candidates) {
      if (typeof flag === "boolean") {
        return flag;
      }
    }

    if (payload?.links?.next != null || payload?.data?.links?.next != null) {
      return true;
    }

    if (payload?.nextCursor != null || payload?.data?.nextCursor != null) {
      return true;
    }

    if (payload?.remaining != null || payload?.data?.remaining != null) {
      const remaining = Number(payload?.remaining ?? payload?.data?.remaining);
      if (Number.isFinite(remaining)) {
        return remaining > 0;
      }
    }

    if (payload?.nextPage != null || payload?.data?.nextPage != null) {
      const nextPage = Number(payload?.nextPage ?? payload?.data?.nextPage);
      if (Number.isFinite(nextPage)) {
        return nextPage > currentCursor;
      }
    }

    if (payload?.totalPages != null || payload?.data?.totalPages != null) {
      const totalPages = Number(payload?.totalPages ?? payload?.data?.totalPages);
      const page = Number(payload?.page ?? payload?.data?.page ?? currentCursor);
      if (Number.isFinite(totalPages) && Number.isFinite(page)) {
        return page < totalPages;
      }
    }

    return listLength >= SAVED_PAGE_SIZE;
  };

  const resolveSavedCursor = (payload = {}, fallbackCursor = 1) => {
    const next =
      payload?.nextCursor ??
      payload?.meta?.nextCursor ??
      payload?.pagination?.nextCursor ??
      payload?.cursor ??
      payload?.meta?.next;

    if (next !== undefined && next !== null) {
      return next;
    }
    if (typeof fallbackCursor === "number") {
      return fallbackCursor + 1;
    }
    return 2;
  };

  const normalizeSavedPost = (post = {}, index = 0) => {
    const fallbackId = `saved-${index}-${Date.now()}`;
    const safeId = post?.id ?? post?._id ?? post?.postId ?? fallbackId;
    const rawContent = typeof post?.content === "string" ? post.content : "";
    const trimmed = rawContent.trim();
    const title =
      post?.title ||
      post?.headline ||
      post?.name ||
      (trimmed ? trimmed.split(/\n+/)[0] : "") ||
      "Saved post";
    const createdAt =
      post?.createdAt ||
      post?.created_at ||
      post?.savedAt ||
      post?.updatedAt ||
      null;
    let timeLabel = "Saved";
    if (createdAt) {
      const parsed = moment(createdAt);
      if (parsed.isValid()) {
        const absolute = parsed.format("MMM D, YYYY");
        const relative = parsed.fromNow();
        timeLabel = `${absolute} - ${relative}`;
      } else {
        timeLabel = new Date(createdAt).toLocaleDateString();
      }
    }
    const author =
      post?.user?.fullName ||
      post?.user?.username ||
      post?.author?.fullName ||
      post?.author?.username ||
      post?.owner?.username ||
      "";
    const mediaItem = Array.isArray(post?.media) ? post.media[0] : null;
    const thumbnail =
      mediaItem?.url ||
      mediaItem?.publicUrl ||
      mediaItem?.metadata?.publicUrl ||
      mediaItem?.metadata?.url ||
      "";

    return {
      id: String(safeId),
      title,
      time: author ? `${author} - ${timeLabel}` : timeLabel,
      thumbnail,
      raw: post,
    };
  };

  const loadSavedPosts = async (cursor = 1, options = {}) => {
    if (savedFetchingRef.current) {
      return;
    }
    savedFetchingRef.current = true;
    const { append = false } = options;
    setSavedLoading(true);
    setSavedError("");
    const res = await authService.getSavedPosts(cursor, SAVED_PAGE_SIZE);


    if (res?.isSuccess) {
      const payload = res.data?.data ?? res.data;
      const list = extractSavedList(payload);
      setSavedPosts((prev) => (append ? [...prev, ...list] : list));
      setSavedHasMore(resolveSavedHasMore(payload, cursor, list.length));
      setSavedCursor(resolveSavedCursor(payload, cursor));
    } else {
      setSavedError(res?.message || "Unable to load saved posts");
    }
    setSavedLoading(false);
    savedFetchingRef.current = false;
  };

  const loadUserPosts = async (page = 1, options = {}) => {
    if (postsFetchingRef.current) {
      return;
    }
    if (!profileUserId) {
      setPostsError("Missing user id");
      return;
    }
    postsFetchingRef.current = true;
    const { append = false } = options;
    setPostsLoading(true);
    setPostsError("");
    const res = await authService.getUserPosts(profileUserId, page, POSTS_PAGE_SIZE);

    if (res?.isSuccess) {
      const payload = res.data?.data ?? res.data;
      const list = extractUserPostsList(payload);
      setUserPosts((prev) => (append ? [...prev, ...list] : list));
      setPostsHasMore(resolvePostsHasMore(payload, page, list.length));
      setPostsPage(resolvePostsPage(payload, page));
    } else {
      setPostsError(res?.message || "Unable to load posts");
    }
    setPostsLoading(false);
    postsFetchingRef.current = false;
  };

  useEffect(() => {
    if (activeTab !== "Bookmarks" || savedInitialized) {
      return;
    }
    setSavedInitialized(true);
    loadSavedPosts(1, { append: false });
  }, [activeTab, savedInitialized]);

  useEffect(() => {
    if (activeTab !== "Posts" || postsInitialized) {
      return;
    }
    if (!profileUserId) {
      return;
    }
    setPostsInitialized(true);
    loadUserPosts(1, { append: false });
  }, [activeTab, postsInitialized, profileUserId]);

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

  const tabs = ["Posts", "Bookmarks"];
  const postItems = useMemo(
    () => userPosts.map((post, index) => normalizeUserPost(post, index)),
    [userPosts]
  );

  const bookmarkItems = useMemo(
    () => savedPosts.map((post, index) => normalizeSavedPost(post, index)),

    [savedPosts]
  );

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
    <View style={styles.listRow}>
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.bookmarkThumb} />
      ) : (
        <View style={styles.listIcon}>
          <Feather name="image" size={16} color="#2563EB" />
        </View>
      )}
      <View style={styles.listText}>
        <Text style={styles.listTitle}>{item.title}</Text>
        {item.time ? <Text style={styles.listMeta}>{item.time}</Text> : null}
      </View>
    </View>
  );

  const renderBookmarkItem = ({ item }) => (
    <View style={styles.listRow}>
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.bookmarkThumb} />
      ) : (
        <View style={styles.listIcon}>
          <Feather name="bookmark" size={16} color="#2563EB" />
        </View>
      )}
      <View style={styles.listText}>
        <Text style={styles.listTitle}>{item.title}</Text>
        <Text style={styles.listMeta}>{item.time}</Text>
      </View>
    </View>
  );


  return (
    <View style={styles.root}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshingProfile} onRefresh={handleRefreshProfile} tintColor="#2563EB" />}
        onScroll={handleMainScroll}
        scrollEventThrottle={16}
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
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
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

                  <Text onPress={handleLogout}
                    style={{  }}>{"Log out"}</Text>

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
                    {/* {tab === activeTab && <View style={styles.tabUnderline} />} */}
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
                  {postsLoading && postItems.length === 0 ? (
                    <View style={styles.listLoading}>
                      <ActivityIndicator size="small" color="#2563EB" />
                    </View>
                  ) : null}
                  {postsError ? (
                    <Text style={styles.errorTextInline}>{postsError}</Text>
                  ) : null}
                  {!postsLoading && !postsError && postItems.length === 0 ? (
                    <Text style={styles.emptyState}>No posts yet.</Text>
                  ) : null}
                  <FlatList
                    data={postItems}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPostItem}
                    contentContainerStyle={styles.listBlock}
                    scrollEnabled={false}
                  />
                </View>
                <View style={styles.tabPage}>
                  {savedLoading && bookmarkItems.length === 0 ? (
                    <View style={styles.listLoading}>
                      <ActivityIndicator size="small" color="#2563EB" />
                    </View>
                  ) : null}
                  {savedError ? (
                    <Text style={styles.errorTextInline}>{savedError}</Text>
                  ) : null}
                  {!savedLoading && !savedError && bookmarkItems.length === 0 ? (
                    <Text style={styles.emptyState}>No saved posts yet.</Text>
                  ) : null}
                  <FlatList
                    data={bookmarkItems}
                    keyExtractor={(item) => item.id}
                    renderItem={renderBookmarkItem}
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

}
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
    width: SCREEN_WIDTH * 2,
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
  gridItem: {
    width: (SCREEN_WIDTH - 44) / 2,
    aspectRatio: 1,
    marginBottom: 8,
  },
  gridTile: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  bookmarkGridImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  bookmarkGridFallback: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  postCard: {
    width: "100%",
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
  listLoading: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#E4E7EC",
  },
  bookmarkThumb: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#EAF0FF",
  },
  listIcon: {
    width: 100,
    height: 100,
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
  emptyState: {
    textAlign: "center",
    color: "#667085",
    fontSize: 13,
    paddingVertical: 12,
  },
  loadMoreButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: "#F8FAFF",
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
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





