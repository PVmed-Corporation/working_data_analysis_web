import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { WeeklyRecord, DataStore, ProjectReport } from '../types';

interface AppDB extends DBSchema {
  work_logs: {
    key: string; // date
    value: WeeklyRecord;
    indexes: { 'by-date': string };
  };
  code_analysis: {
    key: string; // date YYYY-MM-DD
    value: { date: string; report: any }; // Using a wrapper to easily store the complex WeeklyReport object
  };
  project_progress: {
    key: string; // UUID
    value: ProjectReport;
    indexes: { 'by-project': string };
  };
}

const DB_NAME = 'ZenTaoAnalyticsDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AppDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store for Work Log Analysis (App 1)
        // We'll store individual records to allow flexible querying, or bulk blobs. 
        // For simplicity and matching the "append" logic, let's store individual records.
        // Actually, the original app loads array of records. Storing individually is cleaner.
        if (!db.objectStoreNames.contains('work_logs')) {
          const store = db.createObjectStore('work_logs', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-date', 'date');
        }

        // Store for Code Submission Analysis (App 2)
        // Original used localStorage key/value.
        if (!db.objectStoreNames.contains('code_analysis')) {
          db.createObjectStore('code_analysis', { keyPath: 'date' });
        }

        // Store for Project Progress (App 3)
        // Original used in-memory list.
        if (!db.objectStoreNames.contains('project_progress')) {
          const store = db.createObjectStore('project_progress', { keyPath: 'id' });
          store.createIndex('by-project', 'projectName');
        }
      },
    });
  }
  return dbPromise;
};

// --- Work Log Services ---
export const saveWorkLogs = async (records: WeeklyRecord[]) => {
  const db = await initDB();
  const tx = db.transaction('work_logs', 'readwrite');
  const store = tx.objectStore('work_logs');
  // Clear old or just append? The original app just appended to state.
  // To keep it simple and performant, we will clear and rewrite if it's a "reset", 
  // but the prompt logic implies "merge". 
  // For this integration, we'll offer a way to get all and add new.
  for (const record of records) {
    await store.add(record);
  }
  await tx.done;
};

export const getAllWorkLogs = async (): Promise<WeeklyRecord[]> => {
  const db = await initDB();
  return db.getAll('work_logs');
};

export const clearWorkLogs = async () => {
  const db = await initDB();
  await db.clear('work_logs');
};

// --- Code Analysis Services ---
export const saveCodeAnalysisReport = async (date: string, report: any) => {
  const db = await initDB();
  await db.put('code_analysis', { date, report });
};

export const getAllCodeAnalysisReports = async (): Promise<DataStore> => {
  const db = await initDB();
  const rows = await db.getAll('code_analysis');
  const store: DataStore = {};
  rows.forEach(row => {
    store[row.date] = row.report;
  });
  return store;
};

export const deleteCodeAnalysisReport = async (date: string) => {
  const db = await initDB();
  await db.delete('code_analysis', date);
};

// --- Project Progress Services ---
export const saveProjectReport = async (report: ProjectReport) => {
  const db = await initDB();
  await db.put('project_progress', report);
};

export const getAllProjectReports = async (): Promise<ProjectReport[]> => {
  const db = await initDB();
  return db.getAll('project_progress');
};

export const deleteProjectReport = async (id: string) => {
  const db = await initDB();
  await db.delete('project_progress', id);
};

export const deleteProjectByName = async (projectName: string) => {
  const db = await initDB();
  const tx = db.transaction('project_progress', 'readwrite');
  const index = tx.store.index('by-project');
  let cursor = await index.openCursor(IDBKeyRange.only(projectName));
  
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
};
