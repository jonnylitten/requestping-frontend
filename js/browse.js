// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}

// Logout functionality
document.getElementById('logout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

// State
let allEntities = [];
let filteredEntities = [];
let sortColumn = 'name';
let sortDirection = 'asc';

// Category labels
const categoryLabels = {
    'state_agency': 'State Agency',
    'county': 'County',
    'city': 'City',
    'town': 'Town',
    'university': 'University'
};

// Load all entities
async function loadEntities() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/entities`);
        const data = await response.json();
        allEntities = data.entities;
        filteredEntities = [...allEntities];

        updateStats();
        renderTable();
    } catch (error) {
        console.error('Error loading entities:', error);
        document.getElementById('entities-tbody').innerHTML =
            '<tr><td colspan="4" class="no-results">Error loading entities. Please refresh.</td></tr>';
    }
}

// Update statistics
function updateStats() {
    document.getElementById('total-count').textContent = allEntities.length;
    document.getElementById('filtered-count').textContent = filteredEntities.length;
    document.getElementById('email-count').textContent =
        allEntities.filter(e => e.email).length;
    document.getElementById('portal-count').textContent =
        allEntities.filter(e => e.portal).length;
}

// Filter entities
function filterEntities() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    const contactFilter = document.getElementById('contact-filter').value;

    filteredEntities = allEntities.filter(entity => {
        // Search filter
        const matchesSearch = !searchTerm ||
            entity.name.toLowerCase().includes(searchTerm) ||
            (entity.abbreviation && entity.abbreviation.toLowerCase().includes(searchTerm)) ||
            (entity.description && entity.description.toLowerCase().includes(searchTerm)) ||
            (entity.foia_officer && entity.foia_officer.toLowerCase().includes(searchTerm));

        // Category filter
        const matchesCategory = !categoryFilter || entity.category === categoryFilter;

        // Contact method filter
        let matchesContact = true;
        if (contactFilter === 'email') {
            matchesContact = entity.email !== null;
        } else if (contactFilter === 'portal') {
            matchesContact = entity.portal !== null;
        }

        return matchesSearch && matchesCategory && matchesContact;
    });

    updateStats();
    renderTable();
}

// Sort entities
function sortEntities(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    filteredEntities.sort((a, b) => {
        let aVal = a[column] || '';
        let bVal = b[column] || '';

        // Special handling for category to use labels
        if (column === 'category') {
            aVal = categoryLabels[aVal] || aVal;
            bVal = categoryLabels[bVal] || bVal;
        }

        aVal = aVal.toString().toLowerCase();
        bVal = bVal.toString().toLowerCase();

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    renderTable();
}

// Render table
function renderTable() {
    const tbody = document.getElementById('entities-tbody');

    if (filteredEntities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-results">No entities found matching your filters.</td></tr>';
        return;
    }

    const html = filteredEntities.map(entity => {
        const categoryLabel = categoryLabels[entity.category] || entity.category;
        const displayName = entity.abbreviation
            ? `${entity.name} (${entity.abbreviation})`
            : entity.name;

        const emailBadge = entity.email
            ? '<span class="contact-badge">Email</span>'
            : '';
        const portalBadge = entity.portal
            ? '<span class="contact-badge portal">Portal</span>'
            : '';

        const contactInfo = [];
        if (entity.email) contactInfo.push(`Email: ${entity.email}`);
        if (entity.phone) contactInfo.push(`Phone: ${entity.phone}`);
        if (entity.portal) contactInfo.push('Portal available');

        const contactDisplay = contactInfo.length > 0
            ? contactInfo.join('<br>')
            : 'Contact via website';

        return `
            <tr>
                <td><strong>${displayName}</strong><br>
                    <small style="color: var(--text-secondary);">${entity.description || ''}</small>
                </td>
                <td><span class="category-badge badge-${entity.category}">${categoryLabel}</span></td>
                <td class="hide-mobile">${entity.foia_officer || '-'}</td>
                <td class="hide-mobile">${emailBadge}${portalBadge}<br>
                    <small style="color: var(--text-secondary);">${contactDisplay}</small>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = html;
}

// Event listeners
document.getElementById('search').addEventListener('input', filterEntities);
document.getElementById('category-filter').addEventListener('change', filterEntities);
document.getElementById('contact-filter').addEventListener('change', filterEntities);

// Sort column headers
document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
        sortEntities(th.dataset.sort);
    });
});

// Load entities on page load
loadEntities();
