# 健康管理师题库 - Render部署指南

## 部署前准备

1. 注册一个GitHub账号（免费）：https://github.com/signup
2. 注册一个Render账号（免费，用GitHub账号登录即可）：https://dashboard.render.com/register

## 部署步骤

### 第一步：创建GitHub仓库

1. 登录GitHub，点击右上角 "+" -> "New repository"
2. Repository name: `health-quiz`
3. 选择 "Public" 或 "Private"
4. 勾选 "Add a README file"
5. 点击 "Create repository"

### 第二步：上传代码

1. 在仓库页面，点击 "Add file" -> "Upload files"
2. 将本目录下的所有文件拖拽上传：
   - server.js
   - package.json
   - public/index.html
   - public/admin.html
   - data/questions.json
3. 点击 "Commit changes"

### 第三步：在Render上部署

1. 登录Render：https://dashboard.render.com
2. 点击 "New +" -> "Web Service"
3. 选择刚才创建的GitHub仓库 `health-quiz`
4. 配置信息：
   - Name: `health-quiz`（这个会成为你的网址前缀）
   - Region: 选择离你近的（如 Singapore）
   - Branch: `main`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. 点击 "Create Web Service"
6. 等待部署完成（约2-5分钟）

### 第四步：获取固定网址

部署完成后，Render会给你一个固定的免费网址：
- 格式：`https://health-quiz.onrender.com`
- 管理后台：`https://health-quiz.onrender.com/admin`
- 管理员密码：`admin123`（可在Render环境变量中修改）

## 重要说明

### 数据存储
- Render免费层的文件系统是临时的，服务重启后会重置
- 本应用使用内存存储，修改题库后在服务运行期间有效
- 服务休眠或重启后，题库会重置为默认数据
- 建议定期导出题库备份（管理后台 -> 导出题库）

### 服务休眠
- Render免费层在15分钟无请求后会休眠
- 下次访问时需要等待5-10秒启动
- 可以使用免费的监控服务（如UptimeRobot）定期访问，防止休眠

### 修改管理员密码
在Render控制面板：
1. 进入你的Web Service
2. 点击 "Environment"
3. 添加环境变量：`ADMIN_PASSWORD` = 你的新密码
4. 保存后服务会自动重启

## 文件说明

- `server.js` - 后端服务主程序
- `package.json` - Node.js依赖配置
- `public/index.html` - 题库应用前端
- `public/admin.html` - 管理员后台
- `data/questions.json` - 默认题库数据（1639道题）

## 常见问题

**Q: 部署失败怎么办？**
A: 查看Render的日志，检查是否有错误信息。常见问题：文件上传不完整、package.json配置错误。

**Q: 网址打不开怎么办？**
A: Render免费层首次访问需要等待服务启动，约5-10秒。如果长时间打不开，检查Render控制面板的服务状态。

**Q: 修改题库后重启丢失了怎么办？**
A: 这是正常的，Render免费层文件系统是临时的。建议修改后立即导出备份，然后联系开发者更新默认题库数据。
