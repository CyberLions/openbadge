import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// Issuers
export const getIssuers = () => api.get("/issuers");
export const getIssuer = (id: string) => api.get(`/issuers/${id}`);
export const createIssuer = (data: Record<string, unknown>) =>
  api.post("/issuers", data);
export const updateIssuer = (id: string, data: Record<string, unknown>) =>
  api.put(`/issuers/${id}`, data);
export const deleteIssuer = (id: string) => api.delete(`/issuers/${id}`);

// Badge Classes
export const getBadgeClasses = (issuerId?: string) =>
  api.get("/badge-classes", { params: issuerId ? { issuerId } : {} });
export const getBadgeClass = (id: string) => api.get(`/badge-classes/${id}`);
export const createBadgeClass = (data: Record<string, unknown>) =>
  api.post("/badge-classes", data);
export const updateBadgeClass = (id: string, data: Record<string, unknown>) =>
  api.put(`/badge-classes/${id}`, data);
export const deleteBadgeClass = (id: string) =>
  api.delete(`/badge-classes/${id}`);

// Assertions
export const getAssertions = (params?: Record<string, string>) =>
  api.get("/assertions", { params });
export const getAssertion = (id: string) => api.get(`/assertions/${id}`);
export const issueAssertion = (data: Record<string, unknown>) =>
  api.post("/assertions", data);
export const bulkIssueAssertions = (data: Record<string, unknown>) =>
  api.post("/assertions/bulk", data);
export const revokeAssertion = (id: string, reason?: string) =>
  api.post(`/assertions/${id}/revoke`, { reason });

// Uploads
export const uploadImage = (file: File) => {
  const form = new FormData();
  form.append("image", file);
  return api.post("/uploads", form);
};

// Verification (public)
export const verifyBadge = (id: string) => axios.get(`/verify/${id}`);
