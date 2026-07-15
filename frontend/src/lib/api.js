import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const client = axios.create({
  baseURL: API,
  timeout: 20000,
});

export async function listCollection(name) {
  const { data } = await client.get(`/content/${name}`);
  return data.items;
}

export async function getItem(name, slug) {
  const { data } = await client.get(`/content/${name}/${slug}`);
  return data;
}

export async function getSite() {
  const { data } = await client.get("/content/site");
  return data;
}

export async function submitContact(payload) {
  const { data } = await client.post("/contact", payload);
  return data;
}

export async function askAssistant(session_id, question) {
  const { data } = await client.post("/assistant", { session_id, question });
  return data;
}

export function ogUrl(type, slug) {
  const params = new URLSearchParams({ type, ...(slug ? { slug } : {}) });
  return `${API}/og?${params.toString()}`;
}
