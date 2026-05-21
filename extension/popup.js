const API_BASE = 'https://lost-pet-tracker-api.fly.dev';

// DOM refs
const sections = {
  initial:  document.getElementById('initial'),
  loading:  document.getElementById('loading'),
  parsed:   document.getElementById('parsed'),
  matches:  document.getElementById('matches'),
  saved:    document.getElementById('saved'),
  bulk:     document.getElementById('bulk'),
  bulkDone: document.getElementById('bulkDone'),
  error:    document.getElementById('error'),
  noPet:    document.getElementById('noPet'),
};
const loadingText = document.getElementById('loadingText');
const petInfo     = document.getElementById('petInfo');
const matchList   = document.getElementById('matchList');
const errorText   = document.getElementById('errorText');

let parsedPet = null;
let pageImageUrl = null;
let pendingBulkPosts = [];
let singlePostFallback = null; // {text, imageUrl} saved when bulk mode shown

// Lightweight hash for dedup — same text always produces same id
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

function showSection(name) {
  Object.entries(sections).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== name);
  });
}

function showError(msg) {
  errorText.textContent = msg;
  showSection('error');
}

// --- Step 1: Scan the page (100% local — no AI, no API calls) ---
document.getElementById('scanBtn').addEventListener('click', async () => {
  showSection('loading');
  loadingText.textContent = 'Scanning page...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });

    const pageText = result?.text || '';
    pageImageUrl = result?.imageUrl || null;
    const feedPosts = result?.feedPosts || [];

    // --- Bulk mode: 2+ pet-related posts detected on a feed page ---
    const petFeedPosts = feedPosts.filter(p => isPetRelated(p.text));
    if (petFeedPosts.length >= 2) {
      pendingBulkPosts = petFeedPosts;
      singlePostFallback = { text: pageText, imageUrl: pageImageUrl };
      document.getElementById('feedCount').textContent = petFeedPosts.length;
      showSection('bulk');
      return;
    }

    // --- Single post mode (existing flow) ---
    if (!pageText || pageText.length < 10) {
      showSection('noPet');
      return;
    }

    parsedPet = parsePost(pageText);

    if (!isPetRelated(pageText)) {
      showSection('noPet');
      return;
    }

    await enhanceWithBackend(pageText);
    renderPetCard(parsedPet, pageImageUrl);
    showSection('parsed');

  } catch (err) {
    showError(err.message || 'Something went wrong');
  }
});

// --- Shared: optional backend enhancement for single post ---
async function enhanceWithBackend(pageText) {
  try {
    const res = await fetch(`${API_BASE}/api/parse-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: pageText }),
    });
    if (res.ok) {
      const server = await res.json();
      if (server.name) parsedPet.name = server.name;
      if (server.description) parsedPet.description = server.description;
      if (server.breed && !parsedPet.breed) parsedPet.breed = server.breed;
      if (server.color && !parsedPet.color) parsedPet.color = server.color;
      if (server.location && !parsedPet.location) parsedPet.location = server.location;
      if (server.dateLost && !parsedPet.dateLost) parsedPet.dateLost = server.dateLost;
    }
  } catch {
    // Backend unavailable — local extraction is still fine
  }
}

// --- Bulk import handler ---
document.getElementById('bulkImportBtn').addEventListener('click', async () => {
  showSection('loading');
  loadingText.textContent = `Importing ${pendingBulkPosts.length} posts...`;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const source = new URL(tab.url).hostname.replace(/^www\./, '');

    const pets = pendingBulkPosts.map(post => {
      const parsed = parsePost(post.text);
      return {
        ...parsed,
        location: parsed.location || 'Unknown',
        imageUrl: post.imageUrl || null,
        source,
        // Prefer a real post ID (e.g. Reddit's t3_abc123) over a text hash
        externalId: post.externalId || simpleHash(post.text.slice(0, 200)),
      };
    });

    const res = await fetch(`${API_BASE}/api/batch-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pets }),
    });

    if (!res.ok) throw new Error('Batch import failed');
    const data = await res.json();

    document.getElementById('bulkAdded').textContent = data.added;
    document.getElementById('bulkSkipped').textContent = data.skipped;
    showSection('bulkDone');
  } catch (err) {
    showError(err.message || 'Bulk import failed');
  }
});

// "Scan as Single Post" falls back to the single post extracted alongside the feed
document.getElementById('singleModeBtn').addEventListener('click', async () => {
  if (!singlePostFallback) { showSection('initial'); return; }

  const { text, imageUrl: img } = singlePostFallback;
  pageImageUrl = img;

  if (!text || !isPetRelated(text)) { showSection('noPet'); return; }

  parsedPet = parsePost(text);
  await enhanceWithBackend(text);
  renderPetCard(parsedPet, pageImageUrl);
  showSection('parsed');
});

// Bulk done retry
document.getElementById('bulkRetryBtn').addEventListener('click', () => showSection('initial'));
document.getElementById('savedRetryBtn').addEventListener('click', () => showSection('initial'));

