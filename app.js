document.addEventListener('DOMContentLoaded', () => {
    // Initialize Icons
    lucide.createIcons();

    // Elements
    const themeToggle = document.getElementById('themeToggle');
    const searchPost = document.getElementById('searchPost');
    const filterLevel = document.getElementById('filterLevel');
    const filterMinistry = document.getElementById('filterMinistry');
    const filterLocation = document.getElementById('filterLocation');
    const filterStatus = document.getElementById('filterStatus');
    const filterMyPayLevel = document.getElementById('filterMyPayLevel');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');

    const btnTableView = document.getElementById('btnTableView');
    const btnCardView = document.getElementById('btnCardView');

    // State
    let rawData = [];
    let filteredData = [];
    let currentView = 'table'; // 'table' or 'card'

    // Theme Toggle
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    themeToggle.addEventListener('click', () => {
        const _theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', _theme);
        localStorage.setItem('theme', _theme);
        updateThemeIcon(_theme);
    });

    function updateThemeIcon(theme) {
        const iconName = theme === 'dark' ? 'sun' : 'moon';
        themeToggle.innerHTML = `<i data-lucide="${iconName}"></i>`;
        lucide.createIcons();
    }

    // View Toggle
    btnTableView.addEventListener('click', () => setView('table'));
    btnCardView.addEventListener('click', () => setView('card'));

    function setView(view) {
        currentView = view;
        if (view === 'table') {
            btnTableView.classList.add('active');
            btnCardView.classList.remove('active');
            dataContainer.classList.remove('view-card');
            dataContainer.classList.add('view-table');
        } else {
            btnCardView.classList.add('active');
            btnTableView.classList.remove('active');
            dataContainer.classList.remove('view-table');
            dataContainer.classList.add('view-card');
        }
    }

    // Load Data
    Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            rawData = results.data;
            initDashboard();
        },
        error: function (err) {
            console.error("Error fetching CSV:", err);
            dataContainer.innerHTML = `<div class="loading-state"><p>Error loading data. Check console.</p></div>`;
        }
    });

    function initDashboard() {
        populateFilterOptions();

        // Populate My Pay Level (18 to 1)
        for (let i = 18; i >= 1; i--) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Level ${i}`;
            filterMyPayLevel.appendChild(option);
        }

        // Initial Filter applying default (Status: Active)
        applyFilters();

        // Attach listeners
        searchPost.addEventListener('input', applyFilters);
        filterMyPayLevel.addEventListener('change', applyFilters);
        filterLevel.addEventListener('change', applyFilters);
        filterMinistry.addEventListener('change', applyFilters);
        filterLocation.addEventListener('change', applyFilters);
        filterStatus.addEventListener('change', applyFilters);

        clearFiltersBtn.addEventListener('click', () => {
            searchPost.value = '';
            filterLevel.value = '';
            filterMinistry.value = '';
            filterLocation.value = '';
            filterStatus.value = '';
            filterMyPayLevel.value = '';
            applyFilters();
        });
    }

    function populateFilterOptions() {
        const levels = new Set();
        const ministries = new Set();
        const locations = new Set();

        rawData.forEach(item => {
            if (item.Level_Text) levels.add(item.Level_Text);
            if (item.Ministry) ministries.add(item.Ministry);
            if (item.Location_State) locations.add(item.Location_State);
        });

        populateSelect(filterLevel, Array.from(levels).sort());
        populateSelect(filterMinistry, Array.from(ministries).sort());
        populateSelect(filterLocation, Array.from(locations).sort());
    }

    function populateSelect(selectElem, items) {
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            selectElem.appendChild(option);
        });
    }

    function applyFilters() {
        const sPost = searchPost.value.toLowerCase();
        const sLevel = filterLevel.value;
        const sMinistry = filterMinistry.value;
        const sLocation = filterLocation.value;
        const sStatus = filterStatus.value;
        const sMyPayLevel = filterMyPayLevel.value;

        filteredData = rawData.filter(item => {
            let match = true;
            if (sPost && !(item.Post_Name?.toLowerCase().includes(sPost) || item.Department?.toLowerCase().includes(sPost))) match = false;
            if (sLevel && item.Level_Text !== sLevel) match = false;
            if (sMinistry && item.Ministry !== sMinistry) match = false;
            if (sLocation && item.Location_State !== sLocation) match = false;
            if (sStatus && item.Status !== sStatus) match = false;

            // Filter by My Pay Level
            if (sMyPayLevel) {
                // To display it MUST match Req_Level1 or Req_Level2
                const req1 = String(item.Req_Level1 || '');
                const req2 = String(item.Req_Level2 || '');
                const nums1 = req1 ? (req1.match(/\d+/g) || []) : [];
                const nums2 = req2 ? (req2.match(/\d+/g) || []) : [];
                if (!nums1.includes(sMyPayLevel) && !nums2.includes(sMyPayLevel) && req1 !== sMyPayLevel && req2 !== sMyPayLevel) {
                    match = false;
                }
            }
            
            return match;
        });

        renderDashboard();
    }

    function renderDashboard() {
        renderKPIs();
        renderMainContent();
        resultsCount.textContent = `Showing ${filteredData.length} vacancies`;
        lucide.createIcons();
    }

    function renderKPIs() {
        const total = filteredData.length;
        const closingSoon = filteredData.filter(d => parseInt(d.Days_Left) > 0 && parseInt(d.Days_Left) <= 15).length;

        const distinctPosts = new Set(filteredData.map(d => d.Post_Name)).size;

        let levelCounts = {};
        filteredData.forEach(d => {
            if (d.Level) {
                levelCounts[d.Level] = (levelCounts[d.Level] || 0) + 1;
            }
        });

        // Find top level
        let topLevel = '-';
        let topLevelCount = 0;
        for (const [lvl, count] of Object.entries(levelCounts)) {
            if (count > topLevelCount) {
                topLevelCount = count;
                topLevel = `L-${lvl}`;
            }
        }

        kpiGrid.innerHTML = `
            <div class="kpi-card">
                <span class="kpi-title">Total Vacancies</span>
                <span class="kpi-value">${total}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-title">Distinct Roles</span>
                <span class="kpi-value">${distinctPosts}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-title">Closing Soon (< 15 days)</span>
                <span class="kpi-value text-warning" style="color: var(--warning-color)">${closingSoon}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-title">Most Common Level</span>
                <span class="kpi-value">${topLevel}</span>
            </div>
        `;
    }

    function renderMainContent() {
        dataContainer.style.animation = 'none';
        void dataContainer.offsetWidth; // trigger reflow
        dataContainer.style.animation = null;

        if (filteredData.length === 0) {
            dataContainer.innerHTML = `<div class="loading-state"><p>No vacancies found matching your filters.</p></div>`;
            return;
        }

        let html = '';

        // --- Table Wrapper ---
        html += `<div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Post</th>
                        <th>Level</th>
                        <th>Ministry / Org</th>
                        <th>Location</th>
                        <th>Days Left</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>`;

        filteredData.forEach(item => {
            const isClosingSoon = item.Closing_Soon === 'Yes' || (parseInt(item.Days_Left) > 0 && parseInt(item.Days_Left) <= 15);
            html += `<tr>
                <td><strong>${item.Post_Name}</strong></td>
                <td><span class="badge badge-level">${item.Level_Text || 'N/A'}</span></td>
                <td>
                    ${item.Ministry}<br>
                    <small style="color:var(--text-muted)">${item.Organisation}</small>
                </td>
                <td>${item.Location_City || ''}, ${item.Location_State || ''}</td>
                <td>
                    <span class="${isClosingSoon ? 'days-left closing' : 'days-left'}">
                        ${item.Days_Left} days
                    </span>
                </td>
                <td>
                    <a href="${item.Official_Notification_Link || '#'}" target="_blank" class="text-btn">View Link</a>
                </td>
            </tr>`;
        });

        html += `   </tbody>
            </table>
        </div>`;

        // --- Cards Wrapper ---
        html += `<div class="cards-grid">`;
        filteredData.forEach(item => {
            const isClosingSoon = item.Closing_Soon === 'Yes' || (parseInt(item.Days_Left) > 0 && parseInt(item.Days_Left) <= 15);
            let statusBadge = item.Status === 'Active' ? `<span class="badge badge-active">Active</span>` : `<span class="badge badge-inactive">Inactive</span>`;

            html += `<div class="job-card">
                <div class="job-card-header">
                    <div>
                        <h3 class="job-title">${item.Post_Name}</h3>
                        <p class="job-org">${item.Department || item.Ministry}</p>
                    </div>
                    ${statusBadge}
                </div>
                
                <div class="job-details">
                    <div class="detail-item">
                        <i data-lucide="map-pin"></i>
                        ${item.Location_City || 'Var'}, ${item.Location_State || ''}
                    </div>
                    <div class="detail-item">
                        <i data-lucide="award"></i>
                        ${item.Level_Text || `Level ${item.Level}`}
                    </div>
                    <div class="detail-item">
                        <i data-lucide="calendar"></i>
                        Ends: ${item.Last_Date_To_Apply}
                    </div>
                    <div class="detail-item">
                        <i data-lucide="briefcase"></i>
                        Posts: ${item.No_of_Posts || 1}
                    </div>
                </div>

                <div class="job-footer">
                    <span class="${isClosingSoon ? 'days-left closing' : 'days-left'}">
                        <i data-lucide="clock" style="display:inline; width:14px; height:14px; margin-bottom:-2px;"></i>
                        ${item.Days_Left} days left
                    </span>
                    <a href="${item.Official_Notification_Link || '#'}" target="_blank" class="btn-primary">View Details</a>
                </div>
            </div>`;
        });
        html += `</div>`;

        dataContainer.innerHTML = html;
    }
});
