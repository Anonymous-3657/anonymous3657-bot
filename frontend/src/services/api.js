import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const http = axios.create({
  baseURL: API,
  timeout: 20000,
  withCredentials: true,
});

const get = async (path, params) => {
  const { data } = await http.get(path, { params });
  return data;
};

export const api = {
  stats: () => get("/stats"),
  search: (q) => get("/search", { q }),
  states: () => get("/states"),
  universities: (params) => get("/universities", params),
  university: (slug) => get(`/universities/${slug}`),
  colleges: (params) => get("/colleges", params),
  courses: (params) => get("/courses", params),
  course: (slug) => get(`/courses/${slug}`),
  subjects: (params) => get("/subjects", params),
  categories: () => get("/categories"),
  resources: (params) => get("/resources", params),
  resource: (slug) => get(`/resources/${slug}`),
};

export const studentApi = {
  bookmarks: (params) => get("/me/bookmarks", params),
  bookmarkIds: () => get("/me/bookmarks/ids"),
  addBookmark: (resource_id) => http.post("/me/bookmarks", { resource_id }).then((r) => r.data),
  removeBookmark: (resource_id) => http.delete(`/me/bookmarks/${resource_id}`).then((r) => r.data),
};

export const aiApi = {
  sessions: () => get("/ai/sessions"),
  messages: (sessionId) => get(`/ai/sessions/${sessionId}`),
  ask: (body) => http.post("/ai/ask", body, { timeout: 120000 }).then((r) => r.data),
  summarise: (body) => http.post("/ai/summarise", body, { timeout: 120000 }).then((r) => r.data),
  practice: (body) => http.post("/ai/practice", body, { timeout: 120000 }).then((r) => r.data),
  deleteSession: (sessionId) => http.delete(`/ai/sessions/${sessionId}`).then((r) => r.data),
};

export const adminApi = {
  overview: () => get("/admin/overview"),
  list: (entity, params) => get(`/admin/entities/${entity}`, params),
  create: (entity, body) => http.post(`/admin/entities/${entity}`, body).then((r) => r.data),
  update: (entity, id, body) =>
    http.put(`/admin/entities/${entity}/${id}`, body).then((r) => r.data),
  remove: (entity, id) => http.delete(`/admin/entities/${entity}/${id}`).then((r) => r.data),
  users: (params) => get("/admin/users", params),
  createUser: (body) => http.post("/admin/users", body).then((r) => r.data),
  updateUser: (id, body) => http.put(`/admin/users/${id}`, body).then((r) => r.data),
  removeUser: (id) => http.delete(`/admin/users/${id}`).then((r) => r.data),
};
