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
  collegeMaster: (params) => get("/colleges/master", params),
  courses: (params) => get("/courses", params),
  course: (slug) => get(`/courses/${slug}`),
  subjects: (params) => get("/subjects", params),
  categories: () => get("/categories"),
  resources: (params) => get("/resources", params),
  resource: (slug) => get(`/resources/${slug}`),
  syllabus: (params) => get("/syllabus", params),
  syllabusDetail: (id) => get(`/syllabus/${id}`),
};

/* ---------- Public (no-auth) endpoints ---------- */
export const publicApi = {
  pdfs: (params) => get("/public/pdfs", params),
  pdfDetail: (id) => get(`/public/pdfs/${id}`),
  pdfDownloadUrl: (id) => `${API}/public/pdfs/${id}/download`,
  announcements: (params) => get("/public/announcements", params),
  stats: () => get("/public/stats"),
};

export const studentApi = {
  bookmarks: (params) => get("/me/bookmarks", params),
  bookmarkPdfs: () => get("/me/bookmarks/pdfs"),
  bookmarkIds: () => get("/me/bookmarks/ids"),
  addBookmark: (resource_id) => http.post("/me/bookmarks", { resource_id }).then((r) => r.data),
  addPdfBookmark: (pdf_id) => http.post("/me/bookmarks", { pdf_id }).then((r) => r.data),
  removeBookmark: (resource_id) => http.delete(`/me/bookmarks/${resource_id}`).then((r) => r.data),
  examCountdown: () => get("/me/exam-countdown"),
};

export const pdfApi = {
  mine: (params) => get("/pdfs/mine", params),
  approved: (params) => get("/pdfs/approved", params),
  detail: (id) => get(`/pdfs/${id}`),
  fileUrl: (id) => `${API}/pdfs/${id}/file`,
  publicDownloadUrl: (id) => `${API}/public/pdfs/${id}/download`,
  remove: (id) => http.delete(`/pdfs/${id}`).then((r) => r.data),
  upload: (formData, onProgress) =>
    http
      .post("/pdfs", formData, {
        timeout: 180000,
        onUploadProgress: (e) =>
          onProgress?.(e.total ? Math.round((e.loaded * 100) / e.total) : 0),
      })
      .then((r) => r.data),
};

export const aiApi = {
  sessions: () => get("/ai/sessions"),
  messages: (sessionId) => get(`/ai/sessions/${sessionId}`),
  ask: (body) => http.post("/ai/ask", body, { timeout: 120000 }).then((r) => r.data),
  summarise: (body) => http.post("/ai/summarise", body, { timeout: 120000 }).then((r) => r.data),
  practice: (body) => http.post("/ai/practice", body, { timeout: 120000 }).then((r) => r.data),
  pdfSummary: (body) => http.post("/ai/pdf-summary", body, { timeout: 180000 }).then((r) => r.data),
  deleteSession: (sessionId) => http.delete(`/ai/sessions/${sessionId}`).then((r) => r.data),
};

export const syllabusApi = {
  list: (params) => get("/admin/syllabus", params),
  stats: () => get("/admin/syllabus/stats"),
  create: (formData) =>
    http.post("/admin/syllabus", formData, { timeout: 180000 }).then((r) => r.data),
  update: (id, formData) =>
    http.put(`/admin/syllabus/${id}`, formData, { timeout: 180000 }).then((r) => r.data),
  delete: (id) => http.delete(`/admin/syllabus/${id}`).then((r) => r.data),
  publish: (id) => http.post(`/admin/syllabus/${id}/publish`).then((r) => r.data),
  unpublish: (id) => http.post(`/admin/syllabus/${id}/unpublish`).then((r) => r.data),
  preview: (id) => `${API}/syllabus/${id}/file`,
  download: (id) => `${API}/syllabus/${id}/file?download=1`,
};

export const teacherContentApi = {
  adminList: (params) => get(`/admin/teacher-content`, params),
  createTeacher: (formData) => http.post(`/admin/teacher-content/teachers`, formData).then((r) => r.data),
  createContent: (formData) => http.post(`/admin/teacher-content`, formData, { timeout: 180000 }).then((r) => r.data),
  updateContent: (id, formData) => http.put(`/admin/teacher-content/${id}`, formData, { timeout: 180000 }).then((r) => r.data),
  publish: (id) => http.post(`/admin/teacher-content/${id}/publish`).then((r) => r.data),
  unpublish: (id) => http.post(`/admin/teacher-content/${id}/unpublish`).then((r) => r.data),
  delete: (id) => http.delete(`/admin/teacher-content/${id}`).then((r) => r.data),
  list: (params) => get(`/teacher-content`, params),
  detail: (id) => get(`/teacher-content/${id}`),
  teacherProfile: (id) => get(`/teacher-content/teachers/${id}`),
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
  pdfs: (params) => get("/admin/pdfs", params),
  approvePdf: (id) => http.post(`/admin/pdfs/${id}/approve`).then((r) => r.data),
  rejectPdf: (id, reason) => http.post(`/admin/pdfs/${id}/reject`, { reason }).then((r) => r.data),
  deletePdf: (id) => http.delete(`/admin/pdfs/${id}`).then((r) => r.data),
  bulkPdfAction: (action, ids, reason) =>
    http.post("/admin/pdfs/bulk-action", { action, ids, reason }).then((r) => r.data),
  syllabus: syllabusApi,

  /* Advanced admin features */
  analytics: (params) => get("/admin/analytics", params),
  activity: (params) => get("/admin/activity", params),
  exportPdfs: (status) => `${API}/admin/export/pdfs${status ? `?status=${status}` : ""}`,

  /* Announcements */
  announcements: (params) => get("/admin/announcements", params),
  createAnnouncement: (body) => http.post("/admin/announcements", body).then((r) => r.data),
  updateAnnouncement: (id, body) => http.put(`/admin/announcements/${id}`, body).then((r) => r.data),
  deleteAnnouncement: (id) => http.delete(`/admin/announcements/${id}`).then((r) => r.data),

  /* Platform settings */
  getSettings: () => get("/admin/settings"),
  updateSettings: (body) => http.put("/admin/settings", body).then((r) => r.data),
};

/* ---------- Notifications ---------- */
export const notificationApi = {
  list: (params) => get("/me/notifications", params),
  markAsRead: (id) => http.post(`/me/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => http.post("/me/notifications/mark-all-read").then((r) => r.data),
  delete: (id) => http.delete(`/me/notifications/${id}`).then((r) => r.data),
};

/* ---------- Profile ---------- */
export const profileApi = {
  get: () => get("/me/profile"),
  update: (body) => http.put("/me/profile", body).then((r) => r.data),
  changePassword: (body) => http.put("/me/password", body).then((r) => r.data),
  stats: () => get("/me/stats"),
};

/* ---------- Ratings ---------- */
export const ratingApi = {
  submit: (body) => http.post("/ratings", body).then((r) => r.data),
  getPdfRatings: (id, params) => get(`/ratings/pdf/${id}`, params),
  getResourceRatings: (id, params) => get(`/ratings/resource/${id}`, params),
  delete: (id) => http.delete(`/ratings/${id}`).then((r) => r.data),
};

/* ---------- Comments ---------- */
export const commentsApi = {
  add: (body) => http.post("/comments", body).then((r) => r.data),
  getPdfComments: (id, params) => get(`/comments/pdf/${id}`, params),
  getResourceComments: (id, params) => get(`/comments/resource/${id}`, params),
  vote: (id, body) => http.post(`/comments/${id}/vote`, body).then((r) => r.data),
  delete: (id) => http.delete(`/comments/${id}`).then((r) => r.data),
};
