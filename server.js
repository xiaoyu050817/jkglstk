/**
 * 健康管理师题库 - 后端服务（Render部署版）
 * 功能：题库管理API、管理员后台、静态文件服务
 * 数据存储：内存存储（服务启动时从data/questions.json加载默认数据）
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATA_FILE = path.join(__dirname, 'data', 'questions.json');

// 内存存储（Render文件系统是临时的，使用内存存储确保数据在服务运行期间有效）
let questionsCache = null;

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// ==================== 数据管理 ====================

// 读取题库数据（优先从内存读取）
function readQuestions() {
    if (questionsCache !== null) {
        return questionsCache;
    }
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf-8');
            questionsCache = JSON.parse(data);
            console.log(`已从文件加载题库，共 ${questionsCache.length} 道题`);
            return questionsCache;
        }
        questionsCache = [];
        return [];
    } catch (e) {
        console.error('读取题库失败:', e);
        questionsCache = [];
        return [];
    }
}

// 保存题库数据（保存到内存）
function saveQuestions(questions) {
    try {
        questionsCache = questions;
        // 同时尝试保存到文件（如果文件系统可写）
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(questions, null, 2), 'utf-8');
        } catch (e) {
            // 文件系统可能只读，忽略错误，数据已保存在内存中
            console.log('数据已保存到内存（文件系统只读）');
        }
        return true;
    } catch (e) {
        console.error('保存题库失败:', e);
        return false;
    }
}

// ==================== 管理员验证中间件 ====================

function verifyAdmin(req, res, next) {
    const token = req.headers['x-admin-token'] || req.query.token;
    if (token === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ success: false, message: '未授权，请先登录' });
    }
}

// ==================== API路由 ====================

// 管理员登录
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: ADMIN_PASSWORD, message: '登录成功' });
    } else {
        res.status(401).json({ success: false, message: '密码错误' });
    }
});

// 获取所有题目（公开）
app.get('/api/questions', (req, res) => {
    const questions = readQuestions();
    const { module, type, page, limit } = req.query;

    let filtered = questions;

    if (module) {
        filtered = filtered.filter(q => q.module === module);
    }
    if (type) {
        filtered = filtered.filter(q => q.type === type);
    }

    // 分页
    if (page && limit) {
        const start = (parseInt(page) - 1) * parseInt(limit);
        const end = start + parseInt(limit);
        filtered = filtered.slice(start, end);
    }

    res.json({
        success: true,
        total: questions.length,
        filteredTotal: filtered.length,
        data: filtered
    });
});

// 获取单道题
app.get('/api/questions/:id', (req, res) => {
    const questions = readQuestions();
    const question = questions.find(q => q.id === parseInt(req.params.id));
    if (question) {
        res.json({ success: true, data: question });
    } else {
        res.status(404).json({ success: false, message: '题目不存在' });
    }
});

// 获取统计数据
app.get('/api/stats', (req, res) => {
    const questions = readQuestions();
    const stats = {
        total: questions.length,
        theory: questions.filter(q => q.module === '理论').length,
        practice: questions.filter(q => q.module === '实操').length,
        single: questions.filter(q => q.type === '单选题').length,
        multi: questions.filter(q => q.type === '多选题').length,
        judge: questions.filter(q => q.type === '判断题').length
    };
    res.json({ success: true, data: stats });
});

// 添加题目（需要管理员权限）
app.post('/api/questions', verifyAdmin, (req, res) => {
    const questions = readQuestions();
    const newQuestion = req.body;

    // 自动生成ID
    const maxId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) : 0;
    newQuestion.id = maxId + 1;

    // 验证必填字段
    if (!newQuestion.stem || !newQuestion.options || !newQuestion.answer) {
        return res.status(400).json({ success: false, message: '题目内容、选项和答案为必填项' });
    }

    questions.push(newQuestion);
    if (saveQuestions(questions)) {
        res.json({ success: true, message: '添加成功', data: newQuestion });
    } else {
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

// 批量添加题目（需要管理员权限）
app.post('/api/questions/batch', verifyAdmin, (req, res) => {
    const questions = readQuestions();
    const newQuestions = req.body.questions || [];

    if (!Array.isArray(newQuestions) || newQuestions.length === 0) {
        return res.status(400).json({ success: false, message: '请提供题目数组' });
    }

    let maxId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) : 0;
    let added = 0;

    newQuestions.forEach(q => {
        maxId++;
        q.id = maxId;
        if (q.stem && q.options && q.answer) {
            questions.push(q);
            added++;
        }
    });

    if (saveQuestions(questions)) {
        res.json({ success: true, message: `成功添加 ${added} 道题`, total: questions.length });
    } else {
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

// 修改题目（需要管理员权限）
app.put('/api/questions/:id', verifyAdmin, (req, res) => {
    const questions = readQuestions();
    const index = questions.findIndex(q => q.id === parseInt(req.params.id));

    if (index === -1) {
        return res.status(404).json({ success: false, message: '题目不存在' });
    }

    questions[index] = { ...questions[index], ...req.body, id: parseInt(req.params.id) };

    if (saveQuestions(questions)) {
        res.json({ success: true, message: '修改成功', data: questions[index] });
    } else {
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

// 删除题目（需要管理员权限）
app.delete('/api/questions/:id', verifyAdmin, (req, res) => {
    const questions = readQuestions();
    const index = questions.findIndex(q => q.id === parseInt(req.params.id));

    if (index === -1) {
        return res.status(404).json({ success: false, message: '题目不存在' });
    }

    const deleted = questions.splice(index, 1)[0];

    if (saveQuestions(questions)) {
        res.json({ success: true, message: '删除成功', data: deleted });
    } else {
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

// 导出题库（需要管理员权限）
app.get('/api/export', verifyAdmin, (req, res) => {
    const questions = readQuestions();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=questions.json');
    res.send(JSON.stringify(questions, null, 2));
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: '服务运行正常', time: new Date().toISOString() });
});

// ==================== 页面路由 ====================

// 管理员后台
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 首页（题库应用）
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== 启动服务 ====================

// 预加载题库数据
readQuestions();

app.listen(PORT, () => {
    console.log('========================================');
    console.log('  健康管理师题库后端服务已启动');
    console.log('========================================');
    console.log(`  端口: ${PORT}`);
    console.log(`  管理员密码: ${ADMIN_PASSWORD}`);
    console.log(`  题库数量: ${readQuestions().length} 道`);
    console.log('========================================');
});
