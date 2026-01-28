
// --- Work Log Analysis Types ---
export interface ParsedWorkLogData {
  raw: any[];
  summary: any[];
  dates: string[];
}

export interface WeeklyRecord {
  name: string;
  date: string;
  time: string;
  content: string;
}

// --- Code Submission Analysis Types ---
export interface AnalysisRow {
  name: string;
  pure_commit: number;
  code_review: number;
}

export interface ProjectStat {
  name: string;
  value: number;
}

export interface WeeklyReport {
  date: string;
  fileName: string;
  analysis: AnalysisRow[];
  projects: ProjectStat[];
  timestamp: number;
  rawData?: Record<string, any[][]>; // Added raw data storage
}

export type DataStore = Record<string, WeeklyReport>;

// --- Project Progress Analysis Types ---
export interface DetailRow {
  TaskName: string;
  TimeConsumed: number;
  Status: string;
  Member: string;
  [key: string]: any;
}

export interface SummaryRow {
  Member: string;
  DeliveryWaitRate: number | string;
  [key: string]: any;
}

export interface ParsedProjectData {
  summary: SummaryRow[];
  details: DetailRow[];
  totalTime: number;
  statusDistribution: { name: string; value: number }[];
  memberTimeStats: { name: string; value: number }[];
  rawData?: Record<string, any[][]>; // Added raw data storage
}

export interface ProjectReport {
  id: string;
  fileName: string;
  projectName: string;
  date: string;
  data: ParsedProjectData;
}

export interface ProjectGroup {
  projectName: string;
  reports: ProjectReport[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
