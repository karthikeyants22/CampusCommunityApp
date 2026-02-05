


import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Linking,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import authService from '../Authentication/authService';
import { absolutizeMediaUrl, buildMediaUrlFromKey } from '../Common/mediaUtils';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const EMOJI_PALETTE = [
  '😀','😄','😁','😊','😍','🥰','🤩','😉','😎','😇',
  '🤔','😌','😴','😅','😂','🤣','🙃','🤗','😋','😜',
  '❤️','💛','💙','💜','🖤','🤍','✨','🌟','🔥','⚡',
  '📚','📝','💻','📱','📅','📌','📍','💡','🎒','☕',
  '🍕','🍔','🍟','🍩','🍎','🍇','🌞','🌙','☁️','🌈',
    '😢','😭','😕','🙁','☹️','😩','😣',
];
// const EMOJI_PALETTE = ['😀', '🤩', '🔥', '🎉', '💡', '📣', '❤️', '🙌', '✨', '🧠', '📸', '🌟'];
const TRENDING_HASHTAGS = ['CampusLife', 'Events', 'Highlights', 'Opportunities', 'Community', 'Clubs'];
const FEATURED_MENTIONS = [
  { id: 'studenthub', label: 'Student Hub', handle: 'studenthub' },
  { id: 'careercenter', label: 'Career Center', handle: 'careercenter' },
  { id: 'clubslead', label: 'Clubs Lead', handle: 'clubslead' },
  { id: 'campusadmin', label: 'Campus Admin', handle: 'campusadmin' },
];

const isVideo = item =>
  (item?.mime && item.mime.startsWith('video')) ||
  (item?.path && /\.(mp4|mov|avi|mkv)$/i.test(item.path));

