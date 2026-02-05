import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TabBar, TabView } from "react-native-tab-view";
import Feather from "react-native-vector-icons/Feather";
import { useNavigation, useRoute } from "@react-navigation/native";
import Colors from "../Common/Colors";
import authService from "../Authentication/authService";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PAGE_SIZE = 10;
const LIST_WINDOW_SIZE = 7;
const LIST_MAX_BATCH = 10;

const getDisplayName = (user) => {
  if (!user || typeof user !== "object") return "Unknown";
  const fullName = user.fullName || user.name || user.username || "";
  return String(fullName).trim() || "Unknown";
};

const getAvatarText = (user) => {
  const name = getDisplayName(user);
  return name.charAt(0).toUpperCase() || "U";
};

const normalizeResponse = (payload) => {
  if (!payload || typeof payload !== "object") {
    return {
      users: [],
      page: 1,
      limit: 10,
      total: 0,
      count: 0,
      hasMore: false,
      nextPage: null,
    };
  }

  const container =
    payload?.data && typeof payload.data === "object" ? payload.data : payload;

  const users = Array.isArray(container.users)
    ? container.users
    : Array.isArray(container.data)
      ? container.data
      : Array.isArray(payload.users)
        ? payload.users
        : [];

  return {
    users,
    page: Number(container.page ?? payload.page ?? 1),
    limit: Number(container.limit ?? payload.limit ?? 10),
    total: Number(container.total ?? payload.total ?? 0),
    count: Number(container.count ?? payload.count ?? users.length ?? 0),
    hasMore: Boolean(container.hasMore ?? payload.hasMore),
    nextPage:
      container.nextPage === null || container.nextPage === undefined
        ? null
        : Number(container.nextPage),
  };
};

const getUserId = (user) => user?.id || user?._id || user?.userId || null;

const getIsFollowing = (user) =>
  Boolean(
    user?.viewerFollows ??
      user?.isFollowing ??
      user?.viewerFollowing ??
      user?.following ??
      user?.isFollowed
  );

const getFollowsViewer = (user) =>
  Boolean(user?.followsViewer ?? user?.isFollower ?? user?.followsYou);

