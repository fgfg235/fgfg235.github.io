const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const TEMPLATE_FILE = path.join(__dirname, 'template.html');
const INDEX_FILE = path.join(__dirname, 'index.html');

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// --- Multipart Parser ---

function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  let start = buffer.indexOf(boundaryBuffer) + boundaryBuffer.length + 2;

  while (true) {
    const end = buffer.indexOf(boundaryBuffer, start);
    if (end === -1) break;

    const part = buffer.slice(start, end - 2);
    const headerEnd = part.indexOf('\r\n\r\n');
    const header = part.slice(0, headerEnd).toString();
    const data = part.slice(headerEnd + 4);

    const nameMatch = header.match(/name="([^"]+)"/);
    const filenameMatch = header.match(/filename="([^"]+)"/);

    if (nameMatch) {
      parts.push({
        name: nameMatch[1],
        filename: filenameMatch ? filenameMatch[1] : null,
        data: filenameMatch ? data : data.toString()
      });
    }

    start = end + boundaryBuffer.length + 2;
  }

  return parts;
}

// --- Template Engine ---

function generateIndexHtml(data) {
  let template = fs.readFileSync(TEMPLATE_FILE, 'utf-8');

  // Replace simple variables: {{site.title}}, {{profile.name}}, etc.
  template = template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, obj, key) => {
    if (data[obj] && data[obj][key] !== undefined) {
      let value = data[obj][key];
      // Convert newlines to <br> for bio
      if (obj === 'profile' && key === 'bio') {
        value = value.split('\n').join('<br>\n    ');
      }
      return value;
    }
    return '';
  });

  // Handle conditionals: {{#profile.github}}...{{/profile.github}}
  template = template.replace(/\{\{#(\w+)\.(\w+)\}\}([\s\S]*?)\{\{\/\1\.\2\}\}/g, (match, obj, key, content) => {
    if (data[obj] && data[obj][key]) {
      return content;
    }
    return '';
  });

  // Handle projects loop: {{#projects}}...{{/projects}}
  template = template.replace(/\{\{#projects\}\}([\s\S]*?)\{\{\/projects\}\}/g, (match, itemTemplate) => {
    return data.projects.map(project => {
      let item = itemTemplate;
      // Replace project variables: {{name}}, {{tag}}, etc.
      item = item.replace(/\{\{(\w+)\}\}/g, (m, key) => {
        return project[key] !== undefined ? project[key] : '';
      });
      // Handle project conditionals: {{#privacyLink}}...{{/privacyLink}}
      item = item.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, key, content) => {
        return project[key] ? content : '';
      });
      return item;
    }).join('\n');
  });

  return template;
}

// --- Git Deploy ---

function deploy() {
  try {
    execSync('git add data.json index.html template.html images/', { cwd: __dirname, stdio: 'pipe' });
    const status = execSync('git status --porcelain', { cwd: __dirname, encoding: 'utf-8' });
    if (!status.trim()) {
      return { success: true, message: '변경사항 없음 - 배포 생략' };
    }
    execSync('git commit -m "Update site content via admin"', { cwd: __dirname, stdio: 'pipe' });
    execSync('git push origin main', { cwd: __dirname, stdio: 'pipe' });
    return { success: true, message: '배포 완료! 1-2분 후 반영됩니다.' };
  } catch (err) {
    return { success: false, message: 'Git 오류: ' + err.message };
  }
}

// --- Admin Page HTML ---

