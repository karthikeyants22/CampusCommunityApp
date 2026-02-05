import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Easing,
  Animated,
  FlatList,
  ToastAndroid,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import Fontaw from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Video from 'react-native-video';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';

import axiosClient, { ACCESS_TOKEN_KEY } from '../Authentication/axiosClient';
import authService from '../Authentication/authService';
import { resolveMediaUrlFromPayload } from '../Common/mediaUtils';

const { width: screenWidth } = Dimensions.get('window');
const MEDIA_INSET = 32;
const MEDIA_WIDTH = screenWidth - MEDIA_INSET;
const MEDIA_HEIGHT = MEDIA_WIDTH * 0.62;
const DOUBLE_TAP_DELAY = 260;
const featuredFilters = ['Trending', 'Events', 'Clubs', 'Opportunities', 'Highlights', 'Announcements'];
const EMPTY_ARRAY = Object.freeze([]);
const FALLBACK_KEY_REGISTRY = new WeakMap();
let fallbackKeyCounter = 0;
const getFeedItemKey = item => {
  if (!item || typeof item !== 'object') {
    return `feed-${fallbackKeyCounter++}`;
  }
  if (item.id !== undefined && item.id !== null) {
    return String(item.id);
  }
  if (item.uuid !== undefined && item.uuid !== null) {
    return String(item.uuid);
  }
  if (item.key !== undefined && item.key !== null) {
    return String(item.key);
  }
  if (FALLBACK_KEY_REGISTRY.has(item)) {
    return FALLBACK_KEY_REGISTRY.get(item);
  }
  const key = `feed-${fallbackKeyCounter++}`;
  FALLBACK_KEY_REGISTRY.set(item, key);
  return key;
};
const resolveServerHasMore = (payload = {}, currentPage = 1) => {
  const candidates = [
    payload.hasMore,
    payload.hasNextPage,
    payload?.meta?.hasMore,
    payload?.meta?.hasNextPage,
    payload?.pagination?.hasMore,
    payload?.pagination?.hasNextPage,
  ];

  for (const flag of candidates) {
    if (typeof flag === 'boolean') {
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

  return undefined;
};
const ANNOUNCEMENTS_ENDPOINT = 'announcements';
const ANNOUNCEMENT_ACCENT_COLORS = ['#38bdf8', '#f97316', '#34d399', '#818cf8', '#f472b6'];
const ANNOUNCEMENTS = [
];
const ANNOUNCEMENT_AUTO_INTERVAL = 4500;

const AnimatedIcon = Animated.createAnimatedComponent(Icon);

const FEED_PAGE_SIZE = 20;
const COMMENT_PAGE_SIZE = 20;

const coerceNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractTitleAndBody = (text = '') => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { title: '', body: '' };
  }
  const segments = trimmed.split(/\n+/);
  const title = segments[0]?.trim() || '';
  const body = segments.slice(1).join('\n').trim();
  return { title, body };
};

const resolveMediaType = item => {
  const rawType =
    item?.type ||
    item?.fileType ||
    item?.mediaType ||
    item?.metadata?.type ||
    item?.metadata?.contentType;

  if (typeof rawType === 'string') {
    const lowered = rawType.toLowerCase();
    if (lowered === 'video' || lowered.startsWith('video/')) {
      return 'video';
    }
  }

  return 'image';
};

const extractServerLikeState = payload => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidates = [
    payload,
    payload?.data,
    payload?.post,
    payload?.result,
    payload?.payload,
    payload?.resource,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (typeof candidate !== 'object') {
      continue;
    }

    const metrics = candidate.metrics;
    if (metrics && (metrics.likes !== undefined || metrics.likeCount !== undefined)) {
      return {
        likes: coerceNumber(metrics.likes ?? metrics.likeCount),
        isLiked:
          typeof candidate.isLiked === 'boolean'
            ? candidate.isLiked
            : typeof candidate.viewerState?.isLiked === 'boolean'
              ? candidate.viewerState.isLiked
              : undefined,
      };
    }

    if (candidate.likes !== undefined || candidate.likeCount !== undefined) {
      return {
        likes: coerceNumber(candidate.likes ?? candidate.likeCount),
        isLiked:
          typeof candidate.isLiked === 'boolean'
            ? candidate.isLiked
            : typeof candidate.liked === 'boolean'
              ? candidate.liked
              : undefined,
      };
    }
  }

  return null;
};

const normalizeApiPost = (post, index = 0) => {
  const fallbackId = `post-${index}-${Date.now()}`;
  const safeId = post?.id ?? fallbackId;
  const rawContent = typeof post?.content === 'string' ? post.content : '';
  const { title, body } = extractTitleAndBody(rawContent);
  const trimmed = rawContent.trim();
  const headline = title || trimmed || 'Campus update';
  const detail = body;
  const metrics = post?.metrics || {};
  const viewer = post?.viewerState || {};
  const author = post?.user || post?.author || post?.owner || {};
  const hashtags = Array.isArray(post?.hashtags) ? post.hashtags.filter(Boolean) : [];
  const rawMedia = Array.isArray(post?.media) ? post.media : [];
  const rawAttachments = Array.isArray(post?.attachments) ? post.attachments : [];
  const seenMedia = new Set();
  const media = [];

  const addMediaEntry = (item, mediaIndex, sourceLabel) => {
    const url = resolveMediaUrlFromPayload(item);
    if (!url || seenMedia.has(url)) {
      return;
    }
    seenMedia.add(url);
    media.push({
      id: String(item?.id ?? `${safeId}-${sourceLabel}-${mediaIndex}`),
      type: resolveMediaType(item),
      uri: url,
      url,
      poster:
        item?.poster ||
        item?.metadata?.posterUrl ||
        item?.metadata?.thumbnailUrl ||
        item?.metadata?.previewUrl ||
        undefined,
    });
  };

  rawMedia.forEach((item, idx) => addMediaEntry(item, idx, 'media'));
  rawAttachments.forEach((item, idx) => addMediaEntry(item, idx, 'attachment'));
  const createdAt = post?.createdAt || new Date().toISOString();
  const timeAgo = createdAt ? moment(createdAt).fromNow() : 'Just now';
  const viewerLiked =
    typeof viewer.isLiked === 'boolean'
      ? viewer.isLiked
      : typeof post?.viewerHasLiked === 'boolean'
        ? post.viewerHasLiked
        : typeof post?.isLiked === 'boolean'
          ? post.isLiked
          : false;

  const likeTotal = coerceNumber(
    metrics.likes ??
    metrics.likeCount ??
    post?.likeCount ??
    post?.likes ??
    post?.metrics?.totalLikes ??
    0,
  );

  const commentTotal = coerceNumber(
    metrics.comments ??
    metrics.commentCount ??
    post?.commentsCount ??
    post?.commentCount ??
    post?.metrics?.totalComments ??
    0,
  );

  const viewerSaved =
    typeof viewer.isSaved === 'boolean'
      ? viewer.isSaved
      : typeof viewer.hasSaved === 'boolean'
        ? viewer.hasSaved
        : typeof viewer.saved === 'boolean'
          ? viewer.saved
          : undefined;

  const savedFlag =
    viewerSaved ??
    (typeof post?.viewerHasSaved === 'boolean' ? post.viewerHasSaved : undefined) ??
    (typeof post?.saved === 'boolean' ? post.saved : undefined) ??
    (typeof post?.isSaved === 'boolean' ? post.isSaved : false);

  return {
    id: String(safeId),
    name: author?.fullName || author?.username || 'Community member',
    username: author?.username || '',
    profileImage: author?.avatarUrl || author?.profileImage || null,
    userId: author?.id ?? author?._id ?? author?.userId ?? post?.userId ?? null,
    isFollowing: Boolean(
      author?.isFollowing ??
      author?.viewerFollowing ??
      author?.following ??
      post?.viewerFollowing ??
      viewer?.isFollowing ??
      viewer?.viewerFollowing ??
      false,
    ),
    title: headline.length > 140 ? `${headline.slice(0, 140).trim()}...` : headline,
    content: detail,
    rawContent,
    media,
    tags: hashtags,
    time: timeAgo,
    createdAt,
    likes: likeTotal,
    likeCount: likeTotal,
    commentsCount: commentTotal,
    commentCount: commentTotal,
    views: coerceNumber(metrics.views ?? post?.viewCount),
    reposts: coerceNumber(metrics.reposts ?? post?.repostCount),
    isLiked: Boolean(viewerLiked),
    viewerHasLiked: Boolean(viewerLiked),
    isSaved: Boolean(savedFlag),
    isReposted: Boolean(viewer.isReposted ?? post?.isReposted),
    comments: Array.isArray(post?.comments) ? post.comments : [],
    mentions: Array.isArray(post?.mentions) ? post.mentions : [],
  };
};

const normalizeApiComment = (comment, index = 0, postId = 'post') => {
  if (!comment || typeof comment !== 'object') {
    return {
      id: `${postId}-comment-${index}`,
      text: '',
      createdAt: new Date().toISOString(),
      liked: false,
    };
  }

  const fallbackId = `${postId}-comment-${index}`;
  const safeId = comment?.id ?? comment?.commentId ?? comment?._id ?? fallbackId;
  const content = comment?.content ?? comment?.text ?? comment?.body ?? '';
  const createdAt = comment?.createdAt ?? comment?.created_at ?? comment?.timestamp ?? new Date().toISOString();
  const liked =
    typeof comment?.viewerHasLiked === 'boolean'
      ? comment.viewerHasLiked
      : typeof comment?.liked === 'boolean'
        ? comment.liked
        : typeof comment?.isLiked === 'boolean'
          ? comment.isLiked
          : false;

  return {
    id: String(safeId),
    text: content,
    createdAt,
    liked,
    author: comment?.user?.fullName || comment?.user?.username || comment?.author || '',
  };
};

const formatAnnouncementDate = value => {
  if (!value) {
    return '';
  }
  const parsed = moment(value);
  if (!parsed.isValid()) {
    return typeof value === 'string' ? value : '';
  }
  return parsed.format('ddd, MMM D');
};

const extractAnnouncementList = payload => {
  if (!payload) {
    return [];
  }
  const data = payload?.data ?? payload?.result ?? payload?.payload ?? payload;
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.announcements)) {
    return data.announcements;
  }
  if (Array.isArray(data?.items)) {
    return data.items;
  }
  if (Array.isArray(data?.rows)) {
    return data.rows;
  }
  if (Array.isArray(payload?.announcements)) {
    return payload.announcements;
  }
  return [];
};

