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

    // Load CSV
    Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            rawData = results.data.filter(row => row.Vacancy_ID);
            console.log('✅ Data loaded:', rawData.length, 'vacancies');
            initDashboard();
        },
        error: () => {
            dataContainer.innerHTML = `<div style="padding:3rem;text-align:center;color:#f43f5e">Failed to load data. Try refreshing.</div>`;
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
        populateFilters();
        applyFilters();
        attachListeners();
    }

    function populateFilters() {
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

    function applyFilters() {
        const s = searchPost.value.toLowerCase().trim();
        const myLevel = filterMyPayLevel.value;
        const level = filterLevel.value;
        const ministry = filterMinistry.value;
        const location = filterLocation.value;
        const status = filterStatus.value;

        filteredData = rawData.filter(item => {
            let match = true;
            if (s) {
                const text = `${item.Post_Name} ${item.Department} ${item.Ministry} ${item.Tags_Keywords || ''}`.toLowerCase();
                if (!text.includes(s)) match = false;
            }
            if (level && item.Level_Text !== level) match = false;
            if (ministry && item.Ministry !== ministry) match = false;
            if (location && item.Location_State !== location) match = false;
            if (status && item.Status !== status) match = false;

            if (myLevel) {
                const req1 = String(item.Req_Level1 || '');
                const req2 = String(item.Req_Level2 || '');
                if (!req1.includes(myLevel) && !req2.includes(myLevel)) match = false;
            }
            return match;
        });

        renderDashboard();
    }

    function renderDashboard() {
        renderKPIs();
        renderMainContent();
        resultsCount.textContent = `${filteredData.length} vacancies`;
        updateFavCount();
        renderActiveFilters();
    }

    function renderKPIs() {
        const total = filteredData.length;
        const closingSoon = filteredData.filter(d => parseInt(d.Days_Left) > 0 && parseInt(d.Days_Left) <= 15).length;
        const distinct = new Set(filteredData.map(d => d.Post_Name)).size;

        kpiGrid.innerHTML = `
            <div class="kpi-card"><span class="kpi-title">Total Vacancies</span><span class="kpi-value">${total}</span></div>
            <div class="kpi-card"><span class="kpi-title">Distinct Roles</span><span class="kpi-value">${distinct}</span></div>
            <div class="kpi-card"><span class="kpi-title">Closing Soon</span><span class="kpi-value" style="color:var(--warning-color)">${closingSoon}</span></div>
            <div class="kpi-card"><span class="kpi-title">Active</span><span class="kpi-value">${filteredData.filter(d=>d.Status==='Active').length}</span></div>
        `;
    }

    function renderActiveFilters() {
        // (kept minimal for now - you can expand later)
        activeFiltersContainer.innerHTML = '';
    }

    function renderMainContent() {
        let html = `<div class="table-wrapper"><table class="data-table"><thead><tr>
            <th>Post</th><th>Level</th><th>Ministry</th><th>Location</th><th>Days Left</th><th>Status</th>
        </tr></thead><tbody>`;

        filteredData.forEach(item => {
            const isClosing = parseInt(item.Days_Left) <= 15 && parseInt(item.Days_Left) > 0;
            html += `
                <tr onclick="showDetail('${item.Vacancy_ID}')">
                    <td><strong>${item.Post_Name}</strong></td>
                    <td><span class="badge badge-level">${item.Level_Text}</span></td>
                    <td>${item.Ministry}</td>
                    <td>${item.Location_City}, ${item.Location_State}</td>
                    <td><span class="${isClosing ? 'days-left closing' : 'days-left'}">${item.Days_Left} days</span></td>
                    <td><span class="badge badge-active">${item.Status}</span></td>
                </tr>`;
        });

        html += `</tbody></table></div>`;
        dataContainer.innerHTML = html;
        lucide.createIcons();
    }

    window.showDetail = function(id) {
        const item = rawData.find(r => r.Vacancy_ID === id);
        if (!item) return;
        modalBody.innerHTML = `<div style="padding:2rem"><h2>${item.Post_Name}</h2><p>More details coming soon...</p></div>`;
        modal.style.display = 'flex';
    };

    function updateFavCount() {
        favCount.textContent = favorites.length;
    }

    function showFavorites() {
        alert("Watchlist feature coming in next update!");
    }

    // Make global
    window.showDetail = window.showDetail;
});
