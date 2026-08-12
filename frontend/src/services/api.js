import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const http = axios.create({ baseURL: API, timeout: 20000 });

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
  courses: (params) => get("/courses", params),
  course: (slug) => get(`/courses/${slug}`),
  subjects: (params) => get("/subjects", params),
  categories: () => get("/categories"),
  resources: (params) => get("/resources", params),
  resource: (slug) => get(`/resources/${slug}`),
};
