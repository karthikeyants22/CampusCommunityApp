// authService.js
import axiosClient, {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "./axiosClient";

import AsyncStorage from "@react-native-async-storage/async-storage";
import ReactNativeBlobUtil from 'react-native-blob-util';

const normalizePresign = (entry = {}, filenameFallback) => {
  const {
    filename,
    signedUrl,
    uploadUrl,
    publicUrl,
    objectKey,
    r2Key,
    contentType,
  } = entry || {};
  return {
    filename: filename || filenameFallback,
    putUrl: signedUrl || uploadUrl,   // URL to PUT the blob
    objectKey: objectKey || r2Key,    // storage key to save later
    contentType: contentType || undefined,
    publicUrl:publicUrl
  };
};

const authService = {
  // Login: returns raw axios response; caller checks status
  login: async (email, password) => {
    const response = await axiosClient.post("auth/login", {
      emailOrUsername: email,
      password: password,
    });
    if (response.status === 200) {
      if (response.data?.token) {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, response.data.token);
      }
      if (response.data?.refreshToken) {
        await AsyncStorage.setItem(
          REFRESH_TOKEN_KEY,
          response.data.refreshToken
        );
      }
    }
    return response;
  },

  // Reference data for role-based profile fields
  async getUsers(filters) {
    const response = await axiosClient.get("auth/reference-data", { params: filters });
    if (response.status >= 200 && response.status < 300) {
      return { isSuccess: true, data: response.data, status: response.status };
    }
    return {
      isSuccess: false,
      data: null,
      message: response.data?.message || "Unable to fetch reference data",
      status: response.status,
    };
  },

  // Request OTP to email
  SendVerificationCode: async (email) => {
    console.log("EMAIL---------------", email)
    const response = await axiosClient.post("auth/request-otp", { email });

    return response;
  },
  // CreatePreSignedUrl: async (filename) => {
  //   console.log("FILEDETAILS---------------",filename)
  //   const response = await axiosClient.post("/media/presign", { filename,contentType:"image/webp",size:"105432" });
  //   return response;
  // },

  //    CreatePreSignedUrl : async (files) => {
  // try {
  // // --- 1) Try batch endpoint first ---
  // try {
  // const batchRes = await axiosClient.post('/media/presign', { files });
  // const urls = (batchRes?.data?.urls) || {};
  // return { status: batchRes.status, ok: batchRes.status >= 200 && batchRes.status < 300, data: { urls } };
  // } catch (e) {
  // // If batch is not supported (404/405/etc.), fall back to single-file flow
  // if (e?.response && [404, 400, 405].includes(e.response.status) === false) {
  // // If server returned some other error, bubble it up
  // throw e;
  // }
  // }

  // // --- 2) Fallback: call your existing single-file endpoint concurrently ---
  // // Your current API: POST /media/presign { filename, contentType, size }
  // const limit = 4; // concurrency cap
  // const queue = [...files];
  // const urlMap = {};

  // const worker = async () => {
  // while (queue.length) {
  // const f = queue.shift();
  // // Use objectKey as the "filename" to control the exact S3 key
  // const payload = {
  // filename: f.objectKey,
  // contentType: f.contentType || 'application/octet-stream',
  // size: String(f.size || ''),
  // };
  // const res = await axiosClient.post('/media/presign', payload);
  // const signed = res?.data?.url || res?.data?.presignedUrl || res?.data; // be forgiving
  // if (!signed || typeof signed !== 'string') {
  // throw new Error('Invalid presign response for ' + f.objectKey);
  // }
  // urlMap[f.objectKey] = signed;
  // }
  // };

  // const workers = new Array(Math.min(limit, files.length)).fill(0).map(worker);
  // await Promise.all(workers);

  // return { status: 200, ok: true, data: { urls: urlMap } };
  // } catch (err) {
  // const status = err?.response?.status ?? 0;
  // return { status, ok: false, data: { message: err?.message || 'Presign failed' } };
  // }
  // },
  //   async CreatePost(body) {
  //     try {
  //       const resp = await axiosClient.post('/posts', body);
  //       return { status: resp.status, ok: resp.status >= 200 && resp.status < 300, data: resp.data };
  //     } catch (e) {
  //       return { status: e?.response?.status ?? 0, ok: false, data: e?.response?.data || { message: e.message } };
  //     }
  //   },

///////////////////////////////////////////final////////////////////////////////////////
  // CreatePreSignedUrl: async ({ filename, contentType, size }) => {

  //   console.log("PARMS", filename, contentType, size)
  //   const res = await axiosClient.post("media/presign", {
  //     filename,
  //     contentType,
  //     size:105432,
  //   });
  //   return res; // { status, data: { signedUrl, r2Key, ... } }
  // },

  // // Create a post after successful upload
  // CreatePost: async (payload) => {

  //   console.log("SUCESS",payload)
  //   // payload: { content, attachments: [{ type:'image', metadata:{ r2Key, contentType, size, width, height }}]}
  //   const res = await axiosClient.post("posts", payload);
  //   return res;
  // },

  CreatePreSignedUrls: async (files = []) => {
    if (!Array.isArray(files) || files.length === 0) {
      return { status: 400, data: [] };
    }

    const batchRes = [];

    for (const file of files) {
      const payload = {
        filename: file.filename,
        contentType: file.contentType,
        size: file.size ?? 105432,
      };

      const res = await axiosClient.post("media/presign", payload);
      
      batchRes.push(normalizePresign(res?.data, file.filename));
    }

    return { status: 200, data: batchRes };
  },

  /**
   * Backward-compatible single presign helper.
   */
  CreatePreSignedUrl: async (files) => {

    const multi = await authService.CreatePreSignedUrls(files);
    // const first = Array.isArray(multi.data) ? multi.data[0] : null;
    return { status: multi.status, data: multi.data };
  },

  /**
   * Create a post (works for 1 or many attachments).
   * payload: { content, attachments: [{ type:'image'|'video', metadata:{ r2Key/objectKey, ... } }] }
   */
  CreatePost: async (payload) => {
    const res = await axiosClient.post("posts", payload);
    return res;
  },

  verifyOtp: async (email, otp) => {
    const response = await axiosClient.post("auth/verify-otp", { email, otp });
    if (response.status >= 200 && response.status < 300) {
      return { isSuccess: true, data: response.data, status: response.status };
    }
    return {
      isSuccess: false,
      data: response.data,
      message: response.data?.message || "OTP verification failed",
      status: response.status,
    };
  },

  // Complete registration
  Registeruser: async (
    fullName,
    username,
    email,
    pwd,
    role,
    otptict,
    degreeid,
    deptId,
    gender,
    yoj,
    stndid,
    designation,
    staffId
  ) => {

    const response = await axiosClient.post("auth/register", {
      fullName,
      username,
      email,
      password: pwd,
      roleKey: role,
      otpTicket: otptict,
      degreeId: degreeid ? degreeid : null,
      departmentId: deptId ? deptId : null,
      gender,
      yearOfJoining: yoj ? yoj : null,
      studentId: stndid ? stndid : null,
      empId: staffId ? staffId : null,
      designationId: designation ? designation : null,
    });
    return response;
  },

  getUsersList: async () => {
    const res = await axiosClient.get("users/me");
    if (res.status >= 200 && res.status < 300) {
      return { isSuccess: true, data: res.data, status: res.status };
    }
    return {
      isSuccess: false,
      data: res.data,
      message: res.data?.message || res.data?.error || "Failed to load users",
      status: res.status,
    };
  },

  getUserById: async (userId) => {
    if (!userId) {
      return {
        isSuccess: false,
        data: null,
        message: "Missing user id",
        status: 0,
      };
    }
    const res = await axiosClient.get(`users/${userId}`);
    if (res.status >= 200 && res.status < 300) {
      return { isSuccess: true, data: res.data, status: res.status };
    }
    return {
      isSuccess: false,
      data: res.data,
      message: res.data?.message || res.data?.error || "Failed to load user",
      status: res.status,
    };
  },

  getSavedPosts: async (cursor = 1, limit = 50) => {
    const res = await axiosClient.get("posts/saved", {
      params: { cursor, limit },
    });
    if (res.status >= 200 && res.status < 300) {
      return { isSuccess: true, data: res.data, status: res.status };
    }
    return {
      isSuccess: false,
      data: res.data,
      message: res.data?.message || res.data?.error || "Failed to load saved posts",
      status: res.status,
    };
  },

  getUserPosts: async (userId, page = 1, limit = 10) => {
    const res = await axiosClient.get(`users/${userId}/posts`, {
      params: { page, limit },
    });
    if (res.status >= 200 && res.status < 300) {
      return { isSuccess: true, data: res.data, status: res.status };
    }
    return {
      isSuccess: false,
      data: res.data,
      message: res.data?.message || res.data?.error || "Failed to load posts",
      status: res.status,
    };
  },

  getFollowers: async (userId, page = 1, limit = 10) => {
    const res = await axiosClient.get(`users/${userId}/followers`, {

      params: { page, limit },
    });

    if (res.status >= 200 && res.status < 300) {
      return { isSuccess: true, data: res.data, status: res.status };
    }
    return {
      isSuccess: false,
      data: res.data,
      message: res.data?.message || res.data?.error || "Failed to load followers",
      status: res.status,
    };
  },

  getFollowing: async (userId, page = 1, limit = 10) => {

    const res = await axiosClient.get(`users/${userId}/following`, {
      params: { page, limit },
    });

    if (res.status >= 200 && res.status < 300) {
      return { isSuccess: true, data: res.data, status: res.status };
    }
    return {
      isSuccess: false,
      data: res.data,
      message: res.data?.message || res.data?.error || "Failed to load following",
      status: res.status,
    };
  },

  followUser: async (userId) => {

   

    const res = await axiosClient.post(`users/${userId}/follow`);
    console.log("USERRES",res,userId)

    if (res.status >= 200 && res.status < 300) {
      return { isSuccess: true, data: res.data, status: res.status };
    }
    return {
      isSuccess: false,
      data: res.data,
      message: res.data?.message || res.data?.error || "Failed to follow user",
      status: res.status,
    };
  },

  unfollowUser: async (userId) => {
       

    const res = await axiosClient.delete(`users/${userId}/follow`);
        console.log("USERREUNFOLLOWS",res,userId)

    if (res.status >= 200 && res.status < 300) {
      return { isSuccess: true, data: res.data, status: res.status };
    }

    return {
      isSuccess: false,
      data: res.data,
      message:
        res.data?.message || res.data?.error || "Failed to unfollow user",
      status: res.status,
    };
  },

  updateAvatar: async (asset) => {
  try {
    if (!asset?.uri) {
      return {
        isSuccess: false,
        data: null,
        message: "Missing image data",
        status: 0,
      };
    }
const getFileUri = async (asset) => {
  if (asset.uri.startsWith('content://')) {
    console.log("URI",asset)
    const stat = await ReactNativeBlobUtil.fs.stat(asset.uri);
    console.log("PATHHH",stat)
    return 'file://' + stat.path;
  }
  return asset.uri;
};
    // 🔥 Convert content:// → file://
    const fileUri = await getFileUri(asset);

    const guessFileName = (uri) => {
      const cleanUri = String(uri).split("?")[0];
      const parts = cleanUri.split("/");
      const last = parts[parts.length - 1];
      return last && last.includes(".")
        ? last
        : `avatar_${Date.now()}.jpg`;
    };

    const form = new FormData();
    form.append("avatar", {
      uri: fileUri,
      name: asset.fileName || guessFileName(fileUri),
      type: asset.type || "image/jpeg",
    });

    const res = await axiosClient.post(
      "users/me/avatar",
      form,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000, // 👈 prevents silent timeout
      }
    );

    console.log("RESSS",res)

    if (res.status >= 200 && res.status < 300) {
      return { isSuccess: true, data: res.data, status: res.status };
    }

    return {
      isSuccess: false,
      data: res.data,
      message: res.data?.message || "Upload failed",
      status: res.status,
    };

  } catch (error) {
    console.log("UPLOAD ERROR", error);
    return {
      isSuccess: false,
      data: null,
      message: error.message || "Network Error",
      status: 0,
    };
  }
},


