let data = {};

// Load data from server
async function load() {
  const res = await fetch('/api/data');
  data = await res.json();
  render();
}

// Render form with data
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

// Render project list
function renderProjects() {
  const container = document.getElementById('projectList');
  container.innerHTML = data.projects.map((p, i) => `
    <div class="project-item">
      <button type="button" class="remove-btn" onclick="removeProject(${i})">삭제</button>
      <label>프로젝트명</label>
      <input type="text" value="${p.name}" onchange="data.projects[${i}].name=this.value" />
      <label>태그 (예: iOS App)</label>
      <input type="text" value="${p.tag}" onchange="data.projects[${i}].tag=this.value" />
      <label>아이콘 이미지</label>
      <div class="icon-upload">
        <img class="icon-preview" src="${p.icon}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22/>'">
        <input type="file" accept="image/*" onchange="uploadIcon(${i}, this.files[0])" />
      </div>
      <input type="text" value="${p.icon}" onchange="data.projects[${i}].icon=this.value; renderProjects();" placeholder="또는 경로 직접 입력" style="margin-top:8px" />
      <label>설명</label>
      <textarea onchange="data.projects[${i}].description=this.value">${p.description}</textarea>
      <label>상세 페이지 경로</label>
      <input type="text" value="${p.link}" onchange="data.projects[${i}].link=this.value" />
      <label>스토어/웹사이트 링크 (App Store, 웹사이트 URL 등)</label>
      <input type="url" value="${p.storeLink || ''}" onchange="data.projects[${i}].storeLink=this.value" placeholder="https://apps.apple.com/..." />
      <label>개인정보처리방침 경로</label>
      <input type="text" value="${p.privacyLink || ''}" onchange="data.projects[${i}].privacyLink=this.value" />
      <label>이용약관 경로</label>
      <input type="text" value="${p.termsLink || ''}" onchange="data.projects[${i}].termsLink=this.value" />
    </div>
  `).join('');
}

// Add new project
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

// Remove project
function removeProject(i) {
  if (confirm(data.projects[i].name + ' 프로젝트를 삭제할까요?')) {
    data.projects.splice(i, 1);
    renderProjects();
  }
}

// Upload icon image
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

// Collect form data
function collect() {
  data.site.title = document.getElementById('siteTitle').value;
  data.site.copyright = document.getElementById('siteCopyright').value;
  data.profile.name = document.getElementById('profileName').value;
  data.profile.subtitle = document.getElementById('profileSubtitle').value;
  data.profile.bio = document.getElementById('profileBio').value;
  data.profile.github = document.getElementById('profileGithub').value;
  data.profile.email = document.getElementById('profileEmail').value;
}

// Save only (no deploy)
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

// Save and deploy
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

// Show toast notification
function showToast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.className = 'toast', 3000);
}

// Initialize
load();
