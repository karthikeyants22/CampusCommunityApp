import Config from 'react-native-config';
import { API_BASE_URL } from '../Authentication/axiosClient';

const MEDIA_BASE_CANDIDATE =
  Config.MEDIA_PUBLIC_BASE_URL ||
  Config.MEDIA_GATEWAY_BASE_URL ||
  Config.MEDIA_CDN_BASE_URL ||
  Config.MEDIA_DELIVERY_BASE_URL ||
  '';

const MEDIA_KEY_PATH = (Config.MEDIA_PUBLIC_PATH || '').replace(/^\/+|\/+$/g, '');

const MEDIA_BASE = MEDIA_BASE_CANDIDATE.replace(/\/+$/, '');

const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch (error) {
    return '';
  }
})();

const sanitizePathSegment = value => {
  if (!value) return '';
  return String(value).replace(/^\/+/, '');
};

const encodeKeyPath = value =>
  sanitizePathSegment(value)
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

const absolutizeWithBase = (value, base) => {
  if (!value || !base) {
    return null;
  }
  const normalized = value.startsWith('/') ? value.slice(1) : value;
  return `${base}/${normalized}`;
};

const shouldSkipR2Rewrite = url => {
  try {
    const parsed = new URL(url);
    if (!/\.r2\.cloudflarestorage\.com$/i.test(parsed.hostname)) {
      return true;
    }
    return (
      parsed.searchParams.has('X-Amz-Algorithm') ||
      parsed.searchParams.has('X-Amz-Signature') ||
      parsed.searchParams.has('X-Amz-Credential')
    );
  } catch (error) {
    return true;
  }
};

const convertToPublicR2Host = url => {
  try {
    const parsed = new URL(url);
    const match = /^([a-z0-9]+)\.r2\.cloudflarestorage\.com$/i.exec(parsed.hostname);
    if (!match) {
      return url;
    }
    const accountId = match[1];
    const publicHost = `pub-${accountId}.r2.dev`;
    return `https://${publicHost}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (error) {
    return url;
  }
};

const normalizeR2Url = url => {
  if (!url || shouldSkipR2Rewrite(url)) {
    return url;
  }
  return convertToPublicR2Host(url);
};

export const absolutizeMediaUrl = value => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return normalizeR2Url(trimmed);
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  const fromMediaBase = absolutizeWithBase(trimmed, MEDIA_BASE);
  if (fromMediaBase) {
    return normalizeR2Url(fromMediaBase);
  }
  if (API_ORIGIN) {
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${API_ORIGIN}${normalized}`;
  }
  return trimmed;
};

export const buildMediaUrlFromKey = key => {
  const sanitized = sanitizePathSegment(key);
  if (!sanitized) {
    return null;
  }
  if (MEDIA_BASE) {
    return `${MEDIA_BASE}/${sanitized}`;
  }
  if (API_ORIGIN) {
    const encoded = encodeKeyPath(sanitized);
    if (MEDIA_KEY_PATH) {
      return `${API_ORIGIN}/${MEDIA_KEY_PATH}/${encoded}`;
    }
    return `${API_ORIGIN}/${encoded}`;
  }
  return null;
};

const pickCandidateUrl = item => {
  const candidates = [
    item?.url,
    item?.uri,
    item?.source,
    item?.path,
    item?.assetUrl,
    item?.mediaUrl,
    item?.publicUrl,
    item?.fileUrl,
    item?.cdnUrl,
    item?.downloadUrl,
    item?.previewUrl,
    item?.link,
    item?.href,
    item?.metadata?.url,
    item?.metadata?.uri,
    item?.metadata?.publicUrl,
    item?.metadata?.fileUrl,
    item?.metadata?.cdnUrl,
    item?.metadata?.mediaUrl,
    item?.metadata?.downloadUrl,
    item?.metadata?.previewUrl,
    item?.metadata?.link,
    item?.metadata?.href,
  ];
  return candidates.find(value => typeof value === 'string' && value.trim().length);
};

const pickKeyCandidate = item =>
  item?.metadata?.r2Key ||
  item?.metadata?.objectKey ||
  item?.metadata?.key ||
  item?.metadata?.path ||
  item?.objectKey ||
  item?.r2Key ||
  item?.key ||
  item?.path;

export const resolveMediaUrlFromPayload = item => {
  if (!item) {
    return null;
  }
  const direct = pickCandidateUrl(item);
  const absolute = absolutizeMediaUrl(direct);
  if (absolute) {
    return absolute;
  }
  const keyUrl = buildMediaUrlFromKey(pickKeyCandidate(item));
  return keyUrl || null;
};

export default {
  absolutizeMediaUrl,
  buildMediaUrlFromKey,
  resolveMediaUrlFromPayload,
};