//   updateAvatar: async (asset) => {

//     console.log("AVATARASSET",asset)
//     if (!asset?.uri) {
//       return {
//         isSuccess: false,
//         data: null,
//         message: "Missing image data",
//         status: 0,
//       };
//     }

//     const guessFileName = (uri) => {
//       if (!uri) return `avatar_${Date.now()}.jpg`;
//       const cleanUri = String(uri).split("?")[0];
//       const parts = cleanUri.split("/");
//       const last = parts[parts.length - 1];
//       return last && last.includes(".") ? last : `avatar_${Date.now()}.jpg`;
//     };

//     const form = new FormData();
//     form.append("avatar", {
//       uri: asset.uri,
//       name: asset.fileName || guessFileName(asset.uri),
//       type: asset.type || "image/jpeg",
//     });
// console.log("FORM",form)
//     const res = await axiosClient.post(
//       "users/me/avatar",
//       form,
//       {
//         headers: { "Content-Type": "multipart/form-data" },
//       }
//     );

//     console.log("ENDRESPONSE",res)
//     if (res.status >= 200 && res.status < 300) {
//       return { isSuccess: true, data: res.data, status: res.status };
//     }
//     return {
//       isSuccess: false,
//       data: res.data,
//       message: res.data?.message || res.data?.error || "Failed to update avatar",
//       status: res.status,
//     };
//   },

  logout: async () => {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  },

  getProfile: async () => {
    const res = await axiosClient.get("users/me");
    if (res.status >= 200 && res.status < 300) {
      return res.data;
    }
    throw new Error(res.data?.message || res.data?.error || "Failed to load profile");
  },
};

export default authService;