function getAdminHtml() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin - Weburple</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
  .header { background: #6B3FA0; color: #fff; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 1.2em; }
  .header a { color: #fff; text-decoration: none; opacity: 0.8; font-size: 0.9em; }
  .container { max-width: 720px; margin: 24px auto; padding: 0 16px; }
  .card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .card h2 { font-size: 1.1em; color: #6B3FA0; margin-bottom: 16px; }
  label { display: block; font-size: 0.85em; font-weight: 600; color: #555; margin-bottom: 4px; margin-top: 12px; }
  label:first-child { margin-top: 0; }
  input[type="text"], input[type="url"], input[type="email"], textarea {
    width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px;
    font-size: 0.95em; font-family: inherit; transition: border-color 0.2s;
  }
  input:focus, textarea:focus { outline: none; border-color: #6B3FA0; }
  textarea { resize: vertical; min-height: 80px; }
  .project-item { border: 1px solid #eee; border-radius: 8px; padding: 16px; margin-bottom: 12px; position: relative; }
  .project-item .remove-btn {
    position: absolute; top: 8px; right: 8px; background: #ff4444; color: #fff;
    border: none; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 0.8em;
  }
  .btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 0.95em; cursor: pointer; font-weight: 600; }
  .btn-primary { background: #6B3FA0; color: #fff; }
  .btn-primary:hover { background: #5a3490; }
  .btn-secondary { background: #eee; color: #333; }
  .btn-secondary:hover { background: #ddd; }
  .btn-deploy { background: #2ecc71; color: #fff; }
  .btn-deploy:hover { background: #27ae60; }
  .actions { display: flex; gap: 12px; margin-top: 24px; }
  .toast {
    position: fixed; bottom: 24px; right: 24px; padding: 14px 20px; border-radius: 10px;
    color: #fff; font-weight: 500; font-size: 0.95em; opacity: 0; transition: opacity 0.3s;
    z-index: 100;
  }
  .toast.show { opacity: 1; }
  .toast.success { background: #2ecc71; }
  .toast.error { background: #e74c3c; }
  .toast.info { background: #3498db; }
  .preview-link { display: inline-block; margin-top: 8px; color: #6B3FA0; font-size: 0.9em; }
  .icon-upload { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
  .icon-upload .icon-preview {
    width: 48px; height: 48px; border-radius: 10px; object-fit: cover;
    border: 1px solid #ddd; background: #f5f5f5;
  }
  .icon-upload input[type="file"] { flex: 1; }
</style>
</head>
<body>

<div class="header">
  <h1>Weburple Admin</h1>
  <a href="/" target="_blank">사이트 미리보기</a>
</div>

<div class="container">
  <form id="adminForm">

    <div class="card">
      <h2>사이트 설정</h2>
      <label>사이트 제목</label>
      <input type="text" id="siteTitle" />
      <label>저작권 표시</label>
      <input type="text" id="siteCopyright" />
    </div>

    <div class="card">
      <h2>프로필</h2>
      <label>이름</label>
      <input type="text" id="profileName" />
      <label>직함 / 한줄 소개</label>
      <input type="text" id="profileSubtitle" />
      <label>자기소개 (줄바꿈 가능)</label>
      <textarea id="profileBio" rows="4"></textarea>
      <label>GitHub URL</label>
      <input type="url" id="profileGithub" />
      <label>이메일</label>
      <input type="email" id="profileEmail" />
    </div>

    <div class="card">
      <h2>프로젝트</h2>
      <div id="projectList"></div>
      <button type="button" class="btn btn-secondary" onclick="addProject()">+ 프로젝트 추가</button>
    </div>

    <div class="actions">
      <button type="button" class="btn btn-primary" onclick="save()">저장</button>
      <button type="button" class="btn btn-deploy" onclick="saveAndDeploy()">저장 & 배포</button>
    </div>

  </form>
</div>

<div class="toast" id="toast"></div>

<script>
let data = {};

async function load() {
  const res = await fetch('/api/data');
  data = await res.json();
  render();
}

function render() {
  document.getElementById('siteTitle').value = data.site.title;
  document.getElementById('siteCopyright').value = data.site.copyright;
  document.getElementById('profileName').value = data.profile.name;
  document.getElementById('profileSubtitle').value = data.profile.subtitle;
  document.getElementById('profileBio').value = data.profile.bio;
  document.getElementById('profileGithub').value = data.profile.github || '';
  document.getElementById('profileEmail').value = data.profile.email;
  renderProjects();
}

function renderProjects() {
  const container = document.getElementById('projectList');
  container.innerHTML = data.projects.map((p, i) => \`
    <div class="project-item">
      <button type="button" class="remove-btn" onclick="removeProject(\${i})">삭제</button>
      <label>프로젝트명</label>
      <input type="text" value="\${p.name}" onchange="data.projects[\${i}].name=this.value" />
      <label>태그 (예: iOS App)</label>
      <input type="text" value="\${p.tag}" onchange="data.projects[\${i}].tag=this.value" />
      <label>아이콘 이미지</label>
      <div class="icon-upload">
        <img class="icon-preview" src="\${p.icon}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22/>'">
        <input type="file" accept="image/*" onchange="uploadIcon(\${i}, this.files[0])" />
      </div>
      <input type="text" value="\${p.icon}" onchange="data.projects[\${i}].icon=this.value; renderProjects();" placeholder="또는 경로 직접 입력" style="margin-top:8px" />
      <label>설명</label>
      <textarea onchange="data.projects[\${i}].description=this.value">\${p.description}</textarea>
      <label>상세 페이지 경로</label>
      <input type="text" value="\${p.link}" onchange="data.projects[\${i}].link=this.value" />
      <label>스토어/웹사이트 링크 (App Store, 웹사이트 URL 등)</label>
      <input type="url" value="\${p.storeLink || ''}" onchange="data.projects[\${i}].storeLink=this.value" placeholder="https://apps.apple.com/..." />
      <label>개인정보처리방침 경로</label>
      <input type="text" value="\${p.privacyLink || ''}" onchange="data.projects[\${i}].privacyLink=this.value" />
      <label>이용약관 경로</label>
      <input type="text" value="\${p.termsLink || ''}" onchange="data.projects[\${i}].termsLink=this.value" />
    </div>
  \`).join('');
}

function addProject() {
  data.projects.push({
    id: 'project-' + Date.now(),
    name: '새 프로젝트',
    tag: 'App',
    icon: 'images/',
    description: '',
    link: '',
    storeLink: '',
    privacyLink: '',
    termsLink: ''
  });
  renderProjects();
}

function removeProject(i) {
  if (confirm(data.projects[i].name + ' 프로젝트를 삭제할까요?')) {
    data.projects.splice(i, 1);
    renderProjects();
  }
}

async function uploadIcon(projectIndex, file) {
  if (!file) return;
  const formData = new FormData();
  formData.append('image', file);
  formData.append('projectId', data.projects[projectIndex].id);

  const res = await fetch('/api/upload-icon', { method: 'POST', body: formData });
  const result = await res.json();

  if (result.success) {
    data.projects[projectIndex].icon = result.path;
    renderProjects();
    showToast('아이콘 업로드 완료', 'success');
  } else {
    showToast(result.message, 'error');
  }
}

function collect() {
  data.site.title = document.getElementById('siteTitle').value;
  data.site.copyright = document.getElementById('siteCopyright').value;
  data.profile.name = document.getElementById('profileName').value;
  data.profile.subtitle = document.getElementById('profileSubtitle').value;
  data.profile.bio = document.getElementById('profileBio').value;
  data.profile.github = document.getElementById('profileGithub').value;
  data.profile.email = document.getElementById('profileEmail').value;
}

async function save() {
  collect();
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  showToast(result.message, result.success ? 'success' : 'error');
}

async function saveAndDeploy() {
  collect();
  const res = await fetch('/api/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  showToast(result.message, result.success ? 'success' : 'error');
}

function showToast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.className = 'toast', 3000);
}

load();
</script>
</body>
</html>`;
}

// --- HTTP Server ---

const server = http.createServer((req, res) => {
  // API: Get data
  if (req.method === 'GET' && req.url === '/api/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(loadData()));
    return;
  }

  // API: Save only
  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        saveData(data);
        const html = generateIndexHtml(data);
        fs.writeFileSync(INDEX_FILE, html, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: '저장 완료!' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // API: Save & Deploy
  if (req.method === 'POST' && req.url === '/api/deploy') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        saveData(data);
        const html = generateIndexHtml(data);
        fs.writeFileSync(INDEX_FILE, html, 'utf-8');
        const result = deploy();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // API: Upload icon image
  if (req.method === 'POST' && req.url === '/api/upload-icon') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const boundary = req.headers['content-type'].split('boundary=')[1];
        const parts = parseMultipart(buffer, boundary);

        const imagePart = parts.find(p => p.name === 'image');
        const projectIdPart = parts.find(p => p.name === 'projectId');

        if (!imagePart || !projectIdPart) {
          throw new Error('Missing image or projectId');
        }

        const ext = imagePart.filename.split('.').pop().toLowerCase();
        const filename = projectIdPart.data.toString() + '.' + ext;
        const filepath = path.join(__dirname, 'images', filename);

        fs.writeFileSync(filepath, imagePart.data);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, path: 'images/' + filename }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // Admin page
  if (req.url === '/admin' || req.url === '/admin/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getAdminHtml());
    return;
  }

  // Serve static files for preview
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const mimeTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Try with index.html for directories
      filePath = path.join(filePath, 'index.html');
      fs.readFile(filePath, (err2, content2) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content2);
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n  Weburple Admin Server`);
  console.log(`  ─────────────────────`);
  console.log(`  관리자 페이지:  http://localhost:${PORT}/admin`);
  console.log(`  사이트 미리보기: http://localhost:${PORT}/`);
  console.log(`\n  종료: Ctrl+C\n`);
});
