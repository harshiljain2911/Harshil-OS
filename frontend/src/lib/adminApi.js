import axios from "axios";
import { API } from "./api";

const TOKEN_KEY = "harshil_os_admin_token";

export const getAdminToken = () => localStorage.getItem(TOKEN_KEY);
export const setAdminToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearAdminToken = () => localStorage.removeItem(TOKEN_KEY);

export const adminClient = axios.create({ baseURL: `${API}/admin`, timeout: 30000 });

adminClient.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes("/login")) {
      clearAdminToken();
      if (!window.location.pathname.endsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(err);
  },
);

export async function adminLogin(password) {
  const { data } = await adminClient.post("/login", { password });
  setAdminToken(data.token);
  return data;
}

export const adminOverview = async () => (await adminClient.get("/overview")).data;
export const adminListContent = async (collection) => (await adminClient.get(`/content/${collection}`)).data.items;
export const adminGetItem = async (collection, slug) => (await adminClient.get(`/content/${collection}/${slug}`)).data;
export const adminCreateItem = async (collection, data, status) =>
  (await adminClient.post(`/content/${collection}`, { data, status })).data;
export const adminUpdateItem = async (collection, slug, data, status) =>
  (await adminClient.put(`/content/${collection}/${slug}`, { data, status })).data;
export const adminSetStatus = async (collection, slug, status) =>
  (await adminClient.post(`/content/${collection}/${slug}/status`, { status })).data;
export const adminDeleteItem = async (collection, slug) =>
  (await adminClient.delete(`/content/${collection}/${slug}`)).data;
export const adminGetSite = async () => (await adminClient.get("/site")).data;
export const adminPutSite = async (data) => (await adminClient.put("/site", data)).data;
export const adminMediaList = async (category) =>
  (await adminClient.get("/media", { params: category ? { category } : {} })).data;
export const adminMediaUpload = async (file, category) => {
  const form = new FormData();
  form.append("file", file);
  return (await adminClient.post("/media", form, {
    params: category ? { category } : {},
    headers: { "Content-Type": "multipart/form-data" },
  })).data;
};
export const adminMediaDelete = async (url) => (await adminClient.delete("/media", { params: { url } })).data;
export const adminAiStatus = async () => (await adminClient.get("/ai-status")).data;
export const adminAiTest = async () => (await adminClient.post("/ai-test")).data;
export const adminPutAiSettings = async (provider, model, models) =>
  (await adminClient.put("/ai-settings", { provider, model, models })).data;
export const getSchemas = async () => (await axios.get(`${API}/schemas`)).data;
