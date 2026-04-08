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
    let sortDirection = 'asc'; // asc or desc
    let favorites = JSON.parse(localStorage.getItem('deputationFavorites') || '[]');

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

    // View toggle
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
            rawData = results.data;
            initDashboard();
        },
        error: () => dataContainer.innerHTML = `<div class="loading-state"><p style="color:#f43f5e">Failed to load data. Please check your internet.</p></div>`
    });

    function initDashboard() {
        populateFilters();
        applyFilters();
        attachListeners();
    }

    function populateFilters() {
        const levels = [...new Set(rawData.map(i => i.Level_Text).filter(Boolean))].sort();
        const ministries = [...new Set(rawData.map(i => i.Ministry).filter(Boolean))].sort();
        const locations = [...new Set(rawData.map(i => i.Location_State).filter(Boolean))].sort();

        levels.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l; opt.textContent = l;
            filterLevel.appendChild(opt);
        });
        ministries.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m; opt.textContent = m;
            filterMinistry.appendChild(opt);
        });
        locations.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l; opt.textContent = l;
            filterLocation.appendChild(opt);
        });

        // My Pay Level dropdown
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
        filterStatus.value = 'Active';
        applyFilters();
    }

    function getActiveFilters() {
        const filters = [];
        if (searchPost.value) filters.push({key: 'search', value: searchPost.value, label: `Search: ${searchPost.value}`});
        if (filterMyPayLevel.value) filters.push({key: 'myPay', value: filterMyPayLevel.value, label: `My Level ${filterMyPayLevel.value}`});
        if (filterLevel.value) filters.push({key: 'level', value: filterLevel.value, label: filterLevel.value});
        if (filterMinistry.value) filters.push({key: 'ministry', value: filterMinistry.value, label: filterMinistry.value});
        if (filterLocation.value) filters.push({key: 'location', value: filterLocation.value, label: filterLocation.value});
        if (filterStatus.value) filters.push({key: 'status', value: filterStatus.value, label: filterStatus.value});
        return filters;
    }

    function renderActiveFilters() {
        const filters = getActiveFilters();
        activeFiltersContainer.innerHTML = '';
        filters.forEach(f => {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            chip.innerHTML = `${f.label} <i data-lucide="x" style="width:16px;height:16px"></i>`;
            chip.addEventListener('click', () => {
                if (f.key === 'search') searchPost.value = '';
                else if (f.key === 'myPay') filterMyPayLevel.value = '';
                else if (f.key === 'level') filterLevel.value = '';
                else if (f.key === 'ministry') filterMinistry.value = '';
                else if (f.key === 'location') filterLocation.value = '';
                else if (f.key === 'status') filterStatus.value = '';
                applyFilters();
            });
            activeFiltersContainer.appendChild(chip);
        });
        lucide.createIcons();
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

            // My Pay Level match
            if (myLevel) {
                const req1 = String(item.Req_Level1 || '');
                const req2 = String(item.Req_Level2 || '');
                if (!req1.includes(myLevel) && !req2.includes(myLevel)) match = false;
            }

            return match;
        });

        // Apply sorting
        filteredData.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (sortColumn === 'Days_Left') {
                valA = parseInt(valA) || 9999;
                valB = parseInt(valB) || 9999;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        renderActiveFilters();
        renderDashboard();
    }

    function renderDashboard() {
        renderKPIs();
        renderMainContent();
        resultsCount.textContent = `${filteredData.length} vacancies`;
        updateFavCount();
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

    function renderMainContent() {
        let html = '';

        // Table
        html += `<div class="table-wrapper"><table class="data-table"><thead><tr>`;
        const headers = ['Post_Name','Level_Text','Ministry','Location_City','Days_Left','Status'];
        headers.forEach(h => {
            const display = h === 'Post_Name' ? 'Post' : h === 'Level_Text' ? 'Level' : h === 'Location_City' ? 'Location' : h;
            const arrow = sortColumn === (h === 'Location_City' ? 'Location_State' : h) ? (sortDirection === 'asc' ? '↑' : '↓') : '';
            html += `<th onclick="window.sortTable('${h === 'Location_City' ? 'Location_State' : h}')">${display} ${arrow}</th>`;
        });
        html += `<th>Action</th></tr></thead><tbody>`;

        filteredData.forEach(item => {
            const isFav = favorites.includes(item.Vacancy_ID);
            const isClosing = parseInt(item.Days_Left) <= 15 && parseInt(item.Days_Left) > 0;
            html += `
                <tr onclick="window.showDetail('${item.Vacancy_ID}')">
                    <td><strong>${item.Post_Name}</strong></td>
                    <td><span class="badge badge-level">${item.Level_Text}</span></td>
                    <td>${item.Ministry}<br><small>${item.Organisation}</small></td>
                    <td>${item.Location_City}, ${item.Location_State}</td>
                    <td><span class="${isClosing ? 'days-left closing' : 'days-left'}">${item.Days_Left} days</span></td>
                    <td><span class="badge badge-active">${item.Status}</span></td>
                    <td><i data-lucide="${isFav ? 'heart' : 'heart'}" class="fav-icon" onclick="event.stopImmediatePropagation(); toggleFavorite('${item.Vacancy_ID}');" style="color:${isFav?'#f43f5e':'#64748b'}"></i></td>
                </tr>`;
        });
        html += `</tbody></table></div>`;

        // Cards
        html += `<div class="cards-grid">`;
        filteredData.forEach(item => {
            const isFav = favorites.includes(item.Vacancy_ID);
            const isClosing = parseInt(item.Days_Left) <= 15 && parseInt(item.Days_Left) > 0;
            html += `
                <div class="job-card" onclick="window.showDetail('${item.Vacancy_ID}')">
                    <div style="display:flex;justify-content:space-between;align-items:start">
                        <div>
                            <h3 class="job-title">${item.Post_Name}</h3>
                            <p class="job-org">${item.Ministry}</p>
                        </div>
                        <i data-lucide="${isFav ? 'heart' : 'heart'}" onclick="event.stopImmediatePropagation(); toggleFavorite('${item.Vacancy_ID}');" style="color:${isFav?'#f43f5e':'#64748b'}; width:24px;height:24px"></i>
                    </div>
                    <div class="job-details">
                        <div class="detail-item"><i data-lucide="map-pin"></i> ${item.Location_City}, ${item.Location_State}</div>
                        <div class="detail-item"><i data-lucide="award"></i> ${item.Level_Text}</div>
                        <div class="detail-item"><i data-lucide="calendar"></i> ${item.Last_Date_To_Apply}</div>
                        <div class="detail-item"><i data-lucide="briefcase"></i> ${item.No_of_Posts} posts</div>
                    </div>
                    <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center">
                        <span class="${isClosing ? 'days-left closing' : 'days-left'}">${item.Days_Left} days left</span>
                        <span class="badge badge-active">${item.Status}</span>
                    </div>
                </div>`;
        });
        html += `</div>`;

        dataContainer.innerHTML = html;
        lucide.createIcons();
    }

    // Global functions for onclick
    window.sortTable = function(col) {
        if (sortColumn === col) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = col;
            sortDirection = 'asc';
        }
        applyFilters();
    };

    window.showDetail = function(id) {
        const item = rawData.find(r => r.Vacancy_ID === id);
        if (!item) return;

        const isFav = favorites.includes(id);

        modalBody.innerHTML = `
            <div style="padding:2rem">
                <h2 style="font-size:1.8rem;margin-bottom:0.5rem">${item.Post_Name}</h2>
                <p style="color:var(--text-secondary);margin-bottom:1.5rem">${item.Ministry} • ${item.Organisation}</p>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem">
                    <div><strong>Level</strong><br>${item.Level_Text}</div>
                    <div><strong>Location</strong><br>${item.Location_City}, ${item.Location_State}</div>
                    <div><strong>Last Date</strong><br>${item.Last_Date_To_Apply}</div>
                    <div><strong>Days Left</strong><br><span class="${parseInt(item.Days_Left)<=15?'days-left closing':''}">${item.Days_Left} days</span></div>
                    <div><strong>No. of Posts</strong><br>${item.No_of_Posts}</div>
                    <div><strong>Status</strong><br><span class="badge badge-active">${item.Status}</span></div>
                </div>

                <div style="margin-bottom:2rem">
                    <strong>Eligibility</strong><br>
                    <p>Req. Level: ${item.Req_Level1} ${item.Req_Level2 ? `or ${item.Req_Level2}` : ''}</p>
                    <p>Qualification: ${item.Essential_Qualification}</p>
                </div>

                <div style="display:flex;gap:1rem">
                    <a href="${item.Official_Notification_Link}" target="_blank" class="btn-primary" style="flex:1;text-align:center">📄 Official Notification</a>
                    <a href="${item.Application_Form_Link || '#'}" target="_blank" class="btn-primary" style="flex:1;text-align:center;background:var(--accent-color)">Apply Now</a>
                    <button onclick="toggleFavorite('${id}'); window.showDetail('${id}')" style="background:transparent;border:1px solid var(--border-color);color:var(--text-primary);padding:0 1.5rem;border-radius:9999px">
                        <i data-lucide="${isFav ? 'heart' : 'heart'}" style="color:${isFav?'#f43f5e':'#64748b'}"></i>
                    </button>
                </div>
            </div>`;
        modal.style.display = 'flex';
        lucide.createIcons();
    };

    window.toggleFavorite = function(id) {
        if (favorites.includes(id)) {
            favorites = favorites.filter(f => f !== id);
        } else {
            favorites.push(id);
        }
        localStorage.setItem('deputationFavorites', JSON.stringify(favorites));
        updateFavCount();
        renderMainContent(); // refresh hearts
    };

    function updateFavCount() {
        favCount.textContent = favorites.length;
    }

    function showFavorites() {
        filteredData = rawData.filter(item => favorites.includes(item.Vacancy_ID));
        renderDashboard();
        // Temporarily hide filter chips
        activeFiltersContainer.innerHTML = `<div class="filter-chip" style="background:#f43f5e;color:white">❤️ My Watchlist (${favorites.length}) <i data-lucide="x" onclick="clearAllFilters()"></i></div>`;
    }

    // Make functions global for inline onclicks
    window.showDetail = window.showDetail;
    window.toggleFavorite = window.toggleFavorite;
    window.sortTable = window.sortTable;
});
