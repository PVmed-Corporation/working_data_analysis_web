import express from 'express';
import { getDb, saveDatabase } from '../database.js';

const router = express.Router();

// 获取所有代码分析报告
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const results = db.exec('SELECT * FROM code_analysis ORDER BY date DESC');

        if (results.length === 0) {
            return res.json({});
        }

        const columns = results[0].columns;
        const values = results[0].values;

        // 转换为前端期望的格式: { [date]: report }
        const dataStore: Record<string, any> = {};
        values.forEach((row: any[]) => {
            const dateIdx = columns.indexOf('date');
            const reportIdx = columns.indexOf('report');
            dataStore[row[dateIdx]] = JSON.parse(row[reportIdx]);
        });

        res.json(dataStore);
    } catch (error) {
        console.error('Error fetching code analysis reports:', error);
        res.status(500).json({ error: 'Failed to fetch code analysis reports' });
    }
});

// 保存代码分析报告
router.post('/', (req, res) => {
    try {
        const { date, report } = req.body;

        if (!date || !report) {
            return res.status(400).json({ error: 'Date and report are required' });
        }

        const db = getDb();
        db.run(
            'INSERT OR REPLACE INTO code_analysis (date, report) VALUES (?, ?)',
            [date, JSON.stringify(report)]
        );

        saveDatabase();
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving code analysis report:', error);
        res.status(500).json({ error: 'Failed to save code analysis report' });
    }
});

// 删除指定日期的报告
router.delete('/:date', (req, res) => {
    try {
        const { date } = req.params;
        const db = getDb();
        db.run('DELETE FROM code_analysis WHERE date = ?', [date]);

        saveDatabase();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting code analysis report:', error);
        res.status(500).json({ error: 'Failed to delete code analysis report' });
    }
});

export default router;
