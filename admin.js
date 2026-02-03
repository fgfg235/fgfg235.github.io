const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const INDEX_FILE = path.join(__dirname, 'index.html');

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// --- HTML Generator ---

function generateIndexHtml(data) {
  const { site, profile, projects } = data;
  const bioHtml = profile.bio.split('\n').join('<br>\n    ');

  const projectCards = projects.map(p => `
    <a class="project-card" href="${p.link}">
      <div class="card-header">
        <div class="card-icon">${p.icon}</div>
        <div>
          <h3>${p.name}</h3>
          <span class="tag">${p.tag}</span>
        </div>
      </div>
      <p class="card-desc">${p.description}</p>
      <div class="card-links">
        <a href="${p.link}">소개</a>
        ${p.privacyLink ? `<a href="${p.privacyLink}">개인정보처리방침</a>` : ''}
        ${p.termsLink ? `<a href="${p.termsLink}">이용약관</a>` : ''}
      </div>
    </a>`).join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${site.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #fafafa;
    color: #333;
    min-height: 100vh;
  }
  nav {
    background: #fff;
    border-bottom: 1px solid #eee;
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 960px;
    margin: 0 auto;
  }
  nav .logo {
    font-size: 1.4em;
    font-weight: 700;
    color: #6B3FA0;
    text-decoration: none;
  }
  nav .nav-links a {
    color: #555;
    text-decoration: none;
    margin-left: 24px;
    font-size: 0.95em;
    font-weight: 500;
  }
  nav .nav-links a:hover { color: #6B3FA0; }
  .hero {
    text-align: center;
    padding: 80px 20px 48px;
    max-width: 640px;
    margin: 0 auto;
  }
  .hero h1 {
    font-size: 2.2em;
    font-weight: 700;
    color: #222;
    margin-bottom: 12px;
  }
  .hero .subtitle {
    font-size: 1.15em;
    color: #6B3FA0;
    font-weight: 600;
    margin-bottom: 16px;
  }
  .hero .bio {
    font-size: 1em;
    color: #666;
    line-height: 1.7;
  }
  .hero .links {
    margin-top: 24px;
    display: flex;
    justify-content: center;
    gap: 16px;
  }
  .hero .links a {
    color: #6B3FA0;
    text-decoration: none;
    font-size: 0.95em;
    font-weight: 500;
    padding: 8px 16px;
    border: 1px solid #6B3FA0;
    border-radius: 8px;
    transition: background 0.2s, color 0.2s;
  }
  .hero .links a:hover {
    background: #6B3FA0;
    color: #fff;
  }
  .section {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 20px 60px;
  }
  .section h2 {
    font-size: 1.5em;
    font-weight: 700;
    color: #222;
    margin-bottom: 24px;
    padding-bottom: 8px;
    border-bottom: 2px solid #6B3FA0;
    display: inline-block;
  }
  .projects {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
  }
  .project-card {
    background: #fff;
    border-radius: 16px;
    padding: 28px 24px;
    flex: 1 1 320px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    transition: transform 0.2s;
    text-decoration: none;
    color: inherit;
    display: block;
  }
  .project-card:hover { transform: translateY(-4px); }
  .project-card .card-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
  }
  .project-card .card-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: linear-gradient(135deg, #007AFF, #5856D6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: #fff;
    flex-shrink: 0;
  }
  .project-card .card-header h3 {
    font-size: 1.15em;
    color: #222;
  }
  .project-card .card-header .tag {
    font-size: 0.75em;
    color: #6B3FA0;
    background: #f3edf9;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
  }
  .project-card .card-desc {
    font-size: 0.92em;
    color: #666;
    line-height: 1.6;
  }
  .project-card .card-links {
    margin-top: 12px;
    font-size: 0.85em;
  }
  .project-card .card-links a {
    color: #6B3FA0;
    text-decoration: none;
    margin-right: 16px;
  }
  .project-card .card-links a:hover { text-decoration: underline; }
  .footer {
    border-top: 1px solid #eee;
    padding: 32px 20px;
    text-align: center;
    font-size: 0.85em;
    color: #aaa;
    max-width: 960px;
    margin: 0 auto;
  }
  .footer a { color: #6B3FA0; text-decoration: none; }
  @media (max-width: 600px) {
    .hero { padding: 48px 20px 32px; }
    .hero h1 { font-size: 1.7em; }
    nav .nav-links a { margin-left: 16px; font-size: 0.85em; }
  }
</style>
</head>
<body>

<nav>
  <a href="/" class="logo">${site.title}</a>
  <div class="nav-links">
    <a href="#about">About</a>
    <a href="#projects">Projects</a>
    <a href="#contact">Contact</a>
  </div>
</nav>

<section class="hero" id="about">
  <h1>${profile.name}</h1>
  <p class="subtitle">${profile.subtitle}</p>
  <p class="bio">
    ${bioHtml}
  </p>
  <div class="links">
    ${profile.github ? `<a href="${profile.github}" target="_blank">GitHub</a>` : ''}
    <a href="mailto:${profile.email}">Email</a>
  </div>
</section>

<section class="section" id="projects">
  <h2>Projects</h2>
  <div class="projects">${projectCards}
  </div>
</section>

<footer class="footer" id="contact">
  <p>&copy; ${site.copyright}</p>
  <p><a href="mailto:${profile.email}">${profile.email}</a></p>
</footer>

</body>
</html>
`;
}

// --- Git Deploy ---

function deploy() {
  try {
    execSync('git add data.json index.html', { cwd: __dirname, stdio: 'pipe' });
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
      <label>아이콘 (이모지)</label>
      <input type="text" value="\${p.icon}" onchange="data.projects[\${i}].icon=this.value" />
      <label>설명</label>
      <textarea onchange="data.projects[\${i}].description=this.value">\${p.description}</textarea>
      <label>링크 경로</label>
      <input type="text" value="\${p.link}" onchange="data.projects[\${i}].link=this.value" />
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
    icon: '📱',
    description: '',
    link: '',
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
