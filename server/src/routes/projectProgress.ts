import express from 'express';
import { getDb, saveDatabase } from '../database.js';

const router = express.Router();

// 获取所有项目报告
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const results = db.exec('SELECT * FROM project_progress ORDER BY date DESC');

        if (results.length === 0) {
            return res.json([]);
        }

        const columns = results[0].columns;
        const values = results[0].values;

        const parsedReports = values.map((row: any[]) => ({
            id: row[columns.indexOf('id')],
            fileName: row[columns.indexOf('file_name')],
            projectName: row[columns.indexOf('project_name')],
            date: row[columns.indexOf('date')],
            data: JSON.parse(row[columns.indexOf('data')])
        }));

        res.json(parsedReports);
    } catch (error) {
        console.error('Error fetching project reports:', error);
        res.status(500).json({ error: 'Failed to fetch project reports' });
    }
});

// 保存项目报告
router.post('/', (req, res) => {
    try {
        const report = req.body;

        if (!report.id || !report.projectName || !report.data) {
            return res.status(400).json({ error: 'Invalid report data' });
        }

        const db = getDb();
        db.run(
            'INSERT OR REPLACE INTO project_progress (id, file_name, project_name, date, data) VALUES (?, ?, ?, ?, ?)',
            [report.id, report.fileName, report.projectName, report.date, JSON.stringify(report.data)]
        );

        saveDatabase();
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving project report:', error);
        res.status(500).json({ error: 'Failed to save project report' });
    }
});

// 删除指定报告
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        db.run('DELETE FROM project_progress WHERE id = ?', [id]);

        saveDatabase();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting project report:', error);
        res.status(500).json({ error: 'Failed to delete project report' });
    }
});

// 按项目名删除
router.delete('/by-name/:projectName', (req, res) => {
    try {
        const { projectName } = req.params;
        const db = getDb();
        db.run('DELETE FROM project_progress WHERE project_name = ?', [projectName]);

        saveDatabase();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting project by name:', error);
        res.status(500).json({ error: 'Failed to delete project reports' });
    }
});

export default router;