// Builds a permission list tailored to the requested actions and Android release.
const createAndroidPermissionSet = (version, intents) => {
  const permissions = new Set();

  const canUse = key => Boolean(key) && typeof key === 'string';

  if (intents.includes('camera')) {
    permissions.add(PermissionsAndroid.PERMISSIONS.CAMERA);
  }

  if (intents.includes('audio')) {
    permissions.add(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  }

  if (intents.includes('library')) {
    const readMediaImages = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
    const readMediaVideo = PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO;
    const readExternal = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const writeExternal = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;

    if (version >= 33 && canUse(readMediaImages) && canUse(readMediaVideo)) {
      permissions.add(readMediaImages);
      permissions.add(readMediaVideo);
    } else if (canUse(readExternal)) {
      permissions.add(readExternal);

      if (version <= 28 && canUse(writeExternal)) {
        permissions.add(writeExternal);
      }
    }
  }

  return Array.from(permissions).filter(Boolean);
};

const requestAndroidPermissions = async (version, intents) => {
  const required = createAndroidPermissionSet(version, intents);
  if (!required.length) {
    return { granted: true, blocked: [] };
  }

  const toRequest = [];
  const alreadyBlocked = [];

  for (const key of required) {
    const has = await PermissionsAndroid.check(key);
    if (!has) {
      toRequest.push(key);
    }
  }

  if (!toRequest.length) {
    return { granted: true, blocked: [] };
  }

  const result = await PermissionsAndroid.requestMultiple(toRequest);
  const denied = [];
  for (const key of toRequest) {
    if (result[key] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      alreadyBlocked.push(key);
    } else if (result[key] !== PermissionsAndroid.RESULTS.GRANTED) {
      denied.push(key);
    }
  }

  const allOk = denied.length === 0 && alreadyBlocked.length === 0;
  return { granted: allOk, blocked: alreadyBlocked, denied };
};

const OptionButton = ({ icon, label, description, onPress, isLast, disabled }) => (
  <TouchableOpacity
    style={[
      styles.optionButton,
      isLast && styles.optionButtonLast,
      disabled && styles.optionButtonDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.85}
  >
    <View style={styles.optionIconWrapper}>
      <Ionicons name={icon} size={26} color="#3b4cca" />
    </View>
    <View style={styles.optionCopy}>
      <Text style={styles.optionLabel}>{label}</Text>
      <Text style={styles.optionDescription}>{description}</Text>
    </View>
    <Feather name="chevron-right" size={20} color="#8b91a1" />
  </TouchableOpacity>
);

const UploadScreenOption = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const returnToKey = route?.params?.returnToKey;
  const returnToNavigatorKey = route?.params?.returnToNavigatorKey;
  const quotedPost = route?.params?.quotedPost;
  const [media, setMedia] = useState([]);
  const [caption, setCaption] = useState('');
  const [captionSelection, setCaptionSelection] = useState({ start: 0, end: 0 });
  const captionSelectionRef = useRef({ start: 0, end: 0 });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeSuggestionType, setActiveSuggestionType] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [celebration, setCelebration] = useState(false);
  const noticeTimer = useRef(null);
  const celebrationTimer = useRef(null);
  const redirectTimer = useRef(null);

  const showNotice = useCallback((type, title, message) => {
    if (noticeTimer.current) {
      clearTimeout(noticeTimer.current);
    }
    setNotice({ type, title, message });
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const triggerCelebration = useCallback(() => {
    if (celebrationTimer.current) {
      clearTimeout(celebrationTimer.current);
    }
    setCelebration(true);
    celebrationTimer.current = setTimeout(() => setCelebration(false), 2400);
  }, []);

  const redirectToHome = useCallback((delayMs = 5000, homeParams = undefined) => {
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
    }

    redirectTimer.current = setTimeout(() => {
      const tabParams = homeParams ? { screen: 'Home', params: homeParams } : { screen: 'Home' };
      if (navigation?.reset) {
        navigation.navigate({
          index: 0,
          routes: [{ name: 'MainTabs', params: tabParams }],
        });
      } else {
        navigation?.navigate?.('MainTabs', tabParams);
      }
    }, delayMs);
  }, [navigation]);

  const quotedPreview = useMemo(() => {
    if (!quotedPost) {
      return null;
    }

    const attachments = Array.isArray(quotedPost.attachments) ? quotedPost.attachments : [];
    const media = Array.isArray(quotedPost.media) ? quotedPost.media : [];
    const mediaItem = attachments.find(Boolean) || media.find(Boolean);
    if (!mediaItem) {
      return null;
    }

    const objectKey =
      mediaItem?.metadata?.r2Key ||
      mediaItem?.metadata?.objectKey ||
      mediaItem?.r2Key ||
      mediaItem?.objectKey;
    const fallbackUrl = mediaItem?.url || mediaItem?.uri || mediaItem?.path;
    const url =
      (objectKey && absolutizeMediaUrl(buildMediaUrlFromKey(objectKey))) ||
      absolutizeMediaUrl(fallbackUrl) ||
      null;

    if (!url) {
      return null;
    }
    return {
      uri: url,
      type:
        mediaItem?.type ||
        mediaItem?.mediaType ||
        mediaItem?.metadata?.type ||
        (mediaItem?.mime || '').split('/')[0],
    };
  }, [quotedPost]);

  const quotedAuthor =
    quotedPost?.authorName ||
    quotedPost?.user?.name ||
    quotedPost?.createdBy?.name ||
    quotedPost?.name ||
    'Original post';
  const quotedText = (quotedPost?.content || quotedPost?.body || quotedPost?.rawContent || '').trim();

  const handleCaptionSelectionChange = useCallback(event => {
    const selection = event?.nativeEvent?.selection ?? { start: 0, end: 0 };
    captionSelectionRef.current = selection;
    setCaptionSelection(selection);
  }, []);

  const insertTokenAtCursor = useCallback((token, { ensureLeadingSpace = false, ensureTrailingSpace = true } = {}) => {
    let nextSelection = null;
    setCaption(prev => {
      const selection = captionSelectionRef.current || { start: prev.length, end: prev.length };
      const start = Math.max(0, Math.min(selection.start, prev.length));
      const end = Math.max(0, Math.min(selection.end, prev.length));
      const before = prev.slice(0, start);
      const after = prev.slice(end);

      const needsLeadingSpace = ensureLeadingSpace && before && !before.endsWith(' ');
      const needsTrailingSpace = ensureTrailingSpace && after && !after.startsWith(' ');

      const insertion = `${needsLeadingSpace ? ' ' : ''}${token}${needsTrailingSpace ? ' ' : ''}`;
      const result = `${before}${insertion}${after}`;
      const cursor = before.length + insertion.length;
      nextSelection = { start: cursor, end: cursor };
      return result;
    });

    if (nextSelection) {
      captionSelectionRef.current = nextSelection;
      setCaptionSelection(nextSelection);
    }
  }, []);

  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
    setActiveSuggestionType(null);
  }, []);

  const toggleSuggestionPanel = useCallback(type => {
    setActiveSuggestionType(prev => (prev === type ? null : type));
    setShowEmojiPicker(false);
  }, []);

  const handleEmojiInsert = useCallback(
    emoji => {
      insertTokenAtCursor(emoji, { ensureLeadingSpace: true });
    },
    [insertTokenAtCursor],
  );

  const handleInsertHashtag = useCallback(
    tag => {
      insertTokenAtCursor(`#${tag}`, { ensureLeadingSpace: true });
      setActiveSuggestionType(null);
    },
    [insertTokenAtCursor],
  );

  const handleInsertMention = useCallback(
    mention => {
      insertTokenAtCursor(`@${mention.handle}`, { ensureLeadingSpace: true });
      setActiveSuggestionType(null);
    },
    [insertTokenAtCursor],
  );

  useEffect(() => {
    return () => {
      if (noticeTimer.current) {
        clearTimeout(noticeTimer.current);
      }
      if (celebrationTimer.current) {
        clearTimeout(celebrationTimer.current);
      }
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  const androidVersion = useMemo(
    () => (Platform.OS === 'android' ? Number(Platform.Version) || 0 : 0),
    [],
  );

  const ensurePermissions = useCallback(
    async intents => {
      if (Platform.OS !== 'android') {
        return true;
      }

      try {
        const { granted, blocked } = await requestAndroidPermissions(androidVersion, intents);
        if (granted) {
          return true;
        }

        if (blocked.length) {
          showNotice(
            'warning',
            'Permission blocked',
            'Please enable camera/microphone/media access in Settings to continue.',
          );
          Linking.openSettings().catch(() => {});
        }
        return false;
      } catch (error) {
        console.warn('Permission error:', error);
        showNotice('error', 'Permission error', 'Unable to request permission. Please try again.');
        return false;
      }
    },
    [androidVersion, showNotice],
  );

  const appendMedia = useCallback(items => {
    setMedia(prev => [...prev, ...items]);
  }, []);

  const openGallery = useCallback(async () => {
    const granted = await ensurePermissions(['library']);
    if (!granted) {
      showNotice(
        'warning',
        'Permission needed',
        'Please allow access to your media library to choose photos or videos.',
      );
      return;
    }

    try {
      const selection = await ImagePicker.openPicker({
        mediaType: 'any',
        multiple: true,
        compressImageQuality: 0.85,
      });

      const files = Array.isArray(selection) ? selection : [selection];
      appendMedia(files);
    } catch (error) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        console.warn('Gallery error:', error);
        showNotice('error', 'Gallery unavailable', 'We could not open your gallery. Please try again.');
      }
    }
  }, [appendMedia, ensurePermissions, showNotice]);

  const takePhoto = useCallback(async () => {
    const granted = await ensurePermissions(['camera', 'library']);
    if (!granted) {
      showNotice('warning', 'Permission needed', 'Camera access is required to capture a photo.');
      return;
    }

    try {
      const photo = await ImagePicker.openCamera({
        mediaType: 'photo',
      });

      appendMedia([photo]);
    } catch (error) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        console.warn('Camera error:', error);
        showNotice('error', 'Unable to open camera', 'Please try again or check your camera permissions.');
      }
    }
  }, [appendMedia, ensurePermissions, showNotice]);

  const takeVideo = useCallback(async () => {
    const granted = await ensurePermissions(['camera', 'audio', 'library']);
    if (!granted) {
      showNotice(
        'warning',
        'Permission needed',
        'Camera and microphone access are required to record video.',
      );
      return;
    }

    try {
      const video = await ImagePicker.openCamera({
        mediaType: 'video',
      });

      appendMedia([video]);
    } catch (error) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        console.warn('Video error:', error);
        showNotice('error', 'Unable to record video', 'Please try again or check your camera permissions.');
      }
    }
  }, [appendMedia, ensurePermissions, showNotice]);

  const removeMedia = useCallback(indexToRemove => {
    setMedia(current => current.filter((_, index) => index !== indexToRemove));
  }, []);

