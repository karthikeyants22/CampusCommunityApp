// authService.js
import axiosClient, {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "./axiosClient";

import AsyncStorage from "@react-native-async-storage/async-storage";
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
    console.log("Presign entry", files);
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
      console.log("res",res);
      
      batchRes.push(normalizePresign(res?.data, file.filename));
    }
console.log("final",batchRes);

    return { status: 200, data: batchRes };
  },

  /**
   * Backward-compatible single presign helper.
   */
  CreatePreSignedUrl: async (files) => {

    console.log("CALL_URL")
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

    console.log("POWEWDW", pwd)
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
