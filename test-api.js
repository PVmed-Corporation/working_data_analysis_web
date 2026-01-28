// 简单的后端 API 测试脚本
const API_BASE = 'http://localhost:3001/api';

async function testAPI() {
    console.log('🧪 Testing Backend API...\n');

    // 1. 测试健康检查
    try {
        const health = await fetch(`${API_BASE}/health`);
        const healthData = await health.json();
        console.log('✅ Health Check:', healthData);
    } catch (error) {
        console.error('❌ Health Check Failed:', error.message);
    }

    // 2. 测试工作日志 API
    try {
        // 获取所有日志（应该为空）
        const logs = await fetch(`${API_BASE}/worklogs`);
        const logsData = await logs.json();
        console.log('✅ Get Work Logs:', logsData.length, 'records');

        // 添加测试数据
        const testLog = [
            { name: 'Test User', date: '2026-01-28', time: '8', content: 'Test Task' }
        ];
        const addResult = await fetch(`${API_BASE}/worklogs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testLog)
        });
        const addData = await addResult.json();
        console.log('✅ Add Work Log:', addData);

        // 再次获取验证
        const logsAfter = await fetch(`${API_BASE}/worklogs`);
        const logsAfterData = await logsAfter.json();
        console.log('✅ Get Work Logs After Add:', logsAfterData.length, 'records');

        // 清理测试数据
        await fetch(`${API_BASE}/worklogs`, { method: 'DELETE' });
        console.log('✅ Cleaned up test data');
    } catch (error) {
        console.error('❌ Work Logs Test Failed:', error.message);
    }

    console.log('\n✨ All tests completed!');
}

testAPI();
