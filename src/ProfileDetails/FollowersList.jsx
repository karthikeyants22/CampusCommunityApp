import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
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

  const users = Array.isArray(payload.users)
    ? payload.users
    : Array.isArray(payload.data)
      ? payload.data
      : [];

  return {
    users,
    page: Number(payload.page ?? 1),
    limit: Number(payload.limit ?? 10),
    total: Number(payload.total ?? 0),
    count: Number(payload.count ?? users.length ?? 0),
    hasMore: Boolean(payload.hasMore),
    nextPage:
      payload.nextPage === null || payload.nextPage === undefined
        ? null
        : Number(payload.nextPage),
  };
};

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
  const [resolvedUserId, setResolvedUserId] = useState(null);

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
        authService.getFollowers(userId, 1, 10),
        authService.getFollowing(userId, 1, 10),
      ]);

      if (!isMounted) return;

      if (followersRes?.isSuccess) {
        const normalized = normalizeResponse(followersRes.data);
        setFollowers(normalized.users);
        setFollowersPage(normalized.page || 1);
        setFollowersHasMore(Boolean(normalized.hasMore));
        setFollowersTotal(normalized.total || 0);
      } else {
        setErrorText(followersRes?.message || "Failed to load followers.");
      }

      if (followingRes?.isSuccess) {
        const normalized = normalizeResponse(followingRes.data);
        setFollowing(normalized.users);
        setFollowingPage(normalized.page || 1);
        setFollowingHasMore(Boolean(normalized.hasMore));
        setFollowingTotal(normalized.total || 0);
      } else if (!followersRes?.isSuccess) {
        setErrorText(followingRes?.message || "Failed to load following.");
      }

      setLoading(false);
    };

    loadLists();

    return () => {
      isMounted = false;
    };
  }, [route?.params?.userId]);

  const loadMoreFollowers = useCallback(async () => {
    if (!resolvedUserId || loadingMoreFollowers || !followersHasMore) return;
    setLoadingMoreFollowers(true);
    const nextPage = followersPage + 1;
    const res = await authService.getFollowers(resolvedUserId, nextPage, 10);
    if (res?.isSuccess) {
      const normalized = normalizeResponse(res.data);
      setFollowers((prev) => [...prev, ...normalized.users]);
      setFollowersPage(normalized.page || nextPage);
      setFollowersHasMore(Boolean(normalized.hasMore));
      setFollowersTotal(normalized.total || 0);
    }
    setLoadingMoreFollowers(false);
  }, [followersHasMore, followersPage, loadingMoreFollowers, resolvedUserId]);

  const loadMoreFollowing = useCallback(async () => {
    if (!resolvedUserId || loadingMoreFollowing || !followingHasMore) return;
    setLoadingMoreFollowing(true);
    const nextPage = followingPage + 1;
    const res = await authService.getFollowing(resolvedUserId, nextPage, 10);
    if (res?.isSuccess) {
      const normalized = normalizeResponse(res.data);
      setFollowing((prev) => [...prev, ...normalized.users]);
      setFollowingPage(normalized.page || nextPage);
      setFollowingHasMore(Boolean(normalized.hasMore));
      setFollowingTotal(normalized.total || 0);
    }
    setLoadingMoreFollowing(false);
  }, [followingHasMore, followingPage, loadingMoreFollowing, resolvedUserId]);

  const renderUser = useCallback(({ item }) => {
    const name = getDisplayName(item);
    const username =
      item?.username || item?.userName || item?.handle || item?.email || "";
    const avatarUrl = item?.avatarUrl || item?.profileImage || item?.avatar;
    return (
      <View style={styles.row}>
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{getAvatarText(item)}</Text>
          )}
        </View>
        <View style={styles.userText}>
          <Text style={styles.userName}>{name}</Text>
          {username ? (
            <Text style={styles.userHandle}>@{String(username)}</Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>
      </View>
    );
  }, []);

  const renderList = useCallback(
    (data, listKey) => (
      <FlatList
        data={data}
        keyExtractor={(item, idx) =>
          String(item?.id || item?._id || item?.userId || idx)
        }
        renderItem={renderUser}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.emptyText}>No users found.</Text>
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
      loadMoreFollowers,
      loadMoreFollowing,
      loading,
      loadingMoreFollowers,
      loadingMoreFollowing,
      renderUser,
    ]
  );

  const renderScene = ({ route: tabRoute }) => {
    if (tabRoute.key === "followers") {
      return renderList(followers, "followers");
    }
    return renderList(following, "following");
  };

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

      {!loading ? (
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            Followers: {followersTotal || followers.length}
          </Text>
          <Text style={styles.countText}>
            Following: {followingTotal || following.length}
          </Text>
        </View>
      ) : null}

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      <TabView
        navigationState={{ index, routes }}
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
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 20,
    color: "#667085",
    fontSize: 12,
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 12,
    color: "#667085",
    fontWeight: "600",
  },
  footerLoader: {
    paddingVertical: 12,
  },
});

export default FollowersList;
