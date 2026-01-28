import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库文件路径
const DB_PATH = path.join(__dirname, '../../database/analytics.db');

let db: Database;

// 初始化数据库连接
export const initDatabase = async () => {
    const SQL = await initSqlJs();

    // 如果数据库文件存在，加载它
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        console.log('✅ Existing database loaded');
    } else {
        // 创建新数据库
        db = new SQL.Database();
        console.log('✅ New database created');
    }

    // 创建表结构
    db.run(`
    CREATE TABLE IF NOT EXISTS work_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

    db.run(`
    CREATE INDEX IF NOT EXISTS idx_work_logs_date ON work_logs(date);
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS code_analysis (
      date TEXT PRIMARY KEY,
      report TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS project_progress (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      project_name TEXT NOT NULL,
      date TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

    db.run(`
    CREATE INDEX IF NOT EXISTS idx_project_progress_name ON project_progress(project_name);
  `);

    console.log('✅ Database tables initialized');

    // 保存到文件
    saveDatabase();
};

// 保存数据库到文件
export const saveDatabase = () => {
    if (!db) return;

    const data = db.export();
    const buffer = Buffer.from(data);

    // 确保目录存在
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    fs.writeFileSync(DB_PATH, buffer);
};

// 获取数据库实例
export const getDb = () => {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
};

export default { initDatabase, getDb, saveDatabase };