const FollowersList = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [index, setIndex] = useState(0);
  const routes = useMemo(
    () => [
      { key: "followers", title: "Followers" },
      { key: "following", title: "Following" },
    ],
    []
  );

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [followersPage, setFollowersPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);
  const [followersHasMore, setFollowersHasMore] = useState(false);
  const [followingHasMore, setFollowingHasMore] = useState(false);
  const [followersTotal, setFollowersTotal] = useState(0);
  const [followingTotal, setFollowingTotal] = useState(0);
  const [loadingMoreFollowers, setLoadingMoreFollowers] = useState(false);
  const [loadingMoreFollowing, setLoadingMoreFollowing] = useState(false);
  const [refreshingFollowers, setRefreshingFollowers] = useState(false);
  const [refreshingFollowing, setRefreshingFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState({});
  const [resolvedUserId, setResolvedUserId] = useState(null);
  const followersLoadingRef = useRef(false);
  const followingLoadingRef = useRef(false);

  useEffect(() => {
    if (route?.params?.initialTab === "following") {
      setIndex(1);
    }
  }, [route?.params?.initialTab]);

  useEffect(() => {
    let isMounted = true;

    const resolveUserId = async () => {
      if (route?.params?.userId) return route.params.userId;
      const res = await authService.getUsersList();
      if (!res?.isSuccess) return null;
      const payload = res.data?.data ?? res.data;
      return payload?.id || payload?._id || payload?.userId || null;
    };

    const fetchFollowersPage = async (userId, page = 1) => {
      const res = await authService.getFollowers(userId, page, PAGE_SIZE);

      console.log("followers",res)
      if (!res?.isSuccess) {
        return { ok: false, message: res?.message };
      }
      return { ok: true, data: normalizeResponse(res.data) };
    };

    const fetchFollowingPage = async (userId, page = 1) => {
      const res = await authService.getFollowing(userId, page, PAGE_SIZE);
      console.log("following",res)

      if (!res?.isSuccess) {
        return { ok: false, message: res?.message };
      }
      return { ok: true, data: normalizeResponse(res.data) };
    };

    const loadLists = async () => {
      setLoading(true);
      setErrorText("");
      const userId = await resolveUserId();
      if (!isMounted) return;

      if (!userId) {
        setErrorText("Unable to determine user id.");
        setLoading(false);
        return;
      }

      setResolvedUserId(userId);

      const [followersRes, followingRes] = await Promise.all([
        fetchFollowersPage(userId, 1),
        fetchFollowingPage(userId, 1),
      ]);

      if (!isMounted) return;

      if (followersRes?.ok) {
        const normalized = followersRes.data;
        setFollowers(normalized.users);
        setFollowersPage(normalized.page || 1);
        setFollowersHasMore(Boolean(normalized.hasMore));
        setFollowersTotal(normalized.total || 0);
      } else {
        setErrorText(followersRes?.message || "Failed to load followers.");
      }

      if (followingRes?.ok) {
        const normalized = followingRes.data;
        setFollowing(normalized.users);
        setFollowingPage(normalized.page || 1);
        setFollowingHasMore(Boolean(normalized.hasMore));
        setFollowingTotal(normalized.total || 0);
      } else if (!followersRes?.ok) {
        setErrorText(followingRes?.message || "Failed to load following.");
      }

      setLoading(false);
    };

    loadLists();

    return () => {
      isMounted = false;
    };
  }, [route?.params?.userId]);

  const refreshFollowers = useCallback(async () => {
    if (!resolvedUserId) return;
    setRefreshingFollowers(true);
    setErrorText("");
    const res = await authService.getFollowers(resolvedUserId, 1, PAGE_SIZE);
    if (res?.isSuccess) {
      const normalized = normalizeResponse(res.data);
      setFollowers(normalized.users);
      setFollowersPage(normalized.page || 1);
      setFollowersHasMore(Boolean(normalized.hasMore));
      setFollowersTotal(normalized.total || 0);
    } else {
      setErrorText(res?.message || "Failed to refresh followers.");
    }
    setRefreshingFollowers(false);
  }, [resolvedUserId]);

  const refreshFollowing = useCallback(async () => {
    if (!resolvedUserId) return;
    setRefreshingFollowing(true);
    setErrorText("");
    const res = await authService.getFollowing(resolvedUserId, 1, PAGE_SIZE);
    if (res?.isSuccess) {
      const normalized = normalizeResponse(res.data);
      setFollowing(normalized.users);
      setFollowingPage(normalized.page || 1);
      setFollowingHasMore(Boolean(normalized.hasMore));
      setFollowingTotal(normalized.total || 0);
    } else {
      setErrorText(res?.message || "Failed to refresh following.");
    }
    setRefreshingFollowing(false);
  }, [resolvedUserId]);

  const loadMoreFollowers = useCallback(async () => {
    if (!resolvedUserId || loadingMoreFollowers || !followersHasMore) return;
    if (followersLoadingRef.current) return;
    followersLoadingRef.current = true;
    setLoadingMoreFollowers(true);
    const nextPage = followersPage + 1;
    const res = await authService.getFollowers(resolvedUserId, nextPage, PAGE_SIZE);
    if (res?.isSuccess) {
      const normalized = normalizeResponse(res.data);
      setFollowers((prev) => [...prev, ...normalized.users]);
      setFollowersPage(normalized.page || nextPage);
      setFollowersHasMore(Boolean(normalized.hasMore));
      setFollowersTotal(normalized.total || 0);
    }
    setLoadingMoreFollowers(false);
    followersLoadingRef.current = false;
  }, [followersHasMore, followersPage, loadingMoreFollowers, resolvedUserId]);

  const loadMoreFollowing = useCallback(async () => {
    if (!resolvedUserId || loadingMoreFollowing || !followingHasMore) return;
    if (followingLoadingRef.current) return;
    followingLoadingRef.current = true;
    setLoadingMoreFollowing(true);
    const nextPage = followingPage + 1;
    const res = await authService.getFollowing(resolvedUserId, nextPage, PAGE_SIZE);
    if (res?.isSuccess) {
      const normalized = normalizeResponse(res.data);
      setFollowing((prev) => [...prev, ...normalized.users]);
      setFollowingPage(normalized.page || nextPage);
      setFollowingHasMore(Boolean(normalized.hasMore));
      setFollowingTotal(normalized.total || 0);
    }
    setLoadingMoreFollowing(false);
    followingLoadingRef.current = false;
  }, [followingHasMore, followingPage, loadingMoreFollowing, resolvedUserId]);

  const keyExtractor = useCallback(
    (item, idx) => String(item?.id || item?._id || item?.userId || idx),
    []
  );

  const updateFollowState = useCallback((userId, isNowFollowing) => {
    const updateItem = (item) =>
      getUserId(item) === userId
        ? {
            ...item,
            isFollowing: isNowFollowing,
            viewerFollows: isNowFollowing,
            viewerFollowing: isNowFollowing,
            following: isNowFollowing,
            isFollowed: isNowFollowing,
          }
        : item;
    setFollowers((prev) => prev.map(updateItem));
    setFollowing((prev) => prev.map(updateItem));
  }, []);

  const handleToggleFollow = useCallback(
    async (user) => {
      const userId = getUserId(user);
      if (!userId) return;
      if (followLoading[userId]) return;

      const shouldFollow = !getIsFollowing(user);
      console.log("USERDE",shouldFollow,user)
      setFollowLoading((prev) => ({ ...prev, [userId]: true }));
      setErrorText("");

      const res = shouldFollow
        ? await authService.followUser(userId)
        : await authService.unfollowUser(userId);

        console.log("RESSSSSSSS",res)

      if (res?.isSuccess) {
        updateFollowState(userId, shouldFollow);
        if (index === 0) {
          await refreshFollowers();
          await refreshFollowing();
        } else {
          await refreshFollowing();
          await refreshFollowers();
        }
      } else {
        setErrorText(res?.message || "Unable to update follow status.");
      }

      setFollowLoading((prev) => ({ ...prev, [userId]: false }));
    },
    [followLoading, index, refreshFollowers, refreshFollowing, updateFollowState]
  );

  const renderUser = useCallback(
    ({ item }) => {
      const name = getDisplayName(item);
      const username =
        item?.username || item?.userName || item?.handle || item?.email || "";
      const avatarUrl = item?.avatarUrl || item?.profileImage || item?.avatar;
      const isFollowing = getIsFollowing(item);
      const followsViewer = getFollowsViewer(item);
      const userId = getUserId(item);
      const isBusy = Boolean(userId && followLoading[userId]);
      const relationText = followsViewer && isFollowing
        ? "Mutual"
        : followsViewer
          ? "Follows you"
          : isFollowing
            ? "Following"
            : "";
      return (
        <View style={styles.row}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image
                source={{
                  uri: "https://archived-howto-attacked-regularly.trycloudflare.com" + avatarUrl,
                }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{getAvatarText(item)}</Text>
            )}
          </View>
          <View style={styles.userText}>
            <Text style={styles.userName}>{name}</Text>
            {username ? (
              <Text style={styles.userHandle}>@{String(username)}</Text>
            ) : null}
            {relationText ? (
              <Text style={styles.relationshipText}>{relationText}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.actionButton, isFollowing && styles.actionButtonActive]}
            activeOpacity={0.8}
            onPress={() => handleToggleFollow(item)}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text
                style={[
                  styles.actionText,
                  isFollowing && styles.actionTextActive,
                ]}
              >
                {isFollowing ? "Following" : "Follow"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [followLoading, handleToggleFollow]
  );

  const renderList = useCallback(
    (data, listKey) => (
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderUser}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={
              listKey === "followers" ? refreshingFollowers : refreshingFollowing
            }
            onRefresh={
              listKey === "followers" ? refreshFollowers : refreshFollowing
            }
            tintColor="#2563EB"
          />
        }
        removeClippedSubviews
        windowSize={LIST_WINDOW_SIZE}
        initialNumToRender={LIST_MAX_BATCH}
        maxToRenderPerBatch={LIST_MAX_BATCH}
        updateCellsBatchingPeriod={40}
        onEndReached={() => {
          if (listKey === "followers") {
            loadMoreFollowers();
          } else {
            loadMoreFollowing();
          }
        }}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>No followers found.</Text>
          ) : null
        }
        ListFooterComponent={
          listKey === "followers"
            ? loadingMoreFollowers
              ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color="#2563EB" />
                  </View>
                )
              : null
            : loadingMoreFollowing
              ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color="#2563EB" />
                  </View>
                )
              : null
        }
      />
    ),
    [
      keyExtractor,
      loadMoreFollowers,
      loadMoreFollowing,
      loading,
      loadingMoreFollowers,
      loadingMoreFollowing,
      refreshFollowers,
      refreshFollowing,
      refreshingFollowers,
      refreshingFollowing,
      renderUser,
    ]
  );

  const renderScene = useCallback(
    ({ route: tabRoute }) => {
      if (tabRoute.key === "followers") {
        return renderList(followers, "followers");
      }
      return renderList(following, "following");
    },
    [followers, following, renderList]
  );

  const followersCount = followersTotal || followers.length;
  const followingCount = followingTotal || following.length;

  const tabRoutes = useMemo(
    () => [
      { key: "followers", title: `Followers ${followersCount}` },
      { key: "following", title: `Following ${followingCount}` },
    ],
    [followersCount, followingCount]
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connections</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading lists...</Text>
        </View>
      ) : null}

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      <TabView
        navigationState={{ index, routes: tabRoutes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: SCREEN_WIDTH }}
        style={styles.tabView}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            indicatorStyle={styles.tabIndicator}
            style={styles.tabBar}
            activeColor="#2563EB"
            inactiveColor="#94A3B8"
            labelStyle={styles.tabLabel}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "#F8FAFF",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101828",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSpacer: {
    width: 36,
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#667085",
  },
  errorText: {
    textAlign: "center",
    color: "#D92D20",
    fontSize: 12,
    marginBottom: 6,
  },
  tabView: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E7EC",
  },
  tabIndicator: {
    backgroundColor: "#2563EB",
    height: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },
  userText: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  userHandle: {
    fontSize: 12,
    color: "#667085",
    marginTop: 2,
  },
  relationshipText: {
    fontSize: 12,
    color: "#98A2B3",
    marginTop: 2,
  },
  actionButton: {
    borderRadius: 8,
    padding:4,
    width:"30%",
    backgroundColor: "#EEF2FF",
  },
  actionButtonActive: {
    backgroundColor: "#2563EB",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign:"center",
    color: "#2563EB",
  },
  actionTextActive: {
    color: Colors.white,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 20,
    color: "#667085",
    fontSize: 12,
  },
  footerLoader: {
    paddingVertical: 12,
  },
});

export default FollowersList;
