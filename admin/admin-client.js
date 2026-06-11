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

  document.getElementById('heroSubtitleKo').value = data.hero.subtitle.ko;
  document.getElementById('heroSubtitleEn').value = data.hero.subtitle.en;
  document.getElementById('heroTaglineKo').value = data.hero.tagline.ko;
  document.getElementById('heroTaglineEn').value = data.hero.tagline.en;

  document.getElementById('aboutName').value = data.about.name;
  document.getElementById('aboutBioKo').value = data.about.bio.ko;
  document.getElementById('aboutBioEn').value = data.about.bio.en;
  document.getElementById('aboutGithub').value = data.about.github || '';
  document.getElementById('aboutEmail').value = data.about.email;

  document.getElementById('contactTitleKo').value = data.contact.title.ko;
  document.getElementById('contactTitleEn').value = data.contact.title.en;
  document.getElementById('contactMessageKo').value = data.contact.message.ko;
  document.getElementById('contactMessageEn').value = data.contact.message.en;

  renderProjects();
}

// Render project list
function renderProjects() {
  var container = document.getElementById('projectList');
  container.innerHTML = data.projects.map(function(p, i) {
    var descKo = typeof p.description === 'object' ? p.description.ko : p.description;
    var descEn = typeof p.description === 'object' ? p.description.en : '';
    return '<div class="project-item">' +
      '<button type="button" class="remove-btn" onclick="removeProject(' + i + ')">삭제</button>' +
      '<label>프로젝트명</label>' +
      '<input type="text" value="' + escapeAttr(p.name) + '" onchange="data.projects[' + i + '].name=this.value" />' +
      '<label>태그 (예: iOS App)</label>' +
      '<input type="text" value="' + escapeAttr(p.tag) + '" onchange="data.projects[' + i + '].tag=this.value" />' +
      '<label>아이콘 이미지</label>' +
      '<div class="icon-upload">' +
        '<img class="icon-preview" src="' + escapeAttr(p.icon) + '" onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22/>\'">' +
        '<input type="file" accept="image/*" onchange="uploadIcon(' + i + ', this.files[0])" />' +
      '</div>' +
      '<input type="text" value="' + escapeAttr(p.icon) + '" onchange="data.projects[' + i + '].icon=this.value; renderProjects();" placeholder="또는 경로 직접 입력" style="margin-top:8px" />' +
      '<div class="bilingual-group">' +
        '<label>설명 (KO)</label>' +
        '<textarea onchange="updateDescKo(' + i + ', this.value)">' + escapeHtml(descKo) + '</textarea>' +
        '<label>설명 (EN)</label>' +
        '<textarea onchange="updateDescEn(' + i + ', this.value)">' + escapeHtml(descEn) + '</textarea>' +
      '</div>' +
      '<label>상세 페이지 경로</label>' +
      '<input type="text" value="' + escapeAttr(p.link) + '" onchange="data.projects[' + i + '].link=this.value" />' +
      '<label>App Store 링크</label>' +
      '<input type="url" value="' + escapeAttr(p.appStoreLink || '') + '" onchange="data.projects[' + i + '].appStoreLink=this.value" placeholder="https://apps.apple.com/..." />' +
      '<label>Website 링크</label>' +
      '<input type="url" value="' + escapeAttr(p.websiteLink || '') + '" onchange="data.projects[' + i + '].websiteLink=this.value" placeholder="https://example.com" />' +
      '<label>개인정보처리방침 경로</label>' +
      '<input type="text" value="' + escapeAttr(p.privacyLink || '') + '" onchange="data.projects[' + i + '].privacyLink=this.value" />' +
      '<label>이용약관 경로</label>' +
      '<input type="text" value="' + escapeAttr(p.termsLink || '') + '" onchange="data.projects[' + i + '].termsLink=this.value" />' +
    '</div>';
  }).join('');
}

function updateDescKo(i, val) {
  if (typeof data.projects[i].description !== 'object') {
    data.projects[i].description = { ko: '', en: '' };
  }
  data.projects[i].description.ko = val;
}

function updateDescEn(i, val) {
  if (typeof data.projects[i].description !== 'object') {
    data.projects[i].description = { ko: '', en: '' };
  }
  data.projects[i].description.en = val;
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Add new project
function addProject() {
  data.projects.push({
    id: 'project-' + Date.now(),
    name: '새 프로젝트',
    tag: 'App',
    icon: 'images/',
    description: { ko: '', en: '' },
    link: '',
    appStoreLink: '',
    websiteLink: '',
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
  var formData = new FormData();
  formData.append('image', file);
  formData.append('projectId', data.projects[projectIndex].id);

  var res = await fetch('/api/upload-icon', { method: 'POST', body: formData });
  var result = await res.json();

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

  data.hero.subtitle.ko = document.getElementById('heroSubtitleKo').value;
  data.hero.subtitle.en = document.getElementById('heroSubtitleEn').value;
  data.hero.tagline.ko = document.getElementById('heroTaglineKo').value;
  data.hero.tagline.en = document.getElementById('heroTaglineEn').value;

  data.about.name = document.getElementById('aboutName').value;
  data.about.bio.ko = document.getElementById('aboutBioKo').value;
  data.about.bio.en = document.getElementById('aboutBioEn').value;
  data.about.github = document.getElementById('aboutGithub').value;
  data.about.email = document.getElementById('aboutEmail').value;

  data.contact.title.ko = document.getElementById('contactTitleKo').value;
  data.contact.title.en = document.getElementById('contactTitleEn').value;
  data.contact.message.ko = document.getElementById('contactMessageKo').value;
  data.contact.message.en = document.getElementById('contactMessageEn').value;
}

// Save only (no deploy)
async function save() {
  collect();
  var res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  var result = await res.json();
  showToast(result.message, result.success ? 'success' : 'error');
}

// Save and deploy
async function saveAndDeploy() {
  collect();
  var res = await fetch('/api/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  var result = await res.json();
  showToast(result.message, result.success ? 'success' : 'error');
}

// Show toast notification
function showToast(msg, type) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(function() { el.className = 'toast'; }, 3000);
}

// Initialize
load();