//   const handlePost = useCallback(async () => {
//   if (!media.length) {
//     Alert.alert('Add a photo', 'Select one image before posting.');
//     return;
//   }

//   const file = media[0];
//   const path = file?.path; // e.g. file:///... or content://...
//   const contentType = 'image/webp';
//   const size = 105432; // make sure your backend expects a number
//   const width = file?.width;
//   const height = file?.height;

//   if (!path) {
//     Alert.alert('Invalid image', 'Could not read the selected image path.');
//     return;
//   }

//   // small fallback for filename if picker didn't provide one
//   const safeFilename = file?.filename || (path.split('/').pop() || 'upload.webp');

//   setPosting(true);
//   try {
//     // 1) Presign (no publicUrl required/used)
//     const presignRes = await authService.CreatePreSignedUrl({
//       contentType,
//       filename: safeFilename,
//       size,
//     });

//     // Accept common shapes: { signedUrl, uploadUrl, objectKey/r2Key }
//     if (!presignRes || presignRes.status !== 200 || !presignRes.data) {
//       throw new Error('Presign failed: invalid response');
//     }

//     const {
//       signedUrl,
//       uploadUrl,
//       objectKey,
//       r2Key,
//       // publicUrl,  // intentionally unused in this flow
//     } = presignRes.data;

