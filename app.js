document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Elements
    const searchPost = document.getElementById('searchPost');
    const filterMyPayLevel = document.getElementById('filterMyPayLevel');
    const filterLevel = document.getElementById('filterLevel');
    const filterMinistry = document.getElementById('filterMinistry');
    const filterLocation = document.getElementById('filterLocation');
    const filterStatus = document.getElementById('filterStatus');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');
    const btnTableView = document.getElementById('btnTableView');
    const btnCardView = document.getElementById('btnCardView');
    const activeFiltersContainer = document.getElementById('activeFilters');
    const themeToggle = document.getElementById('themeToggle');
    const favBtn = document.getElementById('favBtn');
    const favCount = document.getElementById('favCount');
    const modal = document.getElementById('modal');
    const closeModal = document.getElementById('closeModal');
    const modalBody = document.getElementById('modalBody');

    let rawData = [];
    let filteredData = [];
    let currentView = 'table';
    let sortColumn = 'Days_Left';
    let sortDirection = 'asc';
    let favorites = JSON.parse(localStorage.getItem('deputationFavorites') || '[]');

    // Show loading immediately
    showLoading();

    // Theme
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();

    function updateThemeIcon() {
        const icon = document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon';
        themeToggle.innerHTML = `<i data-lucide="${icon}"></i>`;
        lucide.createIcons();
    }

    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon();
    });

    btnTableView.addEventListener('click', () => setView('table'));
    btnCardView.addEventListener('click', () => setView('card'));

    function setView(view) {
        currentView = view;
        btnTableView.classList.toggle('active', view === 'table');
        btnCardView.classList.toggle('active', view === 'card');
        dataContainer.classList.toggle('view-table', view === 'table');
        dataContainer.classList.toggle('view-card', view === 'card');
        renderMainContent();
    }

    // ==================== LOAD DATA ====================
    Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            rawData = results.data.filter(row => row.Vacancy_ID); // remove empty rows
            console.log('✅ Data loaded:', rawData.length, 'vacancies');
            initDashboard();
        },
        error: (err) => {
            console.error('PapaParse Error:', err);
            dataContainer.innerHTML = `
                <div style="padding:3rem;text-align:center;color:#f43f5e">
                    <i data-lucide="alert-circle" style="width:48px;height:48px"></i>
                    <h3>Failed to load vacancies</h3>
                    <p>Try opening with Live Server (right-click → Open with Live Server)</p>
                    <small>Or check your internet connection.</small>
                </div>`;
            lucide.createIcons();
        }
    });

    function showLoading() {
        dataContainer.innerHTML = `
            <div style="height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;color:var(--text-secondary)">
                <i data-lucide="loader-2" class="spin" style="width:52px;height:52px"></i>
                <p style="font-size:1.1rem">Loading Deputation Vacancies...</p>
            </div>`;
        lucide.createIcons();
    }

    function initDashboard() {
        if (rawData.length === 0) {
            dataContainer.innerHTML = `<div style="padding:3rem;text-align:center">No data found in spreadsheet.</div>`;
            return;
        }
        populateFilters();
        applyFilters();
        attachListeners();
    }

    function populateFilters() {
        // ... (same as before - unchanged)
        const levels = [...new Set(rawData.map(i => i.Level_Text).filter(Boolean))].sort();
        const ministries = [...new Set(rawData.map(i => i.Ministry).filter(Boolean))].sort();
        const locations = [...new Set(rawData.map(i => i.Location_State).filter(Boolean))].sort();

        levels.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; filterLevel.appendChild(o); });
        ministries.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; filterMinistry.appendChild(o); });
        locations.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; filterLocation.appendChild(o); });

        for (let i = 18; i >= 1; i--) {
            const opt = document.createElement('option');
            opt.value = i; opt.textContent = `Level ${i}`;
            filterMyPayLevel.appendChild(opt);
        }
    }

    function attachListeners() {
        searchPost.addEventListener('input', applyFilters);
        filterMyPayLevel.addEventListener('change', applyFilters);
        filterLevel.addEventListener('change', applyFilters);
        filterMinistry.addEventListener('change', applyFilters);
        filterLocation.addEventListener('change', applyFilters);
        filterStatus.addEventListener('change', applyFilters);
        clearFiltersBtn.addEventListener('click', clearAllFilters);
        favBtn.addEventListener('click', showFavorites);
        closeModal.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    }

    function clearAllFilters() {
        searchPost.value = '';
        filterMyPayLevel.value = '';
        filterLevel.value = '';
        filterMinistry.value = '';
        filterLocation.value = '';
        filterStatus.value = '';
        applyFilters();
    }

    // Rest of the functions (renderActiveFilters, applyFilters, renderKPIs, renderMainContent, etc.) remain exactly the same as the previous version I gave you.

    // (To keep this message short, I only changed the loading + error part. 
    //  Just replace the entire file with the full version I sent earlier + the showLoading() and improved Papa.parse above.)

    // Paste the full previous app.js and only replace the Papa.parse section and add the showLoading() function.
    // If you want me to send the **complete final app.js** again, just say "send full app.js again".
});