const normalizeAnnouncement = (item, index = 0) => {
  const fallbackId = `ann-${index}`;
  const safeId = item?.id ?? item?._id ?? item?.announcementId ?? fallbackId;
  const title = item?.title ?? item?.heading ?? item?.name ?? 'Announcement';
  const details = item?.details ?? item?.description ?? item?.content ?? item?.body ?? '';
  const summaryCandidate = item?.summary ?? item?.subtitle ?? item?.shortDescription ?? '';
  const summary =
    summaryCandidate ||
    (typeof details === 'string' ? `${details}`.trim().slice(0, 120) : '');
  const scheduleRaw =
    item?.schedule ??
    item?.date ??
    item?.startsAt ??
    item?.startDate ??
    item?.createdAt ??
    '';
  const schedule = formatAnnouncementDate(scheduleRaw);
  const location =
    item?.location?.name ??
    item?.location ??
    item?.venue ??
    item?.place ??
    '';
  const tag =
    item?.tag ??
    item?.category?.name ??
    item?.type ??
    '';
  const accentColor =
    item?.accentColor ??
    ANNOUNCEMENT_ACCENT_COLORS[index % ANNOUNCEMENT_ACCENT_COLORS.length];
  const ctaLabel = item?.ctaLabel ?? item?.cta?.label ?? 'View';

  return {
    id: String(safeId),
    title,
    summary,
    details,
    schedule,
    location,
    tag,
    accentColor,
    ctaLabel,
  };
};


const getInitials = name => {
  if (!name) return '';
  const trimmed = name.trim();
  const names = trimmed.split(' ');

  if (names.length >= 2) {
    return (names[0][0] + names[1][0]).toUpperCase();
  }

  if (trimmed.length >= 2) {
    return (trimmed[0] + trimmed[1]).toUpperCase();
  }

  return trimmed[0].toUpperCase();
};