//     const putUrl = signedUrl || uploadUrl;
//     const storageKey = objectKey || r2Key;

//     if (!putUrl) throw new Error('Presign failed: missing signed upload URL');
//     if (!storageKey) throw new Error('Presign failed: missing object key');

//     // 2) Read the local file as a Blob (RN 0.71+)
//     const blob = await fetch(path).then(r => {
//       if (!r.ok) throw new Error('Could not read local file');
//       return r.blob();
//     });

//     // 3) PUT to the signed URL (Content-Type MUST match presign)
//     const putRes = await fetch(putUrl, {
//       method: 'PUT',
//       headers: { 'Content-Type': contentType },
//       body: blob,
//     });

//     if (!putRes.ok) {
//       const errText = await putRes.text().catch(() => '');
//       throw new Error(`Upload failed (${putRes.status}): ${errText}`);
//     }

//     // 4) Create Post on success (store only the object key, no public URL)
//     const payload = {
//       content: (caption || '').trim(),
//       attachments: [
//         {
//           type: 'image',
//           metadata: {
//             r2Key: storageKey,        // or objectKey; backend should understand this
//             contentType,
//             size: size ?? blob.size,
//             width,
//             height,
//             filename: safeFilename,
//           },
//         },
//       ],
//     };

//     const create = await authService.CreatePost(payload);
//     if (create.status !== 200 && create.status !== 201) {
//       throw new Error(`Create post failed (${create.status})`);
//     }

//     Alert.alert('Posted', 'Your post has been published.');
//     setCaption('');
//     setMedia([]);
//     if (navigation?.goBack) navigation.goBack();
//   } catch (err) {
//     console.warn('Post error', err);
//     Alert.alert('Failed', err?.message || 'Unable to post right now. Please try again.');
//   } finally {
//     setPosting(false);
//   }
// }, [caption, media, navigation]);

const getFileNameFromPath = (path, fallback = 'upload') => {
  const last = (path || '').split('/').pop() || `${fallback}.bin`;
  return /\./.test(last) ? last : `${last}.bin`;
};
const guessContentType = (mime, isVid) =>
  (mime && typeof mime === 'string') ? mime : (isVid ? 'video/mp4' : 'image/jpeg');

const resolveAttachmentViewUrl = target => {
  if (!target) {
    return null;
  }
  const direct =
    target.publicUrl ||
    target.url ||
    target.viewUrl ||
    target.cdnUrl ||
    target.downloadUrl;
  const absolute = absolutizeMediaUrl(direct);
  if (absolute) {
    return absolute;
  }
  return buildMediaUrlFromKey(target.objectKey || target.r2Key);
};

