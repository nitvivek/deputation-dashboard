document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App started');

    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv';

    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');
    const activeFilters = document.getElementById('activeFilters');

    const searchPost = document.getElementById('searchPost');
    const filterMyPayLevel = document.getElementById('filterMyPayLevel');
    const filterLevel = document.getElementById('filterLevel');
    const filterMinistry = document.getElementById('filterMinistry');
    const filterLocation = document.getElementById('filterLocation');
    const filterStatus = document.getElementById('filterStatus');

    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const btnTableView = document.getElementById('btnTableView');
    const btnCardView = document.getElementById('btnCardView');

    let rawData = [];
    let currentView = 'table';

    dataContainer.innerHTML = `
        <div class="empty-state">
            Loading vacancies from Google Sheet...
        </div>
    `;

    Papa.parse(CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete(results) {
            rawData = results.data.filter(row => row.Vacancy_ID && String(row.Vacancy_ID).trim() !== '');
            console.log('✅ Loaded vacancies:', rawData.length);

            populateFilters();
            bindEvents();
            renderDashboard();
            lucide.createIcons();
        },
        error(err) {
            console.error('❌ CSV load failed:', err);
            dataContainer.innerHTML = `
                <div class="empty-state">
                    Failed to load data. Please check the Google Sheet URL or network access.
                </div>
            `;
            resultsCount.textContent = 'Failed to load';
        }
    });

    function populateFilters() {
        for (let i = 18; i >= 1; i--) {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = `Level ${i}`;
            filterMyPayLevel.appendChild(opt);
        }

        const levels = uniqueSorted(rawData.map(i => i.Level_Text));
        const ministries = uniqueSorted(rawData.map(i => i.Ministry));
        const locations = uniqueSorted(
            rawData.map(i => {
                const city = safe(i.Location_City);
                const state = safe(i.Location_State);
                if (city && state) return `${city}, ${state}`;
                return city || state || '';
            })
        );

        addOptions(filterLevel, levels);
        addOptions(filterMinistry, ministries);
        addOptions(filterLocation, locations);
    }

    function bindEvents() {
        [
            searchPost,
            filterMyPayLevel,
            filterLevel,
            filterMinistry,
            filterLocation,
            filterStatus
        ].forEach(el => {
            el.addEventListener('input', renderDashboard);
            el.addEventListener('change', renderDashboard);
        });

        clearFiltersBtn.addEventListener('click', () => {
            searchPost.value = '';
            filterMyPayLevel.value = '';
            filterLevel.value = '';
            filterMinistry.value = '';
            filterLocation.value = '';
            filterStatus.value = 'Active';
            renderDashboard();
        });

        btnTableView.addEventListener('click', () => {
            currentView = 'table';
            btnTableView.classList.add('active');
            btnCardView.classList.remove('active');
            renderDashboard();
        });

        btnCardView.addEventListener('click', () => {
            currentView = 'card';
            btnCardView.classList.add('active');
            btnTableView.classList.remove('active');
            renderDashboard();
        });
    }

    function renderDashboard() {
        const filteredData = getFilteredData();

        renderKPIs(filteredData);
        renderActiveFilterChips();
        renderResults(filteredData);

        resultsCount.textContent = `${filteredData.length} ${filteredData.length === 1 ? 'vacancy' : 'vacancies'}`;
        lucide.createIcons();
    }

   function getFilteredData() {
    const search = searchPost.value.trim().toLowerCase();
    const myPayLevel = filterMyPayLevel.value;
    const level = filterLevel.value;
    const ministry = filterMinistry.value;
    const location = filterLocation.value;
    const status = filterStatus.value;

    return rawData.filter(item => {
        const itemStatus = safe(item.Status);
        const itemMinistry = safe(item.Ministry);
        const itemLocation = formatLocation(item);

        // Search filter
        const searchableText = [
            item.Post_Name,
            item.Department,
            item.Ministry,
            item.Location_City,
            item.Location_State,
            item.Level_Text,
            item.Tags_Keywords,
            item.Essential_Qualification
        ].map(safe).join(' ').toLowerCase();

        if (search && !searchableText.includes(search)) return false;

        // Pay Level filter
        if (level && safe(item.Level_Text) !== level) return false;

        // Ministry filter
        if (ministry && itemMinistry !== ministry) return false;

        // Location filter
        if (location && itemLocation !== location) return false;

        // Status filter
        if (status && itemStatus !== status) return false;

        // === MY PAY LEVEL FILTER (This was the buggy part) ===
        if (myPayLevel) {
            const userLevel = Number(myPayLevel);
            const req1 = extractLevelNumber(safe(item.Req_Level1));
            const req2 = extractLevelNumber(safe(item.Req_Level2));

            const eligible = (req1 !== null && req1 <= userLevel) || 
                            (req2 !== null && req2 <= userLevel);

            if (!eligible) return false;
        }

        return true;
    });
}

    function renderKPIs(filteredData) {
        const active = filteredData.filter(d => safe(d.Status) === 'Active').length;
        const closingSoon = filteredData.filter(d => {
            const days = parseInt(d.Days_Left, 10);
            return !Number.isNaN(days) && days > 0 && days <= 15;
        }).length;

        const ministries = new Set(filteredData.map(d => safe(d.Ministry)).filter(Boolean)).size;

        kpiGrid.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-title">Total Vacancies</div>
                <div class="kpi-value">${filteredData.length}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Active</div>
                <div class="kpi-value">${active}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Closing Soon</div>
                <div class="kpi-value">${closingSoon}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Ministries</div>
                <div class="kpi-value">${ministries}</div>
            </div>
        `;
    }

    function renderActiveFilterChips() {
        const chips = [];

        if (searchPost.value.trim()) chips.push(`Search: ${escapeHtml(searchPost.value.trim())}`);
        if (filterMyPayLevel.value) chips.push(`My Pay Level: Level ${filterMyPayLevel.value}`);
        if (filterLevel.value) chips.push(`Pay Level: ${escapeHtml(filterLevel.value)}`);
        if (filterMinistry.value) chips.push(`Ministry: ${escapeHtml(filterMinistry.value)}`);
        if (filterLocation.value) chips.push(`Location: ${escapeHtml(filterLocation.value)}`);
        if (filterStatus.value) chips.push(`Status: ${escapeHtml(filterStatus.value)}`);

        activeFilters.innerHTML = chips.map(chip => `<div class="filter-chip">${chip}</div>`).join('');
    }

    function renderResults(data) {
        if (!data.length) {
            dataContainer.className = `data-container view-${currentView}`;
            dataContainer.innerHTML = `
                <div class="empty-state">
                    No vacancies match the current filters.
                </div>
            `;
            return;
        }

        dataContainer.className = `data-container view-${currentView}`;
        dataContainer.innerHTML = `
            ${renderTable(data)}
            ${renderCards(data)}
        `;
    }

    function renderTable(data) {
        const rows = data.map(item => {
            const daysLeft = parseInt(item.Days_Left, 10);
            const closingSoon = !Number.isNaN(daysLeft) && daysLeft > 0 && daysLeft <= 15;

            return `
                <tr>
                    <td><strong>${escapeHtml(safe(item.Post_Name) || '—')}</strong></td>
                    <td>${escapeHtml(safe(item.Level_Text) || '—')}</td>
                    <td>${escapeHtml(safe(item.Ministry) || '—')}</td>
                    <td>${escapeHtml(formatLocation(item) || '—')}</td>
                    <td class="days-left ${closingSoon ? 'closing' : ''}">
                        ${Number.isNaN(daysLeft) ? '—' : `${daysLeft} days`}
                    </td>
                    <td>
                        <span class="badge ${safe(item.Status) === 'Active' ? 'badge-active' : ''}">
                            ${escapeHtml(safe(item.Status) || '—')}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Post Name</th>
                            <th>Level</th>
                            <th>Ministry</th>
                            <th>Location</th>
                            <th>Days Left</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function renderCards(data) {
        const cards = data.map(item => {
            const daysLeft = parseInt(item.Days_Left, 10);
            const closingSoon = !Number.isNaN(daysLeft) && daysLeft > 0 && daysLeft <= 15;

            return `
                <div class="job-card">
                    <div>
                        <div class="job-title">${escapeHtml(safe(item.Post_Name) || '—')}</div>
                        <div class="job-org">${escapeHtml(safe(item.Department_Organisation) || safe(item.Ministry) || '—')}</div>
                    </div>

                    <div class="job-details">
                        <div class="detail-item"><strong>Level:</strong> ${escapeHtml(safe(item.Level_Text) || '—')}</div>
                        <div class="detail-item"><strong>Status:</strong> ${escapeHtml(safe(item.Status) || '—')}</div>
                        <div class="detail-item"><strong>Ministry:</strong> ${escapeHtml(safe(item.Ministry) || '—')}</div>
                        <div class="detail-item"><strong>Location:</strong> ${escapeHtml(formatLocation(item) || '—')}</div>
                    </div>

                    <div class="detail-item">
                        <strong>Days Left:</strong>
                        <span class="days-left ${closingSoon ? 'closing' : ''}">
                            ${Number.isNaN(daysLeft) ? '—' : `${daysLeft} days`}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="cards-grid">${cards}</div>`;
    }

    function addOptions(selectEl, values) {
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            selectEl.appendChild(option);
        });
    }

    function uniqueSorted(arr) {
        return [...new Set(arr.map(safe).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    }

    function safe(value) {
        return value == null ? '' : String(value).trim();
    }

    function formatLocation(item) {
        const city = safe(item.Location_City);
        const state = safe(item.Location_State);
        if (city && state) return `${city}, ${state}`;
        return city || state || '';
    }

    function extractLevelNumber(levelText) {
        const match = safe(levelText).match(/(\d+)/);
        return match ? Number(match[1]) : null;
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }
});