const MediaCarousel = memo(({ media, onPreviewMedia, onDoubleLike }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playingId, setPlayingId] = useState(null);
  const doubleTapAnim = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);
  const singleTapTimeoutRef = useRef(null);

  useEffect(() => {
    setActiveIndex(0);
    setPlayingId(null);
  }, [media]);

  useEffect(() => () => {
    if (singleTapTimeoutRef.current) {
      clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = null;
    }
  }, []);

  const handleMomentumEnd = useCallback(event => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / MEDIA_WIDTH);
    setActiveIndex(nextIndex);
    setPlayingId(null);
  }, []);

  const handleMediaPress = useCallback(
    item => {
      if (item.type === 'video') {
        setPlayingId(current => (current === item.id ? null : item.id));
      } else {
        onPreviewMedia?.(item);
      }
    },
    [onPreviewMedia],
  );

  const runDoubleTapAnimation = useCallback(() => {
    doubleTapAnim.stopAnimation();
    doubleTapAnim.setValue(0);
    Animated.sequence([
      Animated.timing(doubleTapAnim, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(doubleTapAnim, {
        toValue: 0,
        duration: 220,
        delay: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [doubleTapAnim]);

  const handleImageTap = useCallback(
    item => {
      const now = Date.now();
      const isDoubleTap = now - lastTapRef.current < DOUBLE_TAP_DELAY;

      if (isDoubleTap) {
        if (singleTapTimeoutRef.current) {
          clearTimeout(singleTapTimeoutRef.current);
          singleTapTimeoutRef.current = null;
        }
        runDoubleTapAnimation();
        onDoubleLike?.();
        lastTapRef.current = 0;
        return;
      }

      lastTapRef.current = now;
      singleTapTimeoutRef.current = setTimeout(() => {
        singleTapTimeoutRef.current = null;
        handleMediaPress(item);
      }, DOUBLE_TAP_DELAY);
    },
    [handleMediaPress, onDoubleLike, runDoubleTapAnimation],
  );

  const handleVideoPreview = useCallback(
    item => {
      onPreviewMedia?.({ ...item, autoplay: true });
    },
    [onPreviewMedia],
  );

  const renderMediaItem = useCallback(
    ({ item }) => {
      if (item.type === 'video') {
        const isPlaying = playingId === item.id;

        return (
          <View style={styles.mediaSlide}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleMediaPress(item)}
              style={styles.mediaAsset}
            >
              <Video
                source={{ uri: item.uri }}
                style={styles.mediaVideo}
                resizeMode="cover"
                paused={!isPlaying}
                repeat
                muted={false}
                controls={isPlaying}
                poster={item.poster}
              // posterResizeMode="cover"
              />

              {!isPlaying && (
                <View style={styles.videoOverlay}>
                  <MaterialIcons name="play-circle-outline" size={64} color="#ffffff" />
                </View>
              )}

              <View style={styles.videoBadge}>
                <MaterialIcons name="videocam" size={18} color="#fff" />
                <Text style={styles.videoBadgeText}>{isPlaying ? 'Playing' : 'Tap to play'}</Text>
              </View>
              <TouchableOpacity
                style={styles.mediaExpand}
                onPress={() => handleVideoPreview(item)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="open-in-full" size={20} color="#ffffff" />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        );
      }

      const displayUri = item.uri || item.url;

      return (
        <View style={styles.mediaSlide}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => handleImageTap(item)} style={styles.mediaAsset}>
            {displayUri ? (
              <Image source={{ uri: displayUri }} style={styles.mediaImage} resizeMode="cover" />
            ) : (
              <View style={styles.mediaFallback}>
                <MaterialIcons name="image-not-supported" size={34} color="#cbd5f5" />
                <Text style={styles.mediaFallbackText}>Preview unavailable</Text>
              </View>
            )}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.doubleTapHeart,
                {
                  opacity: doubleTapAnim,
                  transform: [
                    {
                      scale: doubleTapAnim.interpolate({
                        inputRange: [0, 0.6, 1],
                        outputRange: [0.6, 1.2, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Fontaw name="heart" size={70} color="#ffff" />
            </Animated.View>
            {/* <View style={styles.imageOverlayHint}>
              <MaterialIcons name="zoom-out-map" size={18} color="#ffffff" />
              <Text style={styles.imageOverlayText}>Tap to view</Text>
            </View> */}
          </TouchableOpacity>
        </View>
      );
    },
    [handleImageTap, handleMediaPress, handleVideoPreview, playingId],
  );

  return (
    <View style={styles.carouselWrapper}>
      <FlatList
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mediaContentContainer}
        decelerationRate="fast"
        snapToInterval={MEDIA_WIDTH}
        snapToAlignment="start"
        keyExtractor={item => item.id}
        renderItem={renderMediaItem}
        onMomentumScrollEnd={handleMomentumEnd}
      />

      {media.length > 1 && (
        <>
          <View style={styles.carouselCounter}>
            <Text style={styles.carouselCounterText}>{`${activeIndex + 1}/${media.length}`}</Text>
          </View>
          <View style={styles.carouselDots}>
            {media.map((_, idx) => (
              <View
                key={`dot-${idx}`}
                style={[styles.dot, idx === activeIndex && styles.dotActive]}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
});

// Lightweight comparison helpers keep FlatList rows pure for better virtualization performance.
const normalizeCount = value => (Number.isFinite(value) ? value : 0);
const normalizeText = value =>
  typeof value === 'string' ? value : value != null ? String(value) : '';
const normalizeArray = value => (Array.isArray(value) ? value : EMPTY_ARRAY);

const arePrimitiveArraysEqual = (prev, next) => {
  if (prev === next) {
    return true;
  }
  if (prev.length !== next.length) {
    return false;
  }
  for (let i = 0; i < prev.length; i += 1) {
    if (prev[i] !== next[i]) {
      return false;
    }
  }
  return true;
};

const areMediaArraysEqual = (prevMedia, nextMedia) => {
  const prevList = normalizeArray(prevMedia);
  const nextList = normalizeArray(nextMedia);

  if (prevList === nextList) {
    return true;
  }

  if (prevList.length !== nextList.length) {
    return false;
  }

  for (let i = 0; i < prevList.length; i += 1) {
    const prevItem = prevList[i] || {};
    const nextItem = nextList[i] || {};

    if (
      prevItem.id !== nextItem.id ||
      prevItem.type !== nextItem.type ||
      prevItem.uri !== nextItem.uri ||
      prevItem.url !== nextItem.url ||
      prevItem.poster !== nextItem.poster
    ) {
      return false;
    }
  }

  return true;
};

const arePostCardPropsEqual = (prevProps, nextProps) => {
  if (
    prevProps.onLike !== nextProps.onLike ||
    prevProps.onSave !== nextProps.onSave ||
    prevProps.onCommentPress !== nextProps.onCommentPress ||
    prevProps.onPreviewMedia !== nextProps.onPreviewMedia ||
    prevProps.onRepost !== nextProps.onRepost ||
    prevProps.onToggleFollow !== nextProps.onToggleFollow ||
    prevProps.isFollowLoading !== nextProps.isFollowLoading ||
    prevProps.isOwnPost !== nextProps.isOwnPost
  ) {
    return false;
  }

  const prevItem = prevProps.item || {};
  const nextItem = nextProps.item || {};

  if (prevItem === nextItem) {
    return true;
  }

  if (
    prevItem.id !== nextItem.id ||
    normalizeText(prevItem.name) !== normalizeText(nextItem.name) ||
    normalizeText(prevItem.time) !== normalizeText(nextItem.time) ||
    normalizeText(prevItem.title) !== normalizeText(nextItem.title) ||
    normalizeText(prevItem.content) !== normalizeText(nextItem.content) ||
    normalizeText(prevItem.username) !== normalizeText(nextItem.username) ||
    normalizeText(prevItem.role) !== normalizeText(nextItem.role) ||
    normalizeText(prevItem.profileImage) !== normalizeText(nextItem.profileImage) ||
    Boolean(prevItem.isLiked) !== Boolean(nextItem.isLiked) ||
    Boolean(prevItem.viewerHasLiked) !== Boolean(nextItem.viewerHasLiked) ||
    Boolean(prevItem.isSaved) !== Boolean(nextItem.isSaved) ||
    Boolean(prevItem.isFollowing) !== Boolean(nextItem.isFollowing) ||
    Boolean(prevItem.isReposted) !== Boolean(nextItem.isReposted) ||
    normalizeCount(prevItem.likes) !== normalizeCount(nextItem.likes) ||
    normalizeCount(prevItem.commentsCount) !== normalizeCount(nextItem.commentsCount) ||
    normalizeCount(prevItem.views) !== normalizeCount(nextItem.views) ||
    normalizeCount(prevItem.reposts) !== normalizeCount(nextItem.reposts)
  ) {
    return false;
  }

  const prevTags = normalizeArray(prevItem.tags);
  const nextTags = normalizeArray(nextItem.tags);
  if (!arePrimitiveArraysEqual(prevTags, nextTags)) {
    return false;
  }

  if (!areMediaArraysEqual(prevItem.media, nextItem.media)) {
    return false;
  }

  return true;
};

const PostCard = memo(
  ({
    item,
    onLike,
    onSave,
    onCommentPress,
    onPreviewMedia,
    onRepost,
    onToggleFollow,
    isFollowLoading,
    isOwnPost,
  }) => {
    const authorName = item?.name || 'Community member';
    const timestamp = item?.time || 'Just now';
    const title = item?.title || '';
    const body = item?.content || '';
    const mediaItems = useMemo(() => (Array.isArray(item?.media) ? item.media : EMPTY_ARRAY), [item?.media]);
    const tagsList = useMemo(() => (Array.isArray(item?.tags) ? item.tags : EMPTY_ARRAY), [item?.tags]);
    const likesCount = normalizeCount(item?.likeCount ?? item?.likes);
    const commentsTotal = normalizeCount(item?.commentsCount ?? item?.commentCount);
    const viewCount = normalizeCount(item?.views);
    const initials = getInitials(authorName);
    const navigation = useNavigation();
    const hasReposted = Boolean(item.isReposted);
    const repostCount = normalizeCount(item.reposts);
    const repostScale = useRef(new Animated.Value(1)).current;
    const repostRotation = useRef(new Animated.Value(0)).current;
    const lastRepostActionRef = useRef(null);
    const likeScale = useRef(new Animated.Value(1)).current;
    const repostRotate = useMemo(
      () =>
        repostRotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      [repostRotation],
    );

    const userMetaLine = item?.username ? `@${item.username}` : item?.role || '';
    const isFollowing = Boolean(item?.isFollowing);
    const canFollow = Boolean(item?.userId);
    const runActivateAnimation = useCallback(() => {
      repostScale.stopAnimation();
      repostRotation.stopAnimation();
      repostRotation.setValue(0);

      const scaleSequence = Animated.sequence([
        Animated.timing(repostScale, {
          toValue: 0.92,
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(repostScale, {
          toValue: 1.1,
          speed: 16,
          bounciness: 14,
          useNativeDriver: true,
        }),
        Animated.spring(repostScale, {
          toValue: 1,
          speed: 12,
          bounciness: 6,
          useNativeDriver: true,
        }),
      ]);

      Animated.parallel([
        scaleSequence,
        Animated.timing(repostRotation, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        repostRotation.setValue(0);
      });
    }, [repostRotation, repostScale]);

    const runDeactivateAnimation = useCallback(() => {
      repostScale.stopAnimation();
      repostRotation.stopAnimation();
      repostRotation.setValue(0);
      Animated.sequence([
        Animated.timing(repostScale, {
          toValue: 0.96,
          duration: 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(repostScale, {
          toValue: 1,
          speed: 12,
          bounciness: 5,
          useNativeDriver: true,
        }),
      ]).start(() => {
        repostRotation.setValue(0);
      });
    }, [repostRotation, repostScale]);

    const handleRepostPress = useCallback(() => {
      onRepost?.(item);
    }, [item, onRepost]);

    useEffect(() => {
      if (item.isReposted) {
        if (lastRepostActionRef.current === 'activate') {
          lastRepostActionRef.current = null;
          return;
        }
        runActivateAnimation();
      } else {
        if (lastRepostActionRef.current === 'deactivate') {
          lastRepostActionRef.current = null;
          return;
        }
        repostScale.stopAnimation();
        repostScale.setValue(1);
        repostRotation.stopAnimation();
        repostRotation.setValue(0);
      }
    }, [item.isReposted, repostRotation, repostScale, runActivateAnimation]);

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

    useEffect(() => {
      const loadToken = async () => {
        try {
          await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
        } catch (error) {
          console.log('Error loading from AsyncStorage:', error);
        }
      };

      loadToken();
    }, []);

    const handleMediaPreview = useCallback(
      mediaItem => {
        onPreviewMedia?.({
          ...mediaItem,
          postTitle: title,
          postContent: body || item?.rawContent || '',
          author: authorName,
        });
      },
      [authorName, body, item, onPreviewMedia, title],
    );

    const runLikeAnimation = useCallback(
      willLike => {
        likeScale.stopAnimation();
        likeScale.setValue(willLike ? 0.8 : 1);
        Animated.spring(likeScale, {
          toValue: 1.1,
          speed: 14,
          bounciness: 12,
          useNativeDriver: true,
        }).start(() => {
          Animated.spring(likeScale, {
            toValue: 1,
            speed: 14,
            bounciness: 6,
            useNativeDriver: true,
          }).start();
        });
      },
      [likeScale],
    );

    const handleLikePress = useCallback(() => {
      const willLike = !item.viewerHasLiked;
      runLikeAnimation(willLike);
      onLike(item.id);
    }, [item.id, item.viewerHasLiked, onLike, runLikeAnimation]);

    const handleFollowPress = useCallback(() => {
      onToggleFollow?.(item);
    }, [item, onToggleFollow]);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>

          <TouchableOpacity 
          
          onPress={() => {
            const targetUserId = item?.userId ?? null;
            if (isOwnPost) {
              navigation.navigate("MainTabs", { screen: "Profile" });
              return;
            }
            if (targetUserId) {
              navigation.navigate("UserProfileInfo", { userId: targetUserId });
            } else {
              navigation.navigate("MainTabs", { screen: "Profile" });
            }
          }}>
            {item.profileImage ? (
              <Image source={{ uri: "https://archived-howto-attacked-regularly.trycloudflare.com" + item.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text 
                  style={styles.initials}>{initials}</Text>
              </View>

            )}
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{authorName}</Text>
            {/* {userMetaLine ? <Text style={styles.userMeta}>{userMetaLine}</Text> : null} */}
            <Text style={styles.timestamp}>{timestamp}</Text>
          </View>

          {/* <TouchableOpacity style={styles.moreButton} onPress={handleLogout}>
            <Icon name="more-horizontal" size={22} color="#475467" />
          </TouchableOpacity> */}
          {!isOwnPost ? (
            <TouchableOpacity
              style={[
                styles.button,
                isFollowing && styles.buttonActive,
                !canFollow && styles.buttonDisabled,
              ]}
              onPress={handleFollowPress}
              disabled={!canFollow || isFollowLoading}
            >
              {isFollowLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? '#ffffff' : '#2563EB'} />
              ) : (
                <Text style={[styles.buttonText, isFollowing && styles.buttonTextActive]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          {title ? (
            <Text style={styles.postTitle} numberOfLines={2}>
              {title}
            </Text>
          ) : null}
          {body ? (
            <Text style={styles.postContent} numberOfLines={4} ellipsizeMode="tail">
              {body}
            </Text>
          ) : null}

          {tagsList.length ? (
            <View style={styles.tagsRow}>
              {tagsList.map(tag => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {mediaItems.length ? (
          <MediaCarousel
            media={mediaItems}
            onPreviewMedia={handleMediaPreview}
            onDoubleLike={handleLikePress}
          />
        ) : null}

        {/* <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <MaterialIcons name="visibility" size={16} color="#94A3B8" />
          <Text style={styles.metricText}>{viewCount} views</Text>
        </View>
        <View style={styles.metricItem}>
          <MaterialIcons name="chat-bubble-outline" size={16} color="#94A3B8" />
          <Text style={styles.metricText}>{commentsTotal} comments</Text>
        </View>
      </View> */}

        <View style={styles.cardDivider} />

        <View style={styles.actions}>
          <TouchableOpacity onPress={handleLikePress} style={styles.actionButton}>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Fontaw
                name={item.viewerHasLiked ? 'heart' : 'heart-o'}
                size={22}
                color={item.viewerHasLiked ? '#9D0759' : '#98A2B3'}
              //EF4444 
              />
            </Animated.View>
            <Text style={styles.actionText}>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onCommentPress(item.id)} style={styles.actionButton}>
            <Icon name="message-square" size={21} color="#475467" />
            <Text style={styles.actionText}>{commentsTotal}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Icon name="share-2" size={21} color="#475467" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRepostPress}
            activeOpacity={0.82}
            style={[
              styles.actionButton,
              styles.repostActionButton,
              hasReposted && styles.repostActionActive,
            ]}
          >
            <AnimatedIcon
              name="repeat"
              size={21}
              color={hasReposted ? '#2563EB' : '#475467'}
              style={{
                transform: [
                  { scale: repostScale },
                  { rotate: repostRotate },
                ],
              }}
            />
            <Text
              style={[
                styles.actionText,
                hasReposted && styles.actionTextActive,
              ]}
            >
              {repostCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onSave(item.id)} style={styles.actionButton}>
            <Ionicons
              name={item.isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={item.isSaved ? '#2563EB' : '#475467'}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  },
  arePostCardPropsEqual,
);

const FeedSkeletonCard = memo(() => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.95, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const animatedStyle = { opacity: pulse };

  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonAvatar, animatedStyle]} />
        <View style={styles.skeletonHeaderText}>
          <Animated.View style={[styles.skeletonLineMedium, animatedStyle]} />
          <Animated.View style={[styles.skeletonLineTiny, animatedStyle]} />
        </View>
      </View>
      <Animated.View style={[styles.skeletonLineFull, animatedStyle]} />
      <Animated.View style={[styles.skeletonLineFull, animatedStyle, { width: '78%' }]} />
      <Animated.View style={[styles.skeletonMedia, animatedStyle]} />
      <View style={styles.skeletonActionRow}>
        <Animated.View style={[styles.skeletonChip, animatedStyle]} />
        <Animated.View style={[styles.skeletonChip, animatedStyle]} />
        <Animated.View style={[styles.skeletonChip, animatedStyle]} />
      </View>
    </View>
  );
});

const FeedStatusCard = memo(({ icon = 'info', title, message, actionLabel, onAction }) => (
  <View style={styles.statusCard}>
    <MaterialIcons name={icon} size={30} color="#2563EB" />
    {title ? <Text style={styles.statusTitle}>{title}</Text> : null}
    {message ? <Text style={styles.statusMessage}>{message}</Text> : null}
    {actionLabel ? (
      <TouchableOpacity style={styles.statusAction} onPress={onAction} activeOpacity={0.85}>
        <Text style={styles.statusActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
));

export default function FeedScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [searchText, setSearchText] = useState('');
  const [posts, setPosts] = useState([]);
  const postsRef = useRef(posts);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [followLoadingByUser, setFollowLoadingByUser] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: FEED_PAGE_SIZE, count: 0 });
  const [hasMore, setHasMore] = useState(true);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState(false);
  const [isPagingFeed, setIsPagingFeed] = useState(false);
  const [feedError, setFeedError] = useState(null);
  const feedRequestRef = useRef(false);
  const isInitialFeed = isFeedLoading && !isFeedRefreshing && posts.length === 0;
  const [announcements, setAnnouncements] = useState(ANNOUNCEMENTS);
  const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState(null);

  const announcementAnim = useRef(new Animated.Value(1)).current;
  const announcementPulseAnim = useRef(new Animated.Value(0)).current;
  const lastAnnouncementDirectionRef = useRef('up');
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);
  const announcementContentOpacity = useRef(new Animated.Value(1)).current;
  const announcementContentTranslate = useRef(new Animated.Value(0)).current;
  const announcementAutoCycleRef = useRef(null);
  const announcementIndexRef = useRef(0);
  const [isAnnouncementsSheetVisible, setAnnouncementsSheetVisible] = useState(false);
  const [isAnnouncementsSheetExpanded, setAnnouncementsSheetExpanded] = useState(false);
  const [shouldRenderAnnouncement, setShouldRenderAnnouncement] = useState(true);
  const announcementsSheetAnim = useRef(new Animated.Value(0)).current;
  const feedScrollOffsetRef = useRef(0);
  const feedScrollDirectionRef = useRef('up');
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState(null);
  const successMessageTimerRef = useRef(null);
  const dismissUploadSuccessMessage = useCallback(() => {
    if (successMessageTimerRef.current) {
      clearTimeout(successMessageTimerRef.current);
      successMessageTimerRef.current = null;
    }
    setUploadSuccessMessage(null);
  }, []);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    let isMounted = true;
    const loadCurrentUser = async () => {
      const res = await authService.getUsersList();
      if (!isMounted) return;
      if (res?.isSuccess) {
        const payload = res.data?.data ?? res.data;
        const id = payload?.id ?? payload?.userId ?? payload?._id ?? null;
        setCurrentUserId(id);
      }
    };

    loadCurrentUser();
    return () => {
      isMounted = false;
    };
  }, []);
  // const fetchFeed = useCallback(
  //   async ({ page: pageParam = 1, refreshing = false } = {}) => {
  //     if (feedRequestRef.current) {
  //       return;
  //     }
  //     feedRequestRef.current = true;
  //     setFeedError(null);

  //     if (pageParam === 1) {
  //       if (refreshing) {
  //         setIsFeedRefreshing(true);
  //       } else {
  //         setIsFeedLoading(true);
  //       }
  //     } else {
  //       setIsPagingFeed(true);
  //     }

  //     try {
  //       const response = await axiosClient.get('posts/feed', {
  //         params: { page: pageParam, limit: FEED_PAGE_SIZE },
  //       });
  //       console.log("RESPONSEFEEDD", response)
  //       if (response.status < 200 || response.status >= 300) {
  //         throw new Error(response.data?.message || `Feed request failed (${response.status})`);
  //       }

  //       const payload = response.data || {};
  //       const limitFromResponse = payload.limit ?? FEED_PAGE_SIZE;
  //       const offset = Math.max(0, (pageParam - 1) * limitFromResponse);
  //       const incoming = Array.isArray(payload.posts)
  //         ? payload.posts.map((post, idx) => normalizeApiPost(post, offset + idx))
  //         : [];

  //       setPosts(prev => {
  //         if (pageParam === 1) {
  //           return incoming;
  //         }
  //         if (!incoming.length) {
  //           return prev;
  //         }
  //         const existingIds = new Set(prev.map(post => post.id));
  //         const deduped = incoming.filter(post => !existingIds.has(post.id));
  //         return deduped.length ? [...prev, ...deduped] : prev;
  //       });

  //       setPagination(prev => ({
  //         page: payload.page ?? pageParam,
  //         limit: limitFromResponse,
  //         count: payload.count ?? prev.count ?? 0,
  //       }));

  //       const totalCount = typeof payload.count === 'number' ? payload.count : undefined;
  //       let nextHasMore = incoming.length === limitFromResponse && incoming.length > 0;
  //       if (typeof totalCount === 'number' && totalCount >= 0) {
  //         const currentPage = payload.page ?? pageParam;
  //         nextHasMore = currentPage * limitFromResponse < totalCount;
  //       }
  //       if (!incoming.length) {
  //         nextHasMore = false;
  //       }
  //       setHasMore(nextHasMore);
  //     } catch (error) {
  //       console.warn('Feed fetch failed:', error);
  //       const apiMessage =
  //         error?.response?.data?.message ||
  //         error?.data?.message ||
  //         error?.message ||
  //         'Unable to load feed right now.';
  //       setFeedError(apiMessage);
  //       if (pageParam === 1) {
  //         setPosts([]);
  //         setHasMore(false);
  //       }
  //     } finally {
  //       feedRequestRef.current = false;
  //       setIsFeedLoading(false);
  //       setIsFeedRefreshing(false);
  //       setIsPagingFeed(false);
  //     }
  //   },
  //   [],
  // );


  const fetchFeed = useCallback(
    async ({ page: pageParam = 1, refreshing = false } = {}) => {
      if (feedRequestRef.current) {
        return;
      }
      feedRequestRef.current = true;
      setFeedError(null);

      if (pageParam === 1) {
        if (refreshing) {
          setIsFeedRefreshing(true);
        } else {
          setIsFeedLoading(true);
        }
      } else {
        setIsPagingFeed(true);
      }

      try {
        const response = await axiosClient.get('posts/feed', {
          params: { page: pageParam, limit: FEED_PAGE_SIZE, pageCount: pageParam },
        });
        console.log("FEED_LIST_RESPONSE", response)
        if (response.status < 200 || response.status >= 300) {
          throw new Error(response.data?.message || `Feed request failed (${response.status})`);
        }

        const payload = response.data || {};
        const limitFromResponse = payload.limit ?? FEED_PAGE_SIZE;

        // offset for normalizeApiPost
        const offset = Math.max(0, (pageParam - 1) * limitFromResponse);
        const incoming = Array.isArray(payload.posts)
          ? payload.posts.map((post, idx) => normalizeApiPost(post, offset + idx))
          : [];

        // merge / replace posts
        setPosts(prev => {
          if (pageParam === 1) {
            return incoming;
          }
          if (!incoming.length) {
            return prev;
          }
          const existingIds = new Set(prev.map(post => post.id));
          const deduped = incoming.filter(post => !existingIds.has(post.id));
          return deduped.length ? [...prev, ...deduped] : prev;
        });

        // always trust the page we REQUESTED from client
        const totalCount =
          typeof payload.count === 'number'
            ? payload.count
            : undefined;

        setPagination(prev => ({
          page: pageParam,
          limit: limitFromResponse,
          count: totalCount ?? prev.count ?? 0,
        }));

        // compute hasMore
        const serverHasMore = resolveServerHasMore(payload, pageParam);
        let nextHasMore = true;

        if (typeof serverHasMore === 'boolean') {
          nextHasMore = serverHasMore;
        } else if (typeof totalCount === 'number' && totalCount >= 0) {
          nextHasMore = pageParam * limitFromResponse < totalCount;
        } else {
          nextHasMore = incoming.length === limitFromResponse && incoming.length > 0;
        }

        if (!incoming.length) {
          nextHasMore = false;
        }

        setHasMore(nextHasMore);
      } catch (error) {
        console.warn('Feed fetch failed:', error);
        const apiMessage =
          error?.response?.data?.message ||
          error?.data?.message ||
          error?.message ||
          'Unable to load feed right now.';
        setFeedError(apiMessage);

        if (pageParam === 1) {
          setPosts([]);
          setHasMore(false);
        }
      } finally {
        feedRequestRef.current = false;
        setIsFeedLoading(false);
        setIsFeedRefreshing(false);
        setIsPagingFeed(false);
      }
    },
    [],
  );

  const fetchAnnouncements = useCallback(async () => {
    setIsAnnouncementsLoading(true);
    setAnnouncementsError(null);

    try {
      const response = await axiosClient.get(ANNOUNCEMENTS_ENDPOINT, {
        params: { page: 1, limit: 10, includeArchived: false },
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.data?.message || `Announcements request failed (${response.status})`);
      }

      const payload = response.data ?? {};
      const list = extractAnnouncementList(payload);
      const normalized = list.map((item, idx) => normalizeAnnouncement(item, idx));
      setAnnouncements(normalized);
    } catch (error) {
      console.warn('Announcements fetch failed:', error);
      const apiMessage =
        error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        'Unable to load announcements right now.';
      setAnnouncementsError(apiMessage);
    } finally {
      setIsAnnouncementsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed({ page: 1 });
  }, [fetchFeed]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  useEffect(
    () => () => {
      if (successMessageTimerRef.current) {
        clearTimeout(successMessageTimerRef.current);
        successMessageTimerRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const token = route?.params?.uploadSuccessToken;
    if (!token) {
      return;
    }

    const message = route?.params?.uploadMessage || 'Your post has been published.';
    setUploadSuccessMessage(message);

    if (successMessageTimerRef.current) {
      clearTimeout(successMessageTimerRef.current);
    }
    successMessageTimerRef.current = setTimeout(() => {
      dismissUploadSuccessMessage();
    }, 4000);

    if (route?.params?.shouldRefreshFeed) {
      handleRefresh();
    }

    navigation.setParams?.({
      uploadSuccessToken: undefined,
      uploadMessage: undefined,
      shouldRefreshFeed: undefined,
    });
  }, [
    dismissUploadSuccessMessage,
    handleRefresh,
    navigation,
    route?.params?.shouldRefreshFeed,
    route?.params?.uploadMessage,
    route?.params?.uploadSuccessToken,
  ]);

  const handleRefresh = useCallback(() => {
    fetchFeed({ page: 1, refreshing: true });
    fetchAnnouncements();
  }, [fetchAnnouncements, fetchFeed]);

  const handleRetryFeed = useCallback(() => {
    fetchFeed({ page: 1 });
  }, [fetchFeed]);

  const handleLoadMore = useCallback(() => {
    if (
      !hasMore ||
      isFeedLoading ||
      isPagingFeed ||
      isFeedRefreshing ||
      feedRequestRef.current
    ) {
      return;
    }

    const currentPage = pagination.page || 1;
    fetchFeed({ page: currentPage + 1 });
  }, [fetchFeed, hasMore, isFeedLoading, isFeedRefreshing, isPagingFeed, pagination.page]);


  // const handleLoadMore = useCallback(() => {
  //   if (!hasMore || isFeedLoading || isPagingFeed || isFeedRefreshing || feedRequestRef.current) {
  //     return;
  //   }
  //   fetchFeed({ page: pagination.page + 1 });
  // }, [fetchFeed, hasMore, isFeedLoading, isFeedRefreshing, isPagingFeed, pagination.page]);

  /** swipe to switch announcement */
  const goToAnnouncementIndex = useCallback(
    index => {
      if (!announcementCount) return;
      const normalizedIndex = ((index % announcementCount) + announcementCount) % announcementCount;

      if (announcementIndexRef.current === normalizedIndex) return;

      Animated.parallel([
        Animated.timing(announcementContentOpacity, {
          toValue: 0,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(announcementContentTranslate, {
          toValue: -24,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        announcementIndexRef.current = normalizedIndex;
        setActiveAnnouncementIndex(normalizedIndex);
        announcementContentTranslate.setValue(30);

        Animated.parallel([
          Animated.timing(announcementContentOpacity, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(announcementContentTranslate, {
            toValue: 0,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [announcementContentOpacity, announcementContentTranslate, announcementCount],
  );

  /** swipe responder across the banner */
  const stopAnnouncementAutoCycle = useCallback(() => {
    if (announcementAutoCycleRef.current) {
      clearInterval(announcementAutoCycleRef.current);
      announcementAutoCycleRef.current = null;
    }
  }, []);

  const startAnnouncementAutoCycle = useCallback(() => {
    stopAnnouncementAutoCycle();
    if (announcementCount <= 1) return;

    announcementAutoCycleRef.current = setInterval(() => {
      goToAnnouncementIndex(announcementIndexRef.current + 1);
    }, ANNOUNCEMENT_AUTO_INTERVAL);
  }, [announcementCount, goToAnnouncementIndex, stopAnnouncementAutoCycle]);

  useEffect(() => {
    startAnnouncementAutoCycle();
    return stopAnnouncementAutoCycle;
  }, [startAnnouncementAutoCycle, stopAnnouncementAutoCycle]);

  useEffect(() => {
    announcementIndexRef.current = activeAnnouncementIndex;
  }, [activeAnnouncementIndex]);

  useEffect(() => {
    if (!announcementCount) {
      announcementIndexRef.current = 0;
      setActiveAnnouncementIndex(0);
      return;
    }
    if (activeAnnouncementIndex >= announcementCount) {
      announcementIndexRef.current = 0;
      setActiveAnnouncementIndex(0);
    }
  }, [activeAnnouncementIndex, announcementCount]);

  const announcementsSheetAnimTranslateY = announcementsSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  const announcementPulse = useRef(
    Animated.loop(
      Animated.sequence([
        Animated.timing(announcementPulseAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(announcementPulseAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ),
  ).current;

  useEffect(() => {
    announcementPulse.start();
    return () => {
      announcementPulse.stop();
      announcementPulseAnim.setValue(0);
    };
  }, [announcementPulse, announcementPulseAnim]);

  const announcementSwipeResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 8,
      onPanResponderGrant: () => {
        stopAnnouncementAutoCycle();
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 30) {
          goToAnnouncementIndex(announcementIndexRef.current - 1);
        } else if (g.dx < -30) {
          goToAnnouncementIndex(announcementIndexRef.current + 1);
        }
        startAnnouncementAutoCycle();
      },
      onPanResponderTerminate: () => {
        startAnnouncementAutoCycle();
      },
    });
  }, [goToAnnouncementIndex, startAnnouncementAutoCycle, stopAnnouncementAutoCycle]);

  /** show/hide animation for legacy behavior (still fine even when it scrolls) */
  const hideAnnouncement = useCallback(() => {
    if (!shouldRenderAnnouncement) return;
    announcementAnim.stopAnimation();
    Animated.timing(announcementAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShouldRenderAnnouncement(false);
    });
  }, [announcementAnim, announcementCount, shouldRenderAnnouncement]);

  const showAnnouncement = useCallback(() => {
    if (!announcementCount) return;

    const run = () => {
      announcementAnim.stopAnimation();
      Animated.timing(announcementAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    if (!shouldRenderAnnouncement) {
      setShouldRenderAnnouncement(true);
      requestAnimationFrame(run);
      return;
    }
    run();
  }, [announcementAnim, shouldRenderAnnouncement]);

  /** Show banner when scrolling down, hide when scrolling up */
  const handleFeedScrollDirection = useCallback(
    dir => {
      if (dir === 'down') {
        showAnnouncement();
      } else if (dir === 'up') {
        hideAnnouncement();
      }
    },
    [hideAnnouncement, showAnnouncement],
  );

  const filteredPosts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return posts;
    }

    return posts.filter(post => {
      const title = (post.title || '').toLowerCase();
      const content = (post.content || '').toLowerCase();
      const tags = Array.isArray(post.tags) ? post.tags : [];

      return (
        title.includes(keyword) ||
        content.includes(keyword) ||
        tags.some(tag => (tag || '').toLowerCase().includes(keyword))
      );
    });
  }, [posts, searchText]);

  const skeletonData = useMemo(
    () =>
      isInitialFeed
        ? Array.from({ length: 3 }, (_, idx) => ({ id: `skeleton-${idx}`, __skeleton: true }))
        : [],
    [isInitialFeed],
  );

  const listData = isInitialFeed ? skeletonData : filteredPosts;

  const feedEmptyComponent = useMemo(() => {
    if (isInitialFeed) {
      return null;
    }

    const keyword = searchText.trim();

    if (keyword && posts.length) {
      return (
        <FeedStatusCard
          icon="search-off"
          title="No matches"
          message={`No posts match "${keyword}".`}
        />
      );
    }

    if (isFeedLoading || isFeedRefreshing) {
      return (
        <FeedStatusCard
          icon="autorenew"
          title="Refreshing"
          message="Fetching campus updates..."
        />
      );
    }

    if (feedError) {
      return (
        <FeedStatusCard
          icon="wifi-off"
          title="Could not refresh post"
          // message={feedError}
          actionLabel="Try again"
          onAction={handleRetryFeed}
        />
      );
    }

    return (
      <FeedStatusCard
        icon="article"
        title="Nothing yet"
        message="No posts yet. Pull down to refresh."
      />
    );
  }, [feedError, handleRetryFeed, isFeedLoading, isFeedRefreshing, isInitialFeed, posts.length, searchText]);

  const feedFooterComponent = useMemo(() => {
    if (isInitialFeed) {
      return null;
    }

    if (!filteredPosts.length) {
      return null;
    }

    if (isPagingFeed) {
      return (
        <View style={styles.feedFooter}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      );
    }

    if (!hasMore) {
      return (
        <View style={styles.feedFooter}>

          {/* <View style={styles.feedFooterIcon}>
            <Ionicons name="checkmark-done-circle" size={40} color="#6699cc" />
          </View> */}
          <View style={styles.feedFooterTextWrapper}>
            <Text style={styles.feedFooterText}>You're all caught up</Text>
            <Text style={styles.feedFooterSubText}>Your new post will appear soon</Text>

          </View>
        </View>

      );
    }

    return null;
  }, [filteredPosts.length, hasMore, isInitialFeed, isPagingFeed]);

  const handleFeedListScroll = useCallback(
    event => {
      const y = event.nativeEvent.contentOffset.y;
      const diff = y - feedScrollOffsetRef.current;
      feedScrollOffsetRef.current = y;

      if (Math.abs(diff) < 6) {
        return;
      }

      if (diff > 0) {
        if (feedScrollDirectionRef.current !== 'down') {
          feedScrollDirectionRef.current = 'down';
          handleFeedScrollDirection('down');
        }
      } else if (diff < 0) {
        if (feedScrollDirectionRef.current !== 'up') {
          feedScrollDirectionRef.current = 'up';
          handleFeedScrollDirection('up');
        }
      }
    },
    [handleFeedScrollDirection],
  );

  const [commentingPostId, setCommentingPostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const showSaveFeedback = useCallback(message => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message);
    }
  }, []);

  const announcementTranslateY = announcementAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 0],
  });
  const announcementOpacity = announcementAnim;
  const announcementScale = announcementPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const announcementCount = announcements.length;
  const hasAnnouncements = announcementCount > 0;
  const activeAnnouncement = hasAnnouncements ? announcements[activeAnnouncementIndex] : null;

  const openAnnouncementsSheet = useCallback(() => {
    if (!announcementCount) return;

    setAnnouncementsSheetExpanded(true);
    stopAnnouncementAutoCycle();
    announcementsSheetAnim.stopAnimation();
    announcementsSheetAnim.setValue(0);
    setAnnouncementsSheetVisible(true);

    Animated.timing(announcementsSheetAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [announcementCount, announcementsSheetAnim, stopAnnouncementAutoCycle]);

  const closeAnnouncementsSheet = useCallback(() => {
    if (!isAnnouncementsSheetVisible) return;

    setAnnouncementsSheetExpanded(false);
    announcementsSheetAnim.stopAnimation();

    Animated.timing(announcementsSheetAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setAnnouncementsSheetVisible(false);
      startAnnouncementAutoCycle();
    });
  }, [announcementsSheetAnim, isAnnouncementsSheetVisible, startAnnouncementAutoCycle]);

  const toggleAnnouncementsSheet = useCallback(() => {
    if (isAnnouncementsSheetExpanded) {
      closeAnnouncementsSheet();
    } else {
      openAnnouncementsSheet();
    }
  }, [closeAnnouncementsSheet, isAnnouncementsSheetExpanded, openAnnouncementsSheet]);

  const updatePost = useCallback((postId, updateFn) => {
    setPosts(prev => prev.map(post => (post.id === postId ? updateFn(post) : post)));
  }, []);

  const updateFollowForUser = useCallback((userId, isFollowing) => {
    if (!userId) return;
    setPosts(prev =>
      prev.map(post =>
        post.userId === userId ? { ...post, isFollowing } : post,
      ),
    );
  }, []);

  const handleToggleFollow = useCallback(
    async post => {
      const userId = post?.userId;
      if (!userId) {
        return;
      }
      if (followLoadingByUser[userId]) {
        return;
      }

      const shouldFollow = !post?.isFollowing;
      setFollowLoadingByUser(prev => ({ ...prev, [userId]: true }));

      try {
        const res = shouldFollow
          ? await authService.followUser(userId)
          : await authService.unfollowUser(userId);

        if (res?.isSuccess) {
          updateFollowForUser(userId, shouldFollow);
        } else {
          const message = res?.message || 'Unable to update follow status.';
          if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.SHORT);
          } else {
            Alert.alert('Follow', message);
          }
        }
      } catch (error) {
        const message = error?.message || 'Unable to update follow status.';
        if (Platform.OS === 'android') {
          ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
          Alert.alert('Follow', message);
        }
      } finally {
        setFollowLoadingByUser(prev => ({ ...prev, [userId]: false }));
      }
    },
    [followLoadingByUser, updateFollowForUser],
  );

  const pendingLikeRequestsRef = useRef(new Set());

  const fetchCommentsForPost = useCallback(
    async (postId, page = 1) => {
      if (!postId) {
        return;
      }

      setIsCommentsLoading(true);
      setCommentsError(null);

      try {
        const response = await axiosClient.get(`posts/${postId}/comments`, {
          params: { page, limit: COMMENT_PAGE_SIZE },
        });


        const payload = response?.data?.data ?? response?.data ?? {};

        let rawComments = [];
        if (Array.isArray(payload)) {
          rawComments = payload;
        } else if (Array.isArray(payload.comments)) {
          rawComments = payload.comments;
        } else if (Array.isArray(payload.items)) {
          rawComments = payload.items;
        } else if (Array.isArray(payload.results)) {
          rawComments = payload.results;
        } else if (Array.isArray(payload.data)) {
          rawComments = payload.data;
        } else if (Array.isArray(payload.posts)) {
          rawComments = payload.posts;
        }

        const normalized = rawComments.map((comment, idx) => normalizeApiComment(comment, idx, postId));

        const totalCount =
          typeof payload.count === 'number'
            ? payload.count
            : typeof payload.total === 'number'
              ? payload.total
              : typeof payload.totalCount === 'number'
                ? payload.totalCount
                : typeof payload.remaining === 'number'
                  ? normalized.length + Math.max(0, payload.remaining)
                  : normalized.length;

        updatePost(postId, post => ({
          ...post,
          comments: normalized,
          commentsCount: totalCount,
          commentCount: totalCount,
        }));
      } catch (error) {
        console.warn('Failed to load comments:', error);
        setCommentsError(error?.response?.data?.message || error?.message || 'Unable to load comments.');
      } finally {
        setIsCommentsLoading(false);
      }
    },
    [updatePost],
  );

  const handleLike = useCallback(
    async postId => {
      if (!postId) {
        return;
      }

      const currentPost = postsRef.current.find(post => post.id === postId);
      if (!currentPost) {
        return;
      }

      // avoid overlapping like/unlike requests on the same post to keep counts in sync
      if (pendingLikeRequestsRef.current.has(postId)) {
        return;
      }
      pendingLikeRequestsRef.current.add(postId);

      const wasLiked = Boolean(currentPost.viewerHasLiked ?? currentPost.isLiked);
      const currentLikes = Number.isFinite(currentPost.likeCount)
        ? currentPost.likeCount
        : Number.isFinite(currentPost.likes)
          ? currentPost.likes
          : 0;

      const optimisticIsLiked = !wasLiked;
      const optimisticLikes = optimisticIsLiked
        ? currentLikes + 1
        : Math.max(0, currentLikes - 1);

      // optimistic UI update
      updatePost(postId, post => ({
        ...post,
        isLiked: optimisticIsLiked,
        viewerHasLiked: optimisticIsLiked,
        likes: optimisticLikes,
        likeCount: optimisticLikes,
      }));

      try {
        const response = optimisticIsLiked
          ? await axiosClient.post(`posts/${postId}/like`)
          : await axiosClient.delete(`posts/${postId}/like`);

        const isSuccess = response?.status >= 200 && response?.status < 300;
        if (!isSuccess) {
          throw new Error(response?.data?.message || 'Unable to update like right now.');
        }

        const serverState = extractServerLikeState(response?.data);

        // resync with server values if provided
        updatePost(postId, post => {
          const fallbackLikes = Number.isFinite(post.likeCount)
            ? post.likeCount
            : Number.isFinite(post.likes)
              ? post.likes
              : optimisticLikes;

          const resolvedLikes =
            serverState?.likes !== undefined ? coerceNumber(serverState.likes) : fallbackLikes;
          const resolvedIsLiked =
            typeof serverState?.isLiked === 'boolean' ? serverState.isLiked : optimisticIsLiked;

          return {
            ...post,
            likes: resolvedLikes,
            likeCount: resolvedLikes,
            isLiked: resolvedIsLiked,
            viewerHasLiked: resolvedIsLiked,
          };
        });
      } catch (error) {
        console.warn('Like request failed:', error?.message || error);
        updatePost(postId, () => currentPost);
        Alert.alert('Unable to update like', error?.message || 'Please try again.');
      } finally {
        pendingLikeRequestsRef.current.delete(postId);
      }
    },
    [updatePost],
  );

  const handleSave = useCallback(
    async postId => {
      if (!postId) {
        return;
      }

      const endpoint = `posts/${postId}/save`;
      const currentPost = postsRef.current.find(post => post.id === postId);

      if (!currentPost) {
        return;
      }

      const previousSnapshot = currentPost;
      const targetIsSaved = !currentPost.isSaved;

      // Optimistic toggle
      updatePost(postId, post => {
        return {
          ...post,
          isSaved: targetIsSaved,
          viewerState: {
            ...post.viewerState,
            isSaved: targetIsSaved,
          },
        };
      });

      try {
        const response = targetIsSaved
          ? await axiosClient.post(endpoint)
          : await axiosClient.delete(endpoint);

        const ok = response?.status >= 200 && response?.status < 300;

        if (!ok) {
          throw new Error(response?.data?.message || 'Unable to update save right now.');
        }

        const payload = response?.data?.data ?? response?.data ?? {};
        const payloadPost = payload?.post ?? payload?.data ?? payload?.resource ?? payload;
        const viewerState = payload?.viewerState ?? payloadPost?.viewerState ?? {};

        const resolvedIsSaved =
          typeof payload.viewerHasSaved === 'boolean'
            ? payload.viewerHasSaved
            : typeof payload.isSaved === 'boolean'
              ? payload.isSaved
              : typeof payload.saved === 'boolean'
                ? payload.saved
                : typeof viewerState.isSaved === 'boolean'
                  ? viewerState.isSaved
                  : typeof payloadPost?.isSaved === 'boolean'
                    ? payloadPost.isSaved
                    : undefined;

        const rawSaves =
          payloadPost?.metrics?.saves ??
          payloadPost?.metrics?.saveCount ??
          payload?.metrics?.saves ??
          payload?.metrics?.saveCount;
        const savesCount = Number.isFinite(Number(rawSaves)) ? Number(rawSaves) : null;

        const finalIsSaved = resolvedIsSaved !== undefined ? resolvedIsSaved : targetIsSaved;

        updatePost(postId, post => ({
          ...post,
          isSaved: finalIsSaved,
          viewerState: {
            ...post.viewerState,
            ...viewerState,
            isSaved: finalIsSaved,
          },
          ...(Number.isFinite(savesCount) ? { saves: savesCount, saveCount: savesCount } : null),
        }));
        showSaveFeedback(finalIsSaved ? 'Saved to bookmarks' : 'Removed from saved');
      } catch (error) {
        console.warn('Save request failed:', error?.message || error);
        if (previousSnapshot) {
          updatePost(postId, () => previousSnapshot);
        }
        Alert.alert('Unable to save', error?.message || 'Please try again.');
      }
    },
    [updatePost],
  );

  const handleRepost = useCallback(
    post => {
      const tabNavigatorKey = navigation?.getState?.()?.key;
      navigation.navigate('UploadScreen', {
        quotedPost: post,
        returnToKey: route?.key,
        returnToNavigatorKey: tabNavigatorKey,
      });
    },
    [navigation, route?.key],
  );

  const openCommentsModal = useCallback(
    postId => {
      setCommentingPostId(postId);
      setCommentText('');
      setCommentsError(null);
      fetchCommentsForPost(postId);
    },
    [fetchCommentsForPost],
  );

  const closeCommentsModal = useCallback(() => {
    setCommentingPostId(null);
    setCommentText('');
    setCommentsError(null);
    setIsCommentsLoading(false);
  }, []);

  const handleCommentSubmit = useCallback(async () => {
    if (!commentText.trim() || commentingPostId === null) {
      return;
    }

    const postId = commentingPostId;
    const text = commentText.trim();
    const optimisticId = `${postId}-comment-${Date.now()}`;
    let previousSnapshot = null;

    setCommentsError(null);
    setCommentText('');

    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) {
          return post;
        }
        const commentsList = Array.isArray(post.comments) ? post.comments : [];
        const baseCount = Number.isFinite(post.commentsCount)
          ? post.commentsCount
          : Number.isFinite(post.commentCount)
            ? post.commentCount
            : commentsList.length;
        previousSnapshot = {
          comments: commentsList,
          commentsCount: baseCount,
          commentCount: baseCount,
        };
        const optimisticComment = {
          id: optimisticId,
          text,
          createdAt: new Date().toISOString(),
          liked: false,
          optimistic: true,
        };
        const nextCount = baseCount + 1;
        return {
          ...post,
          commentsCount: nextCount,
          commentCount: nextCount,
          comments: [...commentsList, optimisticComment],
        };
      }),
    );

    try {
      const response = await axiosClient.post(`posts/${postId}/comments`, {
        content: text,
        text,
      });


      const responsePayload =
        response?.data?.data?.comment ??
        response?.data?.comment ??
        response?.data?.data ??
        response?.data;

      const serverCountCandidates = [
        response?.data?.data?.commentsCount,
        response?.data?.data?.commentCount,
        response?.data?.data?.count,
        response?.data?.data?.total,
        response?.data?.data?.totalCount,
        response?.data?.count,
        response?.data?.total,
        response?.data?.totalCount,
      ];
      const serverCommentCount = serverCountCandidates.find(value => typeof value === 'number');

      updatePost(postId, post => {
        const commentsList = Array.isArray(post.comments) ? post.comments : [];
        const filtered = commentsList.filter(comment => comment.id !== optimisticId);
        const normalizedComment = normalizeApiComment(
          responsePayload && typeof responsePayload === 'object'
            ? responsePayload
            : { id: `${postId}-${Date.now()}`, content: text, createdAt: new Date().toISOString() },
          filtered.length,
          postId,
        );

        const fallbackCount = Number.isFinite(post.commentsCount)
          ? post.commentsCount
          : Number.isFinite(post.commentCount)
            ? post.commentCount
            : filtered.length + 1;

        return {
          ...post,
          comments: [...filtered, normalizedComment],
          commentsCount:
            typeof serverCommentCount === 'number' ? serverCommentCount : fallbackCount,
          commentCount:
            typeof serverCommentCount === 'number' ? serverCommentCount : fallbackCount,
        };
      });
    } catch (error) {
      console.warn('Failed to post comment:', error);
      setCommentsError(error?.response?.data?.message || error?.message || 'Unable to post comment.');
      setCommentText(text);
      if (previousSnapshot) {
        updatePost(postId, post => ({
          ...post,
          comments: previousSnapshot.comments,
          commentsCount: previousSnapshot.commentsCount,
          commentCount: previousSnapshot.commentCount,
        }));
      }
      Alert.alert('Unable to post comment', error?.message || 'Please try again in a moment.');
    }
  }, [commentText, commentingPostId, updatePost]);

  const toggleCommentLike = useCallback(
    commentIdx => {
      if (commentingPostId === null) return;

      setPosts(prev =>
        prev.map(post => {
          if (post.id !== commentingPostId) return post;
          const commentsList = Array.isArray(post.comments) ? post.comments : [];
          const updated = commentsList.map((c, idx) => (idx === commentIdx ? { ...c, liked: !c.liked } : c));
          return { ...post, comments: updated };
        }),
      );
    },
    [commentingPostId],
  );

  const handleFabPress = useCallback(() => {
    const tabNavigatorKey = navigation?.getState?.()?.key;
    navigation.navigate('UploadScreen', {
      returnToKey: route?.key,
      returnToNavigatorKey: tabNavigatorKey,
    });
  }, [navigation, route?.key]);

  const handlePreviewMedia = useCallback(mediaItem => {
    setPreviewMedia(mediaItem);
  }, []);

  const closePreviewMedia = useCallback(() => {
    setPreviewMedia(null);
  }, []);

  const renderPostItem = useCallback(
    ({ item }) => {
      if (item?.__skeleton) {
        return <FeedSkeletonCard />;
      }
      const isOwnPost =
        currentUserId != null &&
        item?.userId != null &&
        String(item.userId) === String(currentUserId);
      return (
        <PostCard
          item={item}
          onLike={handleLike}
          onSave={handleSave}
          onCommentPress={openCommentsModal}
          // onPreviewMedia={handlePreviewMedia}
          onRepost={handleRepost}
          onToggleFollow={handleToggleFollow}
          isFollowLoading={Boolean(item?.userId && followLoadingByUser[item.userId])}
          isOwnPost={isOwnPost}
        />
      );
    },
    [
      currentUserId,
      followLoadingByUser,
      handleLike,
      handleSave,
      handlePreviewMedia,
      handleRepost,
      handleToggleFollow,
      openCommentsModal,
    ],
  );

  const feedKeyExtractor = useCallback(
    item => (item?.__skeleton ? item.id : getFeedItemKey(item)),
    [],
  );

  /** ⬇️ this header is now passed into FlatList so it scrolls with content */
  const renderAnnouncementHeader = useCallback(() => {
    const isAnnouncementLoading = isAnnouncementsLoading && !hasAnnouncements;
    const shouldShowAnnouncements = (hasAnnouncements || isAnnouncementLoading) && shouldRenderAnnouncement;
    const showSuccess = Boolean(uploadSuccessMessage);

    if (!shouldShowAnnouncements && !showSuccess) {
      return null;
    }

    const accentColor = activeAnnouncement?.accentColor || '#2563EB';
    const announcementCountText = isAnnouncementLoading ? 'Loading' : `${announcementCount} live`;
    const announcementTitle = activeAnnouncement?.title || (isAnnouncementLoading ? 'Fetching announcements...' : 'Campus update');
    const announcementSummary =
      activeAnnouncement?.summary || (isAnnouncementLoading ? 'Pulling the latest updates for you.' : '');

    return (
      <View style={styles.simpleAnnouncementContainer}>
        {showSuccess ? (
          <View style={styles.successBanner}>
            <MaterialIcons name="check-circle" size={20} color="#0f5132" style={styles.successBannerIcon} />
            <Text style={styles.successBannerText}>{uploadSuccessMessage}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Dismiss upload success message"
              onPress={dismissUploadSuccessMessage}
              style={styles.successBannerClose}
            >
              <MaterialIcons name="close" size={18} color="#0f5132" />
            </TouchableOpacity>
          </View>
        ) : null}

        {shouldShowAnnouncements ? (
          <Animated.View
            style={[styles.announcementChipCard, { borderColor: accentColor, transform: [{ scale: announcementScale }] }]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={openAnnouncementsSheet}
              style={styles.announcementChipTouchable}
            >
              <LinearGradient
                colors={['#0b1224', '#0f172a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.announcementChipBody}
              >
                <View style={styles.announcementChipLeft}>
                  <View style={[styles.announcementChipDot, { backgroundColor: accentColor }]} />
                  <View style={styles.announcementChipCopy}>
                    <View style={styles.announcementChipTagRow}>
                      <Text style={styles.announcementChipLabel}>Announcements</Text>
                      {activeAnnouncement?.tag ? (
                        <View style={styles.announcementChipTag}>
                          <MaterialIcons name="campaign" size={14} color="#0b1224" />
                          <Text style={styles.announcementChipTagText}>{activeAnnouncement.tag}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.announcementChipTitle} numberOfLines={2}>
                      {announcementTitle}
                    </Text>
                    {announcementSummary ? (
                      <Text style={styles.announcementChipSummary} numberOfLines={2}>
                        {announcementSummary}
                      </Text>
                    ) : null}
                    <View style={styles.announcementChipMetaRow}>
                      {!isAnnouncementLoading && activeAnnouncement?.schedule ? (
                        <View style={styles.announcementMetaChip}>
                          <MaterialIcons name="event" size={14} color="#E8EEFF" />
                          <Text style={styles.announcementMetaChipText}>{activeAnnouncement.schedule}</Text>
                        </View>
                      ) : null}
                      {!isAnnouncementLoading && activeAnnouncement?.location ? (
                        <View style={styles.announcementMetaChip}>
                          <MaterialIcons name="place" size={14} color="#E8EEFF" />
                          <Text style={styles.announcementMetaChipText}>{activeAnnouncement.location}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={styles.announcementChipRight}>
                  <View style={styles.announcementChipCount}>
                    <MaterialIcons name="auto-graph" size={16} color="#E8EEFF" />
                    <Text style={styles.announcementChipCountText}>{announcementCountText}</Text>
                  </View>
                  <View style={[styles.announcementChipCta, { backgroundColor: accentColor }]}>
                    <Text style={styles.announcementChipCtaText}>
                      {activeAnnouncement?.ctaLabel || 'See details'}
                    </Text>
                    <MaterialIcons name="arrow-forward" size={16} color="#0b1224" />
                  </View>
                  <View style={styles.announcementChipDots}>
                    {isAnnouncementLoading ? (
                      <ActivityIndicator size="small" color="#E8EEFF" />
                    ) : (
                      announcements.map((_, idx) => {
                        const isActive = idx === activeAnnouncementIndex;
                        return (
                          <View
                            key={`announcement-progress-${idx}`}
                            style={[
                              styles.announcementProgressDot,
                              isActive && [styles.announcementProgressDotActive, { backgroundColor: accentColor }],
                            ]}
                          />
                        );
                      })
                    )}
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </View>
    );
  }, [
    activeAnnouncement,
    activeAnnouncementIndex,
    announcementScale,
    announcementCount,
    announcements,
    dismissUploadSuccessMessage,
    hasAnnouncements,
    isAnnouncementsLoading,
    openAnnouncementsSheet,
    shouldRenderAnnouncement,
    uploadSuccessMessage,
  ]);

  //const announcementHeader = useMemo(() => renderAnnouncementHeader(), [renderAnnouncementHeader]);
  const announcementHeader = useMemo(() => renderAnnouncementHeader(), [renderAnnouncementHeader]);

  const activeCommentPost = commentingPostId ? posts.find(post => post.id === commentingPostId) : null;
  const activeCommentTotalRaw =
    typeof activeCommentPost?.commentsCount === 'number'
      ? activeCommentPost.commentsCount
      : typeof activeCommentPost?.commentCount === 'number'
        ? activeCommentPost.commentCount
        : Array.isArray(activeCommentPost?.comments)
          ? activeCommentPost.comments.length
          : null;
  const commentsModalTitle =
    activeCommentTotalRaw != null ? `Comments (${normalizeCount(activeCommentTotalRaw)})` : 'Comments';

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Modal
        visible={isAnnouncementsSheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeAnnouncementsSheet}
      >
        <TouchableWithoutFeedback onPress={closeAnnouncementsSheet}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[styles.announcementSheet, { transform: [{ translateY: announcementsSheetAnimTranslateY }] }]}
              >
                <View style={styles.announcementSheetHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Campus announcements</Text>
                    <Text style={styles.sheetSubtitle}>
                      {isAnnouncementsLoading && !hasAnnouncements
                        ? 'Loading updates...'
                        : `${announcementCount} active updates`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeAnnouncementsSheet}>
                    <MaterialIcons name="close" size={24} color="#1F2937" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.announcementSheetList} showsVerticalScrollIndicator={false}>
                  {isAnnouncementsLoading && !hasAnnouncements ? (
                    <View style={styles.announcementSheetEmpty}>
                      <ActivityIndicator size="small" color="#2563EB" />
                      <Text style={styles.announcementSheetEmptyText}>Loading announcements...</Text>
                    </View>
                  ) : announcements.length ? (
                    announcements.map(item => (
                      <View key={item.id} style={styles.announcementSheetCard}>
                        <Text style={styles.announcementSheetTitle}>{item.title}</Text>
                        {item.schedule ? (
                          <Text style={styles.announcementSheetMeta}>{item.schedule}</Text>
                        ) : null}
                        <Text style={styles.announcementSheetBody}>{item.details || item.summary}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.announcementSheetEmpty}>
                      <Text style={styles.announcementSheetEmptyText}>
                        {announcementsError || 'No announcements yet.'}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {announcementHeader}

      <View style={styles.tabContainer}>
        <FlatList
          data={listData}
          keyExtractor={feedKeyExtractor}
          renderItem={renderPostItem}
          contentContainerStyle={styles.feedContent}
          ListEmptyComponent={feedEmptyComponent}
          ListFooterComponent={feedFooterComponent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={80}
          windowSize={9}
          refreshing={isFeedRefreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      </View>

      <Modal
        visible={commentingPostId !== null}
        animationType="slide"
        transparent
        onRequestClose={closeCommentsModal}
      >
        <TouchableWithoutFeedback onPress={closeCommentsModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalBottomSheet}>
                <Text style={styles.modalTitle}>{commentsModalTitle}</Text>
                <ScrollView style={styles.commentsList}>
                  {(() => {
                    if (commentingPostId === null) return null;
                    const post = activeCommentPost;
                    if (!post) return <Text style={styles.empty}>No post found.</Text>;

                    const commentsList = Array.isArray(post.comments) ? post.comments : [];

                    if (isCommentsLoading) {
                      return (
                        <View style={styles.commentsLoadingState}>
                          <ActivityIndicator size="small" color="#2563EB" />
                          <Text style={styles.commentsLoadingText}>Loading comments...</Text>
                        </View>
                      );
                    }

                    if (commentsError) {
                      return <Text style={styles.noComments}>{commentsError}</Text>;
                    }

                    if (commentsList.length === 0) {
                      return <Text style={styles.noComments}>No comments yet. Be the first!</Text>;
                    }

                    return commentsList.map((comment, idx) => {
                      const timestamp = comment?.createdAt ? moment(comment.createdAt).fromNow() : 'Just now';
                      return (
                        <View key={comment.id || idx} style={styles.commentItem}>
                          <Icon name="user" size={20} color="#98A2B3" />
                          <View style={styles.commentCopy}>
                            <Text style={styles.commentText}>{comment.text}</Text>
                            <View style={styles.commentMeta}>
                              <Text style={styles.commentTimestamp}>{timestamp}</Text>
                              <TouchableOpacity onPress={() => toggleCommentLike(idx)} style={styles.commentLike}>
                                <Fontaw
                                  name={comment.liked ? 'heart' : 'heart-o'}
                                  size={16}
                                  color={comment.liked ? '#EF4444' : '#98A2B3'}
                                  style={styles.commentLikeIcon}
                                />
                                <Text
                                  style={[
                                    styles.commentLikeText,
                                    comment.liked && styles.commentLikeTextActive,
                                  ]}
                                >
                                  {comment.liked ? 'Liked' : 'Like'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    });
                  })()}
                </ScrollView>

                <View style={styles.commentInputRow}>
                  <TextInput
                    placeholder="Write a comment..."
                    value={commentText}
                    onChangeText={setCommentText}
                    style={styles.commentInput}
                    multiline
                  />
                  <TouchableOpacity
                    onPress={handleCommentSubmit}
                    disabled={!commentText.trim()}
                    style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
                  >
                    <MaterialIcons name="send" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={!!previewMedia}
        animationType="fade"
        transparent
        onRequestClose={closePreviewMedia}
      >
        <TouchableWithoutFeedback onPress={closePreviewMedia}>
          <View style={styles.previewOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.previewContent}>
                <TouchableOpacity style={styles.previewClose} onPress={closePreviewMedia}>
                  <MaterialIcons name="close" size={26} color="#ffffff" />
                </TouchableOpacity>
                {previewMedia?.type === 'video' ? (
                  <Video
                    source={{ uri: previewMedia.uri }}
                    style={styles.previewMedia}
                    controls
                    resizeMode="contain"
                    paused={!previewMedia?.autoplay}
                  />
                ) : (
                  <Image source={{ uri: previewMedia?.uri }} style={styles.previewMedia} resizeMode='cover' />
                )}
                {/* {previewMedia?.postContent ? (
                  <Text style={styles.previewCaption}>{previewMedia.postContent}</Text>
                ) : null} */}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.75}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F6FB',
  },
  headerContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  simpleAnnouncementContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#F3F6FB',
  },
  announcementChipCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
    backgroundColor: '#0b1224',
  },
  announcementChipTouchable: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  announcementChipBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  announcementChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  announcementChipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
  },
  announcementChipCopy: {
    flex: 1,
    gap: 5,
  },
  announcementChipTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  announcementChipLabel: {
    color: '#E8EEFF',
    fontSize: 11,
    letterSpacing: 0.6,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  announcementChipTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  announcementChipTagText: {
    color: '#0b1224',
    fontWeight: '700',
    fontSize: 11,
    marginLeft: 5,
  },
  announcementChipTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F9FAFB',
    lineHeight: 20,
  },
  announcementChipSummary: {
    fontSize: 12.5,
    color: 'rgba(232,238,255,0.88)',
    lineHeight: 17,
  },
  announcementChipMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  announcementChipRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  announcementChipCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  announcementChipCountText: {
    color: '#E8EEFF',
    fontWeight: '700',
    fontSize: 12,
  },
  announcementChipCta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    shadowColor: '#0f172a',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  announcementChipCtaText: {
    color: '#0b1224',
    fontWeight: '800',
    fontSize: 11.5,
    marginRight: 5,
  },
  announcementChipDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
  },
  announcementProgressDot: {
    width: 12,
    height: 3.5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  announcementProgressDotActive: {
    height: 4,
  },
  announcementCard: {
    borderRadius: 18,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  announcementTouchable: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  simpleAnnouncementBar: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  announcementHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  announcementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  announcementBadgeText: {
    color: '#0b1224',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  announcementCountPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  announcementCountText: {
    color: '#E8EEFF',
    fontWeight: '700',
    fontSize: 12,
  },
  simpleAnnouncementCopy: {
    flex: 1,
  },
  simpleAnnouncementTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F9FAFB',
    lineHeight: 22,
  },
  simpleAnnouncementText: {
    fontSize: 13,
    color: 'rgba(232,238,255,0.92)',
    marginTop: 6,
    lineHeight: 19,
  },
  announcementMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  announcementMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  announcementMetaChipText: {
    color: '#E8EEFF',
    fontSize: 12.5,
    fontWeight: '600',
    marginLeft: 6,
  },
  announcementCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  announcementCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  announcementCtaText: {
    fontWeight: '800',
    fontSize: 13,
    marginRight: 8,
  },
  announcementHint: {
    color: 'rgba(232,238,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf3',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  successBannerIcon: {
    marginRight: 10,
  },
  successBannerText: {
    flex: 1,
    color: '#065f46',
    fontSize: 14,
    fontWeight: '600',
  },
  successBannerClose: {
    marginLeft: 10,
    padding: 6,
  },
  announcementContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  announcementHeroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  announcementHeroTouchable: {
    borderRadius: 20,
  },
  announcementHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  announcementHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  announcementHeroTitleArea: {
    flex: 1,
  },
  announcementHeroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  announcementHeroTagText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  announcementTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  announcementText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  subheader: {
    fontSize: 14,
    color: '#667085',
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 16,
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14.5,
    color: '#1F2937',
  },
  filterRow: {
    paddingVertical: 14,
    gap: 10,
  },
  filterChip: {
    backgroundColor: '#EAF0F6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EAF0F6',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475467',
  },
  announcementMetaBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  announcementMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  announcementMetaText: {
    marginLeft: 6,
    color: '#e2e8f0',
    fontSize: 12.5,
    fontWeight: '500',
  },
  announcementSummary: {
    marginTop: 14,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  announcementDetailSnippet: {
    color: '#b8bee5',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  announcementActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  announcementPrimaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flex: 1,
  },
  announcementPrimaryActionText: {
    color: '#0b1120',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  announcementSecondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  announcementSecondaryActionText: {
    color: '#c7cbe6',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  announcementDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
    justifyContent: 'center',
  },
  announcementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(148,163,184,0.5)',
  },
  announcementDotActive: {
    width: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
  },
  announcementChipRow: {
    marginTop: 14,
    paddingHorizontal: 4,
  },
  announcementTopicChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 10,
  },
  announcementTopicChipText: {
    color: '#c3c6e8',
    fontWeight: '600',
    fontSize: 13,
    maxWidth: 200,
  },
  tabContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  tabWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#fff',
  },
  tabBar: {
    backgroundColor: '#2563EB',
    marginBottom: 6,
    borderRadius: 26,
    elevation: 0,
    padding: 4,
  },
  tabStyle: {
    width: 'auto',
    flex: 1,
  },
  tabIndicator: {
    backgroundColor: 'transparent',
  },
  tabLabelContainer: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  announcementExpandButton: {
    backgroundColor: 'rgba(15,23,42,0.25)',
    borderRadius: 16,
    padding: 6,
  },
  announcementAutoContent: {},
  feedContent: {
    flexGrow: 1,
    paddingBottom: 120,
    paddingTop: 12,
  },
  feedStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    minHeight: 320,
  },
  card: {
    marginHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E7EC',
  },
  skeletonCard: {
    paddingBottom: 20,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
    gap: 12,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E4E7EC',
  },
  skeletonHeaderText: {
    flex: 1,
    gap: 8,
  },
  skeletonLineMedium: {
    height: 12,
    borderRadius: 8,
    backgroundColor: '#E4E7EC',
  },
  skeletonLineTiny: {
    height: 10,
    borderRadius: 8,
    width: '40%',
    backgroundColor: '#E4E7EC',
  },
  skeletonLineFull: {
    height: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#E4E7EC',
  },
  skeletonMedia: {
    height: MEDIA_HEIGHT,
    borderRadius: 18,
    marginHorizontal: 16,
    backgroundColor: '#E4E7EC',
  },
  skeletonActionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  skeletonChip: {
    height: 30,
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#E4E7EC',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    //paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  profilePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    fontSize: 15.5,
    color: '#1F2937',
  },
  userMeta: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  moreButton: {
    padding: 6,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 6,
  },
  button: {
    backgroundColor: "#EEF2FF",
    padding: 4,
    borderRadius: 8,
    width: "30%",

  },
  buttonActive: {
    backgroundColor: "#2563EB",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center"
  },
  buttonTextActive: {
    color: "#ffffff",
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  postContent: {
    fontSize: 14.5,
    color: '#475467',
    lineHeight: 21,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    paddingVertical: 2,
    paddingRight: 10,
  },
  tagText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  carouselWrapper: {
    marginTop: 16,
    alignItems: 'center',
  },
  mediaSlide: {
    width: MEDIA_WIDTH,
    paddingHorizontal: 0,
  },
  mediaContentContainer: {
    paddingHorizontal: 0,
  },
  mediaAsset: {
    height: MEDIA_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    position: 'relative',
    margin: 4
    // borderWidth: 1,
    //borderColor: 'rgba(255,255,255,0.08)',
  },
  mediaImage: {
    width: '100%',
    height: '100%',

  },
  doubleTapHeart: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111b32',
  },
  mediaFallbackText: {
    color: '#cbd5f5',
    fontSize: 12,
    marginTop: 6,
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    top: 0,
    left: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  imageOverlayHint: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
  },
  mediaExpand: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14,
    padding: 6,
  },
  carouselCounter: {
    position: 'absolute',
    top: 28,
    right: 32,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  carouselCounterText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  carouselDots: {
    position: 'absolute',
    bottom: 26,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  dotActive: {
    width: 16,
    backgroundColor: '#fff',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 12.5,
    color: '#94A3B8',
  },
  cardDivider: {
    // height: 1,
    // backgroundColor: '#EEF1F5',
    // marginHorizontal: 16,
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    // paddingTop: 12,
    //paddingBottom:12

    padding: 5,

  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  repostActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  repostActionActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  actionText: {
    fontSize: 14,
    color: '#475467',
    fontWeight: '500',
  },
  actionTextActive: {
    color: '#2563EB',
  },
  statusCard: {
    marginHorizontal: 24,
    marginTop: 32,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  statusTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#475467',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusAction: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  statusActionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    padding: 24,
    color: 'black',
    fontSize: 15,
  },
  feedFooter: {

    padding: 5,
    marginTop: 10,
    flexDirection: "row",
    alignItems: 'center',
    justifyContent: 'center',


  },
  feedFooterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
    maxWidth: 360,
    // shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 9,
  },
  feedFooterIcon: {
    width: 50,
    height: 50,
    borderRadius: 30,

    // borderColor: 'rgba(255,255,255,0.5)',
    //  backgroundColor: 'rgba(85, 70, 171, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  feedFooterTextWrapper: {
    flex: 1,
  },
  feedFooterText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: "center"
  },
  feedFooterSubText: {
    color: 'rgba(168, 164, 164, 0.85)',
    fontSize: 14,
    marginTop: 2,
    textAlign: "center"
  },
  noComments: {
    textAlign: 'center',
    color: '#98A2B3',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 16,
  },
  announcementSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  announcementSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#667085',
    marginTop: 4,
  },
  announcementSheetList: {
    maxHeight: '90%',
    paddingBottom: 6,
  },
  announcementSheetEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  announcementSheetEmptyText: {
    color: '#667085',
    fontSize: 13.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  announcementSheetCard: {
    backgroundColor: '#F8FAFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  announcementSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  announcementSheetMeta: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  announcementSheetBody: {
    marginTop: 8,
    fontSize: 13.5,
    color: '#475467',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1F2937',
  },
  commentsList: {
    maxHeight: 280,
    marginBottom: 12,
  },
  commentsLoadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  commentsLoadingText: {
    marginTop: 8,
    color: '#98A2B3',
    fontSize: 13,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomColor: '#E4E7EC',
    borderBottomWidth: 1,
  },
  commentCopy: {
    flex: 1,
    marginLeft: 10,
  },
  commentText: {
    fontSize: 14,
    color: '#344054',
    lineHeight: 20,
  },
  commentMeta: {
    flexDirection: 'row',
    marginTop: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentTimestamp: {
    color: '#98A2B3',
    fontSize: 12.5,
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentLikeIcon: {
    marginRight: 4,
  },
  commentLikeText: {
    color: '#98A2B3',
    fontSize: 12.5,
  },
  commentLikeTextActive: {
    color: '#EF4444',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
    color: '#344054',
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#2563EB',
    borderRadius: 22,
    padding: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5F5',
  },
  previewOverlay: {
    flex: 1,
    // backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    // paddingHorizontal: 20,
    margin: 5
  },
  previewContent: {
    backgroundColor: '#12131b',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  previewClose: {
    alignSelf: 'flex-end',
    marginBottom: 4
  },
  previewTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  previewMedia: {
    width: '100%',
    height: screenWidth * 0.6,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  previewCaption: {
    marginTop: 12,
    color: '#667085',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    backgroundColor: '#2563EB',
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
});



