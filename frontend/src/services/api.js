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
