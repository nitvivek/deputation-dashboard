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

    let sortState = {
        key: 'Days_Left',
        direction: 'asc'
    };

    let pagination = {
        currentPage: 1,
        pageSize: 10
    };

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
            console.log('Sample row:', rawData[0]);

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
            el.addEventListener('input', onFilterChange);
            el.addEventListener('change', onFilterChange);
        });

        clearFiltersBtn.addEventListener('click', () => {
            searchPost.value = '';
            filterMyPayLevel.value = '';
            filterLevel.value = '';
            filterMinistry.value = '';
            filterLocation.value = '';
            filterStatus.value = 'Active';
            pagination.currentPage = 1;
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

        activeFilters.addEventListener('click', (e) => {
            const chip = e.target.closest('[data-remove-filter]');
            if (!chip) return;

            const filterName = chip.getAttribute('data-remove-filter');

            if (filterName === 'search') searchPost.value = '';
            if (filterName === 'myPayLevel') filterMyPayLevel.value = '';
            if (filterName === 'level') filterLevel.value = '';
            if (filterName === 'ministry') filterMinistry.value = '';
            if (filterName === 'location') filterLocation.value = '';
            if (filterName === 'status') filterStatus.value = '';

            pagination.currentPage = 1;
            renderDashboard();
        });

        dataContainer.addEventListener('click', (e) => {
            const sortBtn = e.target.closest('[data-sort]');
            if (sortBtn) {
                const key = sortBtn.getAttribute('data-sort');
                toggleSort(key);
                return;
            }

            const pageBtn = e.target.closest('[data-page]');
            if (pageBtn) {
                const page = Number(pageBtn.getAttribute('data-page'));
                if (!Number.isNaN(page)) {
                    pagination.currentPage = page;
                    renderDashboard(false);
                }
                return;
            }

            const pageNavBtn = e.target.closest('[data-page-nav]');
            if (pageNavBtn) {
                const action = pageNavBtn.getAttribute('data-page-nav');
                const totalPages = Number(pageNavBtn.getAttribute('data-total-pages')) || 1;

                if (action === 'prev' && pagination.currentPage > 1) {
                    pagination.currentPage--;
                } else if (action === 'next' && pagination.currentPage < totalPages) {
                    pagination.currentPage++;
                }
                renderDashboard(false);
            }
        });
    }

    function onFilterChange() {
        pagination.currentPage = 1;
        renderDashboard();
    }

    function toggleSort(key) {
        if (sortState.key === key) {
            sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            sortState.key = key;
            sortState.direction = key === 'Days_Left' ? 'asc' : 'asc';
        }
        renderDashboard(false);
    }

    function renderDashboard(resetPageIfNeeded = true) {
        let filteredData = getFilteredData();
        filteredData = sortData(filteredData);

        const totalPages = Math.max(1, Math.ceil(filteredData.length / pagination.pageSize));
        if (resetPageIfNeeded) {
            pagination.currentPage = Math.min(pagination.currentPage, totalPages);
        } else if (pagination.currentPage > totalPages) {
            pagination.currentPage = totalPages;
        }

        const pagedData = paginateData(filteredData);

        renderKPIs(filteredData);
        renderActiveFilterChips();
        renderResults(pagedData, filteredData.length, totalPages);

        const start = filteredData.length === 0 ? 0 : ((pagination.currentPage - 1) * pagination.pageSize) + 1;
        const end = Math.min(pagination.currentPage * pagination.pageSize, filteredData.length);

        resultsCount.textContent = filteredData.length
            ? `${start}-${end} of ${filteredData.length} vacancies`
            : '0 vacancies';

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
            const itemLevel = safe(item.Level_Text);
            const itemMinistry = safe(item.Ministry);
            const itemLocation = formatLocation(item);
            const itemDaysLeft = parseInt(item.Days_Left, 10);

            const searchableText = [
                item.Post_Name,
                item.Department_Organisation,
                item.Ministry,
                item.Location_City,
                item.Location_State,
                item.Level_Text,
                item.Req_Level1,
                item.Req_Level2,
                item.Keywords,
                item.Essential_Qualification,
                item.Desirable_Qualification
            ].map(safe).join(' ').toLowerCase();

            if (search && !searchableText.includes(search)) return false;
            if (level && itemLevel !== level) return false;
            if (ministry && itemMinistry !== ministry) return false;
            if (location && itemLocation !== location) return false;
            if (status && itemStatus !== status) return false;

            // Correct My Pay Level logic:
            // Checks eligibility using Req_Level1 / Req_Level2
            if (myPayLevel) {
                const userLevel = Number(myPayLevel);
                const req1 = parseLevelValue(item.Req_Level1);
                const req2 = parseLevelValue(item.Req_Level2);

                // Exact-match eligibility across up to two feeder levels
                if (req1 !== null && req2 !== null) {
                    if (userLevel !== req1 && userLevel !== req2) {
                        return false;
                    }
                } else if (req1 !== null) {
                    if (userLevel !== req1) return false;
                } else if (req2 !== null) {
                    if (userLevel !== req2) return false;
                } else {
                    return false;
                }
            }

            if (!Number.isNaN(itemDaysLeft) && status === 'Active' && itemDaysLeft < 0) {
                return false;
            }

            return true;
        });
    }

    function sortData(data) {
        const direction = sortState.direction === 'asc' ? 1 : -1;
        const key = sortState.key;

        const sorted = [...data].sort((a, b) => {
            let aVal;
            let bVal;

            switch (key) {
                case 'Post_Name':
                    aVal = safe(a.Post_Name).toLowerCase();
                    bVal = safe(b.Post_Name).toLowerCase();
                    break;
                case 'Level_Text':
                    aVal = parseLevelValue(a.Level_Text);
                    bVal = parseLevelValue(b.Level_Text);
                    break;
                case 'Eligibility':
                    aVal = getEligibilitySortValue(a);
                    bVal = getEligibilitySortValue(b);
                    break;
                case 'Ministry':
                    aVal = safe(a.Ministry).toLowerCase();
                    bVal = safe(b.Ministry).toLowerCase();
                    break;
                case 'Location':
                    aVal = formatLocation(a).toLowerCase();
                    bVal = formatLocation(b).toLowerCase();
                    break;
                case 'Days_Left':
                    aVal = parseNumericSafe(a.Days_Left, Number.MAX_SAFE_INTEGER);
                    bVal = parseNumericSafe(b.Days_Left, Number.MAX_SAFE_INTEGER);
                    break;
                case 'Status':
                    aVal = safe(a.Status).toLowerCase();
                    bVal = safe(b.Status).toLowerCase();
                    break;
                default:
                    aVal = safe(a[key]).toLowerCase();
                    bVal = safe(b[key]).toLowerCase();
            }

            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';

            if (aVal < bVal) return -1 * direction;
            if (aVal > bVal) return 1 * direction;
            return 0;
        });

        return sorted;
    }

    function paginateData(data) {
        const start = (pagination.currentPage - 1) * pagination.pageSize;
        const end = start + pagination.pageSize;
        return data.slice(start, end);
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

        if (searchPost.value.trim()) {
            chips.push(makeChip('search', `Search: ${escapeHtml(searchPost.value.trim())}`));
        }
        if (filterMyPayLevel.value) {
            chips.push(makeChip('myPayLevel', `My Pay Level: Level ${filterMyPayLevel.value}`));
        }
        if (filterLevel.value) {
            chips.push(makeChip('level', `Pay Level: ${escapeHtml(filterLevel.value)}`));
        }
        if (filterMinistry.value) {
            chips.push(makeChip('ministry', `Ministry: ${escapeHtml(filterMinistry.value)}`));
        }
        if (filterLocation.value) {
            chips.push(makeChip('location', `Location: ${escapeHtml(filterLocation.value)}`));
        }
        if (filterStatus.value) {
            chips.push(makeChip('status', `Status: ${escapeHtml(filterStatus.value)}`));
        }

        activeFilters.innerHTML = chips.join('');
    }

    function makeChip(filterName, label) {
        return `
            <button type="button" class="filter-chip removable-chip" data-remove-filter="${filterName}">
                <span>${label}</span>
                <span class="chip-x">×</span>
            </button>
        `;
    }

    function renderResults(data, totalCount, totalPages) {
        if (!totalCount) {
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
            ${renderPagination(totalPages)}
        `;
    }

    function renderTable(data) {
        const rows = data.map(item => {
            const daysLeft = parseInt(item.Days_Left, 10);
            const closingSoon = !Number.isNaN(daysLeft) && daysLeft > 0 && daysLeft <= 15;

            return `
                <tr>
                    <td>
                        <strong>${escapeHtml(safe(item.Post_Name) || '—')}</strong>
                        <div style="margin-top:6px;color:var(--text-secondary);font-size:0.85rem;">
                            ${escapeHtml(safe(item.Department_Organisation) || '')}
                        </div>
                    </td>
                    <td>${escapeHtml(safe(item.Level_Text) || '—')}</td>
                    <td>${escapeHtml(formatEligibility(item))}</td>
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
                            ${renderSortableHeader('Post Name', 'Post_Name')}
                            ${renderSortableHeader('Level', 'Level_Text')}
                            ${renderSortableHeader('Eligibility', 'Eligibility')}
                            ${renderSortableHeader('Ministry', 'Ministry')}
                            ${renderSortableHeader('Location', 'Location')}
                            ${renderSortableHeader('Days Left', 'Days_Left')}
                            ${renderSortableHeader('Status', 'Status')}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function renderSortableHeader(label, key) {
        const active = sortState.key === key;
        const dir = sortState.direction === 'asc' ? '↑' : '↓';

        return `
            <th>
                <button type="button" class="sort-btn ${active ? 'active' : ''}" data-sort="${key}">
                    <span>${label}</span>
                    <span class="sort-indicator">${active ? dir : '↕'}</span>
                </button>
            </th>
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
                        <div class="detail-item"><strong>Eligibility:</strong> ${escapeHtml(formatEligibility(item))}</div>
                        <div class="detail-item"><strong>Ministry:</strong> ${escapeHtml(safe(item.Ministry) || '—')}</div>
                        <div class="detail-item"><strong>Location:</strong> ${escapeHtml(formatLocation(item) || '—')}</div>
                        <div class="detail-item"><strong>Status:</strong> ${escapeHtml(safe(item.Status) || '—')}</div>
                        <div class="detail-item">
                            <strong>Days Left:</strong>
                            <span class="days-left ${closingSoon ? 'closing' : ''}">
                                ${Number.isNaN(daysLeft) ? '—' : `${daysLeft} days`}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="cards-grid">${cards}</div>`;
    }

    function renderPagination(totalPages) {
        if (totalPages <= 1) return '';

        const pages = [];
        const current = pagination.currentPage;

        for (let i = 1; i <= totalPages; i++) {
            pages.push(`
                <button type="button" class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `);
        }

        return `
            <div class="pagination-bar">
                <button
                    type="button"
                    class="page-nav-btn"
                    data-page-nav="prev"
                    data-total-pages="${totalPages}"
                    ${current === 1 ? 'disabled' : ''}
                >
                    Prev
                </button>

                <div class="page-numbers">
                    ${pages.join('')}
                </div>

                <button
                    type="button"
                    class="page-nav-btn"
                    data-page-nav="next"
                    data-total-pages="${totalPages}"
                    ${current === totalPages ? 'disabled' : ''}
                >
                    Next
                </button>
            </div>
        `;
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

    function parseLevelValue(value) {
        if (value == null) return null;
        const str = String(value).trim();
        if (!str) return null;

        const match = str.match(/\d+/);
        return match ? Number(match[0]) : null;
    }

    function parseNumericSafe(value, fallback = 0) {
        const num = Number.parseInt(value, 10);
        return Number.isNaN(num) ? fallback : num;
    }

    function formatEligibility(item) {
        const req1 = parseLevelValue(item.Req_Level1);
        const req2 = parseLevelValue(item.Req_Level2);

        if (req1 !== null && req2 !== null) {
            if (req1 === req2) return `Level ${req1}`;
            return `Level ${req1} or Level ${req2}`;
        }

        if (req1 !== null) return `Level ${req1}`;
        if (req2 !== null) return `Level ${req2}`;

        return 'Not specified';
    }

    function getEligibilitySortValue(item) {
        const req1 = parseLevelValue(item.Req_Level1);
        const req2 = parseLevelValue(item.Req_Level2);

        if (req1 !== null && req2 !== null) return Math.min(req1, req2);
        if (req1 !== null) return req1;
        if (req2 !== null) return req2;
        return Number.MAX_SAFE_INTEGER;
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
