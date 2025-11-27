import Config from 'react-native-config';
import axiosClient from '../Authentication/axiosClient';

const DEFAULT_PRESIGN_PATH = Config.MEDIA_PRESIGN_ENDPOINT || 'uploads/presign';
const DEFAULT_POST_PATH = Config.MEDIA_POST_ENDPOINT || 'posts';
const DEFAULT_UPLOAD_METHOD = 'PUT';

const normalizeUri = uri => {
  if (!uri) {
    return uri;
  }
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }
  return `file://${uri}`;
};

const nameFromPath = path => {
  if (!path) {
    return undefined;
  }
  const parts = path.split('/');
  return parts[parts.length - 1] || undefined;
};

const extractUploadTargets = data => {
  if (!data) {
    return [];
  }
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data.uploads)) {
    return data.uploads;
  }
  if (Array.isArray(data.results)) {
    return data.results;
  }
  if (Array.isArray(data.items)) {
    return data.items;
  }
  if (Array.isArray(data.data)) {
    return data.data;
  }
  if (Array.isArray(data?.data?.uploads)) {
    return data.data.uploads;
  }
  return [];
};

export const requestPresignedUploads = async (files, endpoint = DEFAULT_PRESIGN_PATH) => {
  const response = await axiosClient.post(endpoint, { files });
  if (response.status >= 200 && response.status < 300) {
    const uploads = extractUploadTargets(response.data);
    if (!uploads.length) {
      throw new Error('Server did not return any upload targets.');
    }
    return {
      uploads,
      raw: response.data,
    };
  }

  const message = response.data?.message || 'Failed to prepare upload targets.';
  const error = new Error(message);
  error.status = response.status;
  error.response = response;
  throw error;
};

export const uploadUsingPresignedTarget = async (target, file, options = {}) => {
  if (!target) {
    throw new Error('Missing upload target.');
  }
  if (!file?.path) {
    throw new Error('Missing local file path.');
  }

  const uploadUrl = target.uploadUrl || target.url;
  if (!uploadUrl) {
    throw new Error('Upload target did not include an upload URL.');
  }

  const fallbackName = options.fileName || target.fileName || file?.filename || nameFromPath(file?.path);
  const effectiveName = fallbackName || `upload-${Date.now()}`;
  const contentType =
    options.contentType || target.contentType || file?.mime || (target.method === 'POST' ? undefined : 'application/octet-stream');

  const normalizedUri = normalizeUri(file.path);
  const method = (target.method || DEFAULT_UPLOAD_METHOD).toUpperCase();
  const headers = { ...(target.headers || {}) };
  if (contentType && !headers['Content-Type']) {
    headers['Content-Type'] = contentType;
  }

  if (target.fields && method === 'POST') {
    const formData = new FormData();
    Object.entries(target.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append('file', {
      uri: normalizedUri,
      name: effectiveName,
      type: contentType || 'application/octet-stream',
    });

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      throw new Error(text || 'File upload failed.');
    }

    return {
      fileName: effectiveName,
      contentType: contentType || 'application/octet-stream',
      response: uploadResponse,
    };
  }

  const fileResponse = await fetch(normalizedUri);
  const blob = await fileResponse.blob();

  const uploadResponse = await fetch(uploadUrl, {
    method,
    headers,
    body: blob,
  });

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    throw new Error(text || 'File upload failed.');
  }

  return {
    fileName: effectiveName,
    contentType: headers['Content-Type'] || 'application/octet-stream',
    response: uploadResponse,
  };
};

export const createPostRecord = async (payload, endpoint = DEFAULT_POST_PATH) => {
  const response = await axiosClient.post(endpoint, payload);
  if (response.status >= 200 && response.status < 300) {
    return response.data;
  }
  const message = response.data?.message || 'Failed to submit post.';
  const error = new Error(message);
  error.status = response.status;
  error.response = response;
  throw error;
};

export default {
  requestPresignedUploads,
  uploadUsingPresignedTarget,
  createPostRecord,
};
