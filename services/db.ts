import { WeeklyRecord, DataStore, ProjectReport } from '../types';
import { apiClient } from './api';

// --- Work Log Services ---
export const saveWorkLogs = async (records: WeeklyRecord[]) => {
  await apiClient.post('/worklogs', records);
};

export const getAllWorkLogs = async (): Promise<WeeklyRecord[]> => {
  return await apiClient.get<WeeklyRecord[]>('/worklogs');
};

export const clearWorkLogs = async () => {
  await apiClient.delete('/worklogs');
};

// --- Code Analysis Services ---
export const saveCodeAnalysisReport = async (date: string, report: any) => {
  await apiClient.post('/code-analysis', { date, report });
};

export const getAllCodeAnalysisReports = async (): Promise<DataStore> => {
  return await apiClient.get<DataStore>('/code-analysis');
};

export const deleteCodeAnalysisReport = async (date: string) => {
  await apiClient.delete(`/code-analysis/${date}`);
};

// --- Project Progress Services ---
export const saveProjectReport = async (report: ProjectReport) => {
  await apiClient.post('/project-progress', report);
};

export const getAllProjectReports = async (): Promise<ProjectReport[]> => {
  return await apiClient.get<ProjectReport[]>('/project-progress');
};

export const deleteProjectReport = async (id: string) => {
  await apiClient.delete(`/project-progress/${id}`);
};

export const deleteProjectByName = async (projectName: string) => {
  await apiClient.delete(`/project-progress/by-name/${projectName}`);
};

// 保留旧的 initDB 函数签名以保持兼容性，但实际上不需要初始化了
export const initDB = () => {
  // No-op: 数据库初始化由后端处理
  return Promise.resolve();
};