// inside your component:
const handlePost = useCallback(async () => {
  const hasMedia = media.length > 0;
  const hasCaption = (caption || '').trim().length > 0;
  const hasQuoted = !!quotedPost;

  if (!hasMedia && !hasCaption && !hasQuoted) {
    showNotice('info', 'Add something first', 'Write a caption, attach media, or pick a post to repost.');
    return;
  }

  setIsUploading(true);
  try {
    let attachments = [];

    if (hasMedia) {
      const filesForPresign = media.map((item, idx) => {
        const filename = item?.filename || getFileNameFromPath(item?.path, `upload-${idx + 1}`);
        const contentType = guessContentType(item?.mime, isVideo(item));
        return { filename, contentType, size: item?.size ?? 105432 };
      });

      const presigns = await authService.CreatePreSignedUrls(filesForPresign);

      if (
        !presigns ||
        presigns.status !== 200 ||
        !Array.isArray(presigns.data) ||
        presigns.data.length !== media.length
      ) {
        throw new Error('Presign failed: unexpected response');
      }

      attachments = await Promise.all(
        media.map(async (item, idx) => {
          const uri = item?.path || item?.uri || item?.sourceURL;
          if (!uri) throw new Error('Missing file URI');

          const p = presigns.data[idx];
          if (!p?.putUrl) throw new Error(`Missing upload URL for item #${idx + 1}`);
          if (!p?.objectKey) throw new Error(`Missing object key for item #${idx + 1}`);

          const contentType = p.contentType || guessContentType(item?.mime, isVideo(item));
          const blob = await fetch(uri).then(r => {
            if (!r.ok) throw new Error(`Failed to read file at ${uri}`);
            return r.blob();
          });

          const putRes = await fetch(p.putUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: blob,
          });
          if (!putRes.ok) {
            const text = await putRes.text().catch(() => '');
            throw new Error(`Upload failed for #${idx + 1}: ${putRes.status} ${text}`);
          }

          const viewUrl = resolveAttachmentViewUrl(p);
          if (!viewUrl) {
            throw new Error('Upload succeeded but could not determine a public URL for the file.');
          }

          return {
            type: isVideo(item) ? 'video' : 'image',
            url: viewUrl,
            metadata: {
              r2Key: p.objectKey,
              contentType,
              size: item?.size ?? blob.size,
              width: item?.width,
              height: item?.height,
              filename: filesForPresign[idx].filename,
              publicUrl: viewUrl,
            },
          };
        }),
      );
    }

    const trimmedCaption = (caption || '').trim();
    const payload = {
      ...(trimmedCaption ? { content: trimmedCaption } : {}),
      ...(attachments.length ? { attachments } : {}),
      ...(quotedPost?.id ? { quotedPostId: Number(quotedPost.id) || quotedPost.id } : {}),
    };

    const create = await authService.CreatePost(payload);
    if (create.status !== 200 && create.status !== 201) {
      throw new Error(`Create post failed (${create.data.message})`);
    }

    showNotice('success', 'Posted', 'Your post has been published.');
    setCaption('');
    setMedia([]);

    const successPayload = {
      uploadSuccessToken: Date.now(),
      uploadMessage: 'Your post has been published.',
      shouldRefreshFeed: true,
    };

    if (returnToKey) {
      let targetKey = returnToNavigatorKey;

      if (!targetKey) {
        const stackState = navigation?.getState?.();
        const mainTabsRoute = stackState?.routes?.find(route => route.name === 'MainTabs');
        targetKey = mainTabsRoute?.state?.key ?? mainTabsRoute?.key;
      }

      if (targetKey) {
        navigation.dispatch({
          ...CommonActions.setParams(successPayload),
          source: returnToKey,
          target: targetKey,
        });
        navigation?.goBack?.();
      } else {
        console.warn('Upload success: Missing target navigator for returnToKey, redirecting home.');
        redirectToHome(0, successPayload);
      }
    } else {
      redirectToHome(5000, successPayload);
    }

    triggerCelebration();
  } catch (err) {
    console.warn('Post error:', err);
    showNotice('error', 'Upload failed', err?.message || 'Unable to post right now. Please try again.');
  } finally {
    setIsUploading(false);
  }
}, [media, caption, navigation, quotedPost, redirectToHome, returnToKey, returnToNavigatorKey, showNotice, triggerCelebration]);
  const renderMediaItem = useCallback(
    (item, index) => (
      <View key={`${item?.path ?? 'media'}-${index}`} style={styles.mediaItem}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setPreviewItem(item)}
          disabled={isUploading}
        >
          <View style={styles.mediaPreviewContainer}>
            {isVideo(item) ? (
              <>
                <Video
                  source={{ uri: item.path }}
                  style={styles.mediaPreview}
                  resizeMode="cover"
                  paused
                  muted
                />
                <View style={styles.previewOverlay}>
                  <Ionicons name="play-circle" size={34} color="#ffffff" />
                </View>
              </>
            ) : (
              <Image source={{ uri: item.path }} style={styles.mediaPreview} />
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => removeMedia(index)}
          disabled={isUploading}
        >
          <Feather name="x" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    ),
    [isUploading, removeMedia],
  );

  const hasPostContent = media.length > 0 || (caption || '').trim().length > 0 || !!quotedPost;
  const isPostDisabled = isUploading || !hasPostContent;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f7fb" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Feather name="x" size={22} color="#20232a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create post</Text>
          <TouchableOpacity
            style={[styles.headerButton, isPostDisabled && styles.headerButtonDisabled]}
            onPress={handlePost}
            disabled={isPostDisabled}
          >
            <Text style={[styles.postAction, isPostDisabled && styles.postActionDisabled]}>
              {isUploading ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>

        {notice && (
          <View
            style={[
              styles.noticeContainer,
              notice.type === 'success' && styles.noticeSuccess,
              notice.type === 'error' && styles.noticeError,
              notice.type === 'warning' && styles.noticeWarning,
              notice.type === 'info' && styles.noticeInfo,
            ]}
          >
            <View
              style={[
                styles.noticeAccent,
                notice.type === 'success' && styles.noticeAccentSuccess,
                notice.type === 'error' && styles.noticeAccentError,
                notice.type === 'warning' && styles.noticeAccentWarning,
                notice.type === 'info' && styles.noticeAccentInfo,
              ]}
            />
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <Text style={styles.noticeMessage}>{notice.message}</Text>
            </View>
            <TouchableOpacity style={styles.noticeDismiss} onPress={() => setNotice(null)}>
              <Feather name="x" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {quotedPost ? (
          <View style={styles.quotedCard}>
            <Text style={styles.quotedLabel}>Reposting from {quotedAuthor}</Text>
            {quotedText ? <Text style={styles.quotedBody}>{quotedText}</Text> : null}
            {quotedPreview ? (
              quotedPreview.type?.startsWith?.('video') ? (
                <View style={styles.quotedMedia}>
                  <Video
                    source={quotedPreview}
                    style={styles.quotedImage}
                    resizeMode="cover"
                    paused
                    muted
                  />
                  <View style={styles.previewOverlay}>
                    <Ionicons name="play-circle" size={34} color="#ffffff" />
                  </View>
                </View>
              ) : (
                <Image source={quotedPreview} style={styles.quotedImage} />
              )
            ) : null}
          </View>
        ) : null}

        {/* <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="cloud-upload" size={30} color="#fff" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Share something new</Text>
            <Text style={styles.heroSubtitle}>
              Pick photos or videos, fine-tune them, and add a caption before you publish.
            </Text>
          </View>
        </View> */}

        <TextInput
          placeholder="Write your caption..."
          placeholderTextColor="#a0a6b9"
          multiline
          style={styles.captionInput}
          value={caption}
          onChangeText={setCaption}
          selection={captionSelection}
          onSelectionChange={handleCaptionSelectionChange}
          autoCorrect
          autoCapitalize="sentences"
          onFocus={() => {
            setShowEmojiPicker(false);
            setActiveSuggestionType(null);
          }}
        />

        <View style={styles.captionToolbar}>
          <TouchableOpacity style={styles.captionToolButton} onPress={toggleEmojiPicker} activeOpacity={0.85}>
            <Ionicons name="happy-outline" size={20} color="#475467" />
            <Text style={styles.captionToolLabel}>Emoji</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.captionToolButton}
            onPress={() => toggleSuggestionPanel('hash')}
            activeOpacity={0.85}
          >
            <Ionicons name="pricetag-outline" size={20} color="#475467" />
            <Text style={styles.captionToolLabel}>Hashtag</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.captionToolButton}
            onPress={() => toggleSuggestionPanel('mention')}
            activeOpacity={0.85}
          >
            <Ionicons name="at-outline" size={20} color="#475467" />
            <Text style={styles.captionToolLabel}>Mention</Text>
          </TouchableOpacity>
        </View>

        {showEmojiPicker ? (
          <View style={styles.emojiPanel}>
            {EMOJI_PALETTE.map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiButton}
                onPress={() => handleEmojiInsert(emoji)}
                activeOpacity={0.85}
              >
                <Text style={styles.emojiGlyph}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {activeSuggestionType === 'hash' ? (
          <View style={styles.suggestionPanel}>
            {TRENDING_HASHTAGS.map(tag => (
              <TouchableOpacity
                key={tag}
                style={styles.suggestionItem}
                onPress={() => handleInsertHashtag(tag)}
                activeOpacity={0.85}
              >
                <Text style={styles.suggestionPrimary}>#{tag}</Text>
                <Text style={styles.suggestionSecondary}>Trending topic</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {activeSuggestionType === 'mention' ? (
          <View style={styles.suggestionPanel}>
            {FEATURED_MENTIONS.map(user => (
              <TouchableOpacity
                key={user.id}
                style={styles.suggestionItem}
                onPress={() => handleInsertMention(user)}
                activeOpacity={0.85}
              >
                <Text style={styles.suggestionPrimary}>@{user.handle}</Text>
                <Text style={styles.suggestionSecondary}>{user.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View style={styles.mediaSection}>
          <ScrollView
            style={styles.mediaScroll}
            contentContainerStyle={media.length ? styles.mediaGrid : styles.emptyStateContainer}
            showsVerticalScrollIndicator={false}
          >
            {media.length ? (
              media.map((item, index) => renderMediaItem(item, index))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="collections" size={36} color="#9aa0b5" />
                <Text style={styles.emptyTitle}>No media selected</Text>
                <Text style={styles.emptySubtitle}>
                  Choose an option below to start building your post.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.bottomSpacer} />

        {previewItem && (
          <Modal transparent animationType="fade" onRequestClose={() => setPreviewItem(null)}>
            <View style={styles.modalContainer}>
              <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewItem(null)}>
                <Feather name="x" size={26} color="#ffffff" />
              </TouchableOpacity>
              {isVideo(previewItem) ? (
                <Video
                  source={{ uri: previewItem.path }}
                  style={styles.fullPreview}
                  controls
                  resizeMode="contain"
                />
              ) : (
                <Image source={{ uri: previewItem.path }} style={styles.fullPreview} resizeMode="contain" />
              )}
            </View>
          </Modal>
        )}
      </View>

      {celebration && (
        <View style={styles.celebrationToast} pointerEvents="none">
          <View style={styles.celebrationAvatar}>
            <Feather name="check" size={22} color="#ffffff" />
          </View>
          <View style={styles.celebrationCopy}>
            <Text style={styles.celebrationTitle}>Post shared</Text>
            <Text style={styles.celebrationSubtitle}>We dropped it in the feed – nice!</Text>
          </View>
        </View>
      )}

      <View
        style={[styles.optionsDock, isUploading && { opacity: 0.65 }]}
        pointerEvents={isUploading ? 'none' : 'auto'}
      >
        <TouchableOpacity
          style={[styles.dockButton, isUploading && styles.dockButtonDisabled]}
          onPress={openGallery}
          activeOpacity={0.85}
          disabled={isUploading}
        >
          <Ionicons name="images-outline" size={22} color="#3b4cca" />
          <Text style={styles.dockLabel}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dockButton, isUploading && styles.dockButtonDisabled]}
          onPress={takePhoto}
          activeOpacity={0.85}
          disabled={isUploading}
        >
          <Ionicons name="camera-outline" size={22} color="#3b4cca" />
          <Text style={styles.dockLabel}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dockButton, isUploading && styles.dockButtonDisabled]}
          onPress={takeVideo}
          activeOpacity={0.85}
          disabled={isUploading}
        >
          <Ionicons name="videocam-outline" size={22} color="#3b4cca" />
          <Text style={styles.dockLabel}>Video</Text>
        </TouchableOpacity>
      </View>
      {isUploading && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#3b4cca" />
            <Text style={styles.loadingTitle}>Uploading media...</Text>
            <Text style={styles.loadingSubtitle}>Hang tight while we finish your post.</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default UploadScreenOption;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 140, // allow room for the bottom dock
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#20232a',
  },
  postAction: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b4cca',
  },
  postActionDisabled: {
    color: '#8b91a1',
  },
  quotedCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  quotedLabel: {
    fontSize: 12,
    color: '#475467',
    marginBottom: 6,
  },
  quotedBody: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  quotedMedia: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#dbeafe',
  },
  quotedImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  hero: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    shadowColor: '#1b1f3b',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#3b4cca',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#20232a',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#6d7389',
    lineHeight: 20,
  },
  captionInput: {
    minHeight: 100,
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    fontSize: 15,
    color: '#20232a',
    textAlignVertical: 'top',
    shadowColor: '#1b1f3b',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  captionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#1b1f3b',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 12,
  },
  captionToolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f2f9',
    gap: 6,
  },
  captionToolLabel: {
    fontSize: 13,
    color: '#475467',
    fontWeight: '600',
  },
  emojiPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingBottom: 6,
    marginTop: 10,
    shadowColor: '#1b1f3b',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  emojiButton: {
    width: '16.6%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiGlyph: {
    fontSize: 24,
  },
  suggestionPanel: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 6,
    shadowColor: '#1b1f3b',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  suggestionItem: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eceef6',
  },
  suggestionPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  suggestionSecondary: {
    fontSize: 12,
    color: '#7a8197',
    marginTop: 2,
  },
  mediaSection: {
    flex: 1,
    marginTop: 18,
  },
  mediaScroll: {
    flex: 1,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  mediaItem: {
    width: (screenWidth - 20 * 2 - 16) / 2,
    marginBottom: 16,
  },
  mediaPreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e8eaf6',
  },
  mediaPreview: {
    width: '100%',
    height: 190,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27, 31, 59, 0.28)',
  },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(32, 35, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3142',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7e8499',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 120,
  },
  optionsDock: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#1b1f3b',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  dockButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#f1f3fb',
  },
  dockButtonDisabled: {
    opacity: 0.4,
  },
  dockLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#20232a',
  },
  celebrationToast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#1b1f33',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  celebrationAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b4cca',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  celebrationCopy: {
    flexDirection: 'column',
  },
  celebrationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  celebrationSubtitle: {
    fontSize: 12,
    color: '#c5cae9',
    marginTop: 2,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#1f2337',
    borderWidth: 1,
    borderColor: '#2c3358',
  },
  noticeSuccess: {
    backgroundColor: '#142820',
    borderColor: '#2ecc71',
  },
  noticeError: {
    backgroundColor: '#2a1720',
    borderColor: '#ff6b81',
  },
  noticeWarning: {
    backgroundColor: '#2b2415',
    borderColor: '#f4c430',
  },
  noticeInfo: {
    backgroundColor: '#152238',
    borderColor: '#4f8ef7',
  },
  noticeAccent: {
    width: 4,
    borderRadius: 4,
    alignSelf: 'stretch',
    backgroundColor: '#3b4cca',
    marginRight: 12,
  },
  noticeAccentSuccess: {
    backgroundColor: '#2ecc71',
  },
  noticeAccentError: {
    backgroundColor: '#ff6b81',
  },
  noticeAccentWarning: {
    backgroundColor: '#f4c430',
  },
  noticeAccentInfo: {
    backgroundColor: '#4f8ef7',
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  noticeMessage: {
    fontSize: 13,
    color: '#d5d8f0',
    marginTop: 2,
    lineHeight: 18,
  },
  noticeDismiss: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 44,
    right: 24,
    zIndex: 2,
  },
  fullPreview: {
    width: screenWidth,
    height: screenHeight,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 14, 35, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    width: screenWidth * 0.8,
    maxWidth: 320,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#20232a',
    marginTop: 12,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#6d7389',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
});
