import express from 'express';
import { getDb, saveDatabase } from '../database.js';

const router = express.Router();

// 获取所有工作日志
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const results = db.exec('SELECT * FROM work_logs ORDER BY date DESC, id DESC');

        if (results.length === 0) {
            return res.json([]);
        }

        const columns = results[0].columns;
        const values = results[0].values;

        const logs = values.map((row: any[]) => {
            const obj: any = {};
            columns.forEach((col, idx) => {
                obj[col] = row[idx];
            });
            return obj;
        });

        res.json(logs);
    } catch (error) {
        console.error('Error fetching work logs:', error);
        res.status(500).json({ error: 'Failed to fetch work logs' });
    }
});

// 批量添加工作日志
router.post('/', (req, res) => {
    try {
        const records = req.body;

        if (!Array.isArray(records)) {
            return res.status(400).json({ error: 'Request body must be an array of records' });
        }

        const db = getDb();

        for (const record of records) {
            db.run(
                'INSERT INTO work_logs (name, date, time, content) VALUES (?, ?, ?, ?)',
                [record.name, record.date, record.time, record.content]
            );
        }

        saveDatabase();
        res.json({ success: true, count: records.length });
    } catch (error) {
        console.error('Error saving work logs:', error);
        res.status(500).json({ error: 'Failed to save work logs' });
    }
});

// 清空所有工作日志
router.delete('/', (req, res) => {
    try {
        const db = getDb();
        db.run('DELETE FROM work_logs');
        saveDatabase();

        res.json({ success: true });
    } catch (error) {
        console.error('Error clearing work logs:', error);
        res.status(500).json({ error: 'Failed to clear work logs' });
    }
});

export default router;
