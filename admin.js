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

    // Check if there are staged changes
    try {
      execSync('git diff --cached --quiet', { cwd: __dirname, stdio: 'pipe' });
      // If no error, there are no staged changes
      return { success: true, message: '변경사항 없음 - 배포 생략' };
    } catch (e) {
      // If error, there are staged changes - proceed with commit
    }

    execSync('git commit -m "Update site content via admin"', { cwd: __dirname, stdio: 'pipe' });
    execSync('git push origin main', { cwd: __dirname, stdio: 'pipe' });
    return { success: true, message: '배포 완료! 1-2분 후 반영됩니다.' };
  } catch (err) {
    return { success: false, message: 'Git 오류: ' + err.message };
  }
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
    const adminHtml = fs.readFileSync(path.join(__dirname, 'admin', 'admin.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(adminHtml);
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
