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

// State management
let allEntities = [];
let currentCategory = 'state_agency';
let selectedEntity = null;

// Load all entities on page load
async function loadEntities() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/entities`);
        const data = await response.json();
        allEntities = data.entities;
    } catch (error) {
        console.error('Error loading entities:', error);
    }
}

// Category tab switching
document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        // Update active tab
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        // Update current category
        currentCategory = this.dataset.category;

        // Clear search and results
        document.getElementById('entity-search').value = '';
        document.getElementById('autocomplete-results').innerHTML = '';
        clearSelectedEntity();
    });
});

// Real-time autocomplete search
const searchInput = document.getElementById('entity-search');
const resultsContainer = document.getElementById('autocomplete-results');

searchInput.addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase().trim();

    // Clear results if query is empty
    if (query.length === 0) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }

    // Filter entities by current category and search query
    const filtered = allEntities
        .filter(entity => entity.category === currentCategory)
        .filter(entity =>
            entity.name.toLowerCase().includes(query) ||
            (entity.abbreviation && entity.abbreviation.toLowerCase().includes(query)) ||
            (entity.description && entity.description.toLowerCase().includes(query))
        )
        .slice(0, 10); // Limit to 10 results

    displayAutocompleteResults(filtered);
});

// Display autocomplete results
function displayAutocompleteResults(entities) {
    if (entities.length === 0) {
        resultsContainer.innerHTML = '<div class="autocomplete-item no-results">No results found</div>';
        resultsContainer.style.display = 'block';
        return;
    }

    const html = entities.map(entity => {
        const displayName = entity.abbreviation
            ? `${entity.name} (${entity.abbreviation})`
            : entity.name;
        const description = entity.description || '';
        const hasEmail = entity.email ? '<span class="entity-badge">Email</span>' : '';
        const hasPortal = entity.portal ? '<span class="entity-badge portal">Portal</span>' : '';

        return `
            <div class="autocomplete-item" data-entity-id="${entity.id}">
                <div class="entity-name">${displayName} ${hasEmail} ${hasPortal}</div>
                ${description ? `<div class="entity-description">${description}</div>` : ''}
            </div>
        `;
    }).join('');

    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';

    // Add click handlers to results
    document.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', function() {
            const entityId = this.dataset.entityId;
            const entity = allEntities.find(e => e.id === entityId);
            if (entity) {
                selectEntity(entity);
            }
        });
    });
}

// Select an entity
function selectEntity(entity) {
    selectedEntity = entity;

    // Update hidden fields
    document.getElementById('selected-entity-id').value = entity.id;
    document.getElementById('selected-entity-category').value = entity.category;
    document.getElementById('selected-entity-name').value = entity.name;
    document.getElementById('selected-entity-abbr').value = entity.abbreviation || '';

    // Update search input
    const displayName = entity.abbreviation
        ? `${entity.name} (${entity.abbreviation})`
        : entity.name;
    searchInput.value = displayName;

    // Hide autocomplete results
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'none';

    // Show selected entity card
    displaySelectedEntity(entity);
}

// Display selected entity information
function displaySelectedEntity(entity) {
    const displayDiv = document.getElementById('selected-entity-display');

    const emailInfo = entity.email
        ? `<p><strong>Email:</strong> ${entity.email}</p>`
        : '';

    const phoneInfo = entity.phone
        ? `<p><strong>Phone:</strong> ${entity.phone}</p>`
        : '';

    const officerInfo = entity.foia_officer
        ? `<p><strong>FOIA Officer:</strong> ${entity.foia_officer}</p>`
        : '';

    const portalInfo = entity.portal
        ? `<p><strong>Portal:</strong> <a href="${entity.portal}" target="_blank">${entity.portal}</a></p>`
        : '';

    const notesInfo = entity.notes
        ? `<p class="entity-notes">${entity.notes}</p>`
        : '';

    displayDiv.innerHTML = `
        <div class="selected-entity-card">
            <h4>${entity.name}${entity.abbreviation ? ` (${entity.abbreviation})` : ''}</h4>
            ${entity.description ? `<p>${entity.description}</p>` : ''}
            ${emailInfo}
            ${phoneInfo}
            ${officerInfo}
            ${portalInfo}
            ${notesInfo}
        </div>
    `;
    displayDiv.style.display = 'block';
}

// Clear selected entity
function clearSelectedEntity() {
    selectedEntity = null;
    document.getElementById('selected-entity-id').value = '';
    document.getElementById('selected-entity-category').value = '';
    document.getElementById('selected-entity-name').value = '';
    document.getElementById('selected-entity-abbr').value = '';
    document.getElementById('selected-entity-display').style.display = 'none';
    document.getElementById('selected-entity-display').innerHTML = '';
}

// Close autocomplete when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-wrapper')) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
    }
});

// Handle form submission
document.getElementById('request-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate entity selection
    if (!selectedEntity) {
        alert('Please select an entity from the search results');
        return;
    }

    const formData = {
        agency: selectedEntity.abbreviation || selectedEntity.name,
        agency_name: selectedEntity.name,
        entity_id: selectedEntity.id,
        entity_category: selectedEntity.category,
        subject: document.getElementById('subject').value,
        description: document.getElementById('description').value,
        date_range_start: document.getElementById('date-range-start').value || null,
        date_range_end: document.getElementById('date-range-end').value || null,
        delivery_format: document.getElementById('delivery-format').value
    };

    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/api/requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            successDiv.textContent = 'Request created successfully! Redirecting to dashboard...';
            successDiv.style.display = 'block';

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } else {
            errorDiv.textContent = data.error || 'Failed to create request';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
    }
});

// Load entities on page load
loadEntities();