// --- Step 2: Check for matches (hits backend DB, no AI) ---
document.getElementById('matchBtn').addEventListener('click', async () => {
  if (!parsedPet) return;

  showSection('loading');
  loadingText.textContent = 'Checking for matches...';

  try {
    // Use corrected form values for matching
    parsedPet = { ...parsedPet, ...readForm() };

    const res = await fetch(`${API_BASE}/api/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsedPet),
    });

    if (!res.ok) throw new Error('Match request failed');

    const data = await res.json();
    renderMatches(data.matches);

    sections.parsed.classList.remove('hidden');
    sections.matches.classList.remove('hidden');
    sections.loading.classList.add('hidden');

    document.getElementById('matchBtn').textContent = 'Matches loaded';
    document.getElementById('matchBtn').disabled = true;

  } catch (err) {
    showError(err.message || 'Could not check matches');
  }
});

// Read current values from the editable form
function readForm() {
  return {
    type:     document.getElementById('edit-type').value,
    petType:  document.getElementById('edit-petType').value,
    name:     document.getElementById('edit-name').value.trim(),
    breed:    document.getElementById('edit-breed').value.trim(),
    color:    document.getElementById('edit-color').value.trim(),
    location: document.getElementById('edit-location').value.trim() || 'Unknown',
    dateLost: document.getElementById('edit-dateLost').value.trim(),
    description: document.getElementById('edit-description').value.trim(),
  };
}

// --- Step 3: Save to database (no AI) ---
document.getElementById('saveBtn').addEventListener('click', async () => {
  showSection('loading');
  loadingText.textContent = 'Saving...';

  try {
    const data = readForm();
    // Update parsedPet so match also uses corrected values
    parsedPet = { ...parsedPet, ...data };

    const formData = new FormData();
    formData.append('type', data.type);
    formData.append('petType', data.petType);
    formData.append('name', data.name);
    formData.append('breed', data.breed);
    formData.append('color', data.color);
    formData.append('location', data.location);
    formData.append('dateLost', data.dateLost);
    formData.append('description', data.description);

    if (pageImageUrl) {
      formData.append('imageUrl', pageImageUrl);
    }

    const res = await fetch(`${API_BASE}/api/report`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Failed to save');

    showSection('saved');

  } catch (err) {
    showError(err.message || 'Could not save pet');
  }
});

// Retry buttons
document.getElementById('retryBtn').addEventListener('click', () => showSection('initial'));
document.getElementById('retryBtn2').addEventListener('click', () => showSection('initial'));

// --- Render helpers ---

function renderPetCard(pet, imageUrl) {
  let html = '';

  if (imageUrl) {
    html += `<img src="${escapeHtml(imageUrl)}" alt="Pet photo" class="pet-image" onerror="this.style.display='none'">`;
  }

  html += `
    <div class="edit-row">
      <label>Status</label>
      <select id="edit-type" class="edit-input">
        <option value="lost" ${pet.type === 'lost' ? 'selected' : ''}>Lost</option>
        <option value="found" ${pet.type === 'found' ? 'selected' : ''}>Found</option>
      </select>
    </div>
    <div class="edit-row">
      <label>Pet type</label>
      <select id="edit-petType" class="edit-input">
        <option value="dog" ${pet.petType === 'dog' ? 'selected' : ''}>Dog</option>
        <option value="cat" ${pet.petType === 'cat' ? 'selected' : ''}>Cat</option>
        <option value="other" ${pet.petType === 'other' ? 'selected' : ''}>Other</option>
      </select>
    </div>
    <div class="edit-row">
      <label>Name</label>
      <input id="edit-name" class="edit-input" value="${escapeAttr(pet.name || '')}" placeholder="If known">
    </div>
    <div class="edit-row">
      <label>Breed</label>
      <input id="edit-breed" class="edit-input" value="${escapeAttr(pet.breed || '')}" placeholder="e.g. Golden Retriever">
    </div>
    <div class="edit-row">
      <label>Color</label>
      <input id="edit-color" class="edit-input" value="${escapeAttr(pet.color || '')}" placeholder="e.g. Black and white">
    </div>
    <div class="edit-row">
      <label>Location</label>
      <input id="edit-location" class="edit-input" value="${escapeAttr(pet.location || '')}" placeholder="e.g. Brooklyn, NY">
    </div>
    <div class="edit-row">
      <label>Date</label>
      <input id="edit-dateLost" class="edit-input" type="date" value="${escapeAttr(pet.dateLost || '')}">
    </div>
    <div class="edit-row edit-row-col">
      <label>Description</label>
      <textarea id="edit-description" class="edit-input edit-textarea" rows="2" placeholder="Any details...">${escapeHtml(pet.description || '')}</textarea>
    </div>
  `;

  petInfo.innerHTML = html;
}

function renderMatches(matches) {
  if (!matches.length) {
    matchList.innerHTML = '<p class="no-matches">No matches found in the database yet.</p>';
    return;
  }

  matchList.innerHTML = matches.map(m => {
    const title = m.name || `${capitalize(m.type)} ${m.petType}`;
    const details = [m.breed, m.color, m.location].filter(Boolean).join(' · ');
    const imgSrc = m.imageUrl
      ? (m.imageUrl.startsWith('http') ? m.imageUrl : `${API_BASE}${m.imageUrl}`)
      : '';
    const imageHtml = imgSrc
      ? `<img src="${escapeHtml(imgSrc)}" alt="" class="match-image" onerror="this.style.display='none'">`
      : '';
    const reasonsHtml = m.reasons?.length
      ? `<ul class="match-reasons">${m.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`
      : '';

    return `<div class="match-card">
      ${imageHtml}
      <div class="match-header">
        <span class="match-title">${escapeHtml(title)}</span>
        <span class="match-score">${m.matchScore}%</span>
      </div>
      <div class="match-detail">${escapeHtml(details)}</div>
      ${reasonsHtml}
      <a href="https://lost-pet-tracker-five.vercel.app/pets/${m.id}" target="_blank" class="match-link">View details</a>
    </div>`;
  }).join('');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
