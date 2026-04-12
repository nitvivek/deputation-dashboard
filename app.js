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

    const favBtn = document.getElementById('favBtn');
    const favCount = document.getElementById('favCount');

    const modal = document.getElementById('modal');
    const closeModalBtn = document.getElementById('closeModal');
    const modalBody = document.getElementById('modalBody');

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

    let watchlist = loadWatchlist();
    let showWatchlistOnly = false;

    initializeModal();
    updateWatchlistUI();

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
            rawData = results.data.filter(
                row => row.Vacancy_ID && String(row.Vacancy_ID).trim() !== ''
            );

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

    function initializeModal() {
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeVacancyModal);
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeVacancyModal();
                    return;
                }

                const modalWatchBtn = e.target.closest('[data-modal-action="watchlist"]');
                if (modalWatchBtn) {
                    const vacancyId = modalWatchBtn.getAttribute('data-id');
                    const wasSaved = watchlist.has(safe(vacancyId));

                    toggleWatchlist(vacancyId);
                    renderDashboard(false);

                    if (showWatchlistOnly && wasSaved) {
                        closeVacancyModal();
                    } else {
                        openVacancyModal(vacancyId);
                    }
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
                closeVacancyModal();
            }
        });
    }

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
            showWatchlistOnly = false;
            pagination.currentPage = 1;
            renderDashboard();
        });

        btnTableView.addEventListener('click', () => {
            currentView = 'table';
            btnTableView.classList.add('active');
            btnCardView.classList.remove('active');
            renderDashboard(false);
        });

        btnCardView.addEventListener('click', () => {
            currentView = 'card';
            btnCardView.classList.add('active');
            btnTableView.classList.remove('active');
            renderDashboard(false);
        });

        favBtn.addEventListener('click', () => {
            showWatchlistOnly = !showWatchlistOnly;
            pagination.currentPage = 1;
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
            if (filterName === 'watchlist') showWatchlistOnly = false;

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
                return;
            }

            const cardAction = e.target.closest('[data-card-action]');
            if (cardAction) {
                const action = cardAction.getAttribute('data-card-action');
                const vacancyId = cardAction.getAttribute('data-id');

                if (action === 'details') {
                    openVacancyModal(vacancyId);
                } else if (action === 'watchlist') {
                    toggleWatchlist(vacancyId);
                    renderDashboard(false);
                }
                return;
            }

            const tableAction = e.target.closest('[data-table-action]');
            if (tableAction) {
                const action = tableAction.getAttribute('data-table-action');
                const vacancyId = tableAction.getAttribute('data-id');

                if (action === 'watchlist') {
                    toggleWatchlist(vacancyId);
                    renderDashboard(false);
                }
                return;
            }

            const detailsTrigger = e.target.closest('[data-open-details]');
            if (detailsTrigger) {
                openVacancyModal(detailsTrigger.getAttribute('data-open-details'));
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
            sortState.direction = 'asc';
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
        updateWatchlistUI();

        const start = filteredData.length === 0
            ? 0
            : ((pagination.currentPage - 1) * pagination.pageSize) + 1;

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
            const itemId = safe(item.Vacancy_ID);

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

            if (myPayLevel) {
                const userLevel = Number(myPayLevel);
                const req1 = parseLevelValue(item.Req_Level1);
                const req2 = parseLevelValue(item.Req_Level2);

                if (req1 !== null && req2 !== null) {
                    const minReq = Math.min(req1, req2);
                    const maxReq = Math.max(req1, req2);

                    if (userLevel < minReq || userLevel > maxReq) {
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

            if (showWatchlistOnly && !watchlist.has(itemId)) {
                return false;
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

        return [...data].sort((a, b) => {
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
                    break;
            }

            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';

            if (aVal < bVal) return -1 * direction;
            if (aVal > bVal) return 1 * direction;
            return 0;
        });
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
            return !Number.isNaN(days) && days >= 0 && days <= 15;
        }).length;
        const ministries = new Set(
            filteredData.map(d => safe(d.Ministry)).filter(Boolean)
        ).size;

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

    function updateWatchlistUI() {
        favCount.textContent = String(watchlist.size);
        favBtn.classList.toggle('active', showWatchlistOnly);
        favBtn.setAttribute('aria-pressed', String(showWatchlistOnly));
        favBtn.title = showWatchlistOnly ? 'Show all vacancies' : 'Show watchlist';
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
        if (showWatchlistOnly) {
            chips.push(makeChip('watchlist', 'Watchlist'));
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
            const message = showWatchlistOnly
                ? (watchlist.size
                    ? 'No saved vacancies match the current filters.'
                    : 'No saved vacancies yet. Click Save on any vacancy to add it to your watchlist.')
                : 'No vacancies match the current filters.';

            dataContainer.className = `data-container view-${currentView}`;
            dataContainer.innerHTML = `
                <div class="empty-state">
                    ${escapeHtml(message)}
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
            const vacancyId = safe(item.Vacancy_ID);
            const saved = watchlist.has(vacancyId);
            const daysLeft = parseInt(item.Days_Left, 10);
            const closingSoon = !Number.isNaN(daysLeft) && daysLeft >= 0 && daysLeft <= 15;
            const detailedNotificationLink = normalizeUrl(safe(item.Official_Notification_Link));
            const applyLink = normalizeUrl(safe(item.Application_Form_Link));

            return `
                <tr class="clickable-row" data-open-details="${escapeHtml(vacancyId)}">
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
                        ${escapeHtml(formatDaysLeft(daysLeft))}
                    </td>
                    <td>
                        <span class="badge ${safe(item.Status) === 'Active' ? 'badge-active' : ''}">
                            ${escapeHtml(safe(item.Status) || '—')}
                        </span>
                    </td>
                    <td class="table-link-cell">
                        ${detailedNotificationLink ? `
                            <a class="table-link-btn" href="${escapeHtml(detailedNotificationLink)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">
                                Notification
                            </a>
                        ` : '—'}
                    </td>
                    <td class="table-link-cell">
                        ${applyLink ? `
                            <a class="table-link-btn apply" href="${escapeHtml(applyLink)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">
                                Apply
                            </a>
                        ` : '—'}
                    </td>
                    <td class="table-action-cell">
                        <button
                            type="button"
                            class="table-action-btn ${saved ? 'saved' : ''}"
                            data-table-action="watchlist"
                            data-id="${escapeHtml(vacancyId)}"
                        >
                            ${saved ? 'Saved' : 'Save'}
                        </button>
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
                            <th>Notification</th>
                            <th>Apply</th>
                            <th>Save</th>
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
            const vacancyId = safe(item.Vacancy_ID);
            const saved = watchlist.has(vacancyId);
            const daysLeft = parseInt(item.Days_Left, 10);
            const closingSoon = !Number.isNaN(daysLeft) && daysLeft >= 0 && daysLeft <= 15;
            const expired = !Number.isNaN(daysLeft) && daysLeft < 0;
            const status = safe(item.Status) || '—';
            const detailedNotificationLink = normalizeUrl(safe(item.Official_Notification_Link));
            const applyLink = normalizeUrl(safe(item.Application_Form_Link));

            return `
                <div class="job-card premium-card clickable-card" data-open-details="${escapeHtml(vacancyId)}">
                    <div class="job-card-top">
                        <div class="job-meta-row">
                            <span class="meta-pill meta-pill-level">
                                ${escapeHtml(safe(item.Level_Text) || '—')}
                            </span>
                            <span class="meta-pill meta-pill-eligibility">
                                Eligible: ${escapeHtml(formatEligibility(item))}
                            </span>
                        </div>

                        <div class="job-title-block">
                            <div class="job-title">
                                ${escapeHtml(safe(item.Post_Name) || '—')}
                            </div>
                            <div class="job-org">
                                ${escapeHtml(safe(item.Ministry) || safe(item.Department_Organisation) || '—')}
                            </div>
                        </div>
                    </div>

                    <div class="job-highlight-row">
                        <div class="highlight-box ${expired ? 'highlight-expired' : closingSoon ? 'highlight-closing' : 'highlight-normal'}">
                            <div class="highlight-label">Days Left</div>
                            <div class="highlight-value ${closingSoon ? 'days-left closing' : ''}">
                                ${escapeHtml(formatDaysLeft(daysLeft))}
                            </div>
                        </div>

                        <div class="highlight-box">
                            <div class="highlight-label">Status</div>
                            <div class="highlight-value">
                                <span class="badge ${status === 'Active' ? 'badge-active' : ''}">
                                    ${escapeHtml(status)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="job-details premium-details">
                        <div class="detail-item">
                            <span class="detail-label">Location</span>
                            <span class="detail-value">${escapeHtml(formatLocation(item) || '—')}</span>
                        </div>

                        <div class="detail-item">
                            <span class="detail-label">Organisation</span>
                            <span class="detail-value">${escapeHtml(safe(item.Department_Organisation) || '—')}</span>
                        </div>

                        <div class="detail-item">
                            <span class="detail-label">Level</span>
                            <span class="detail-value">${escapeHtml(safe(item.Level_Text) || '—')}</span>
                        </div>

                        <div class="detail-item">
                            <span class="detail-label">Eligibility</span>
                            <span class="detail-value">${escapeHtml(formatEligibility(item))}</span>
                        </div>
                    </div>

                    <div class="job-card-footer">
                        <button
                            type="button"
                            class="card-action-btn"
                            data-card-action="details"
                            data-id="${escapeHtml(vacancyId)}"
                        >
                            View Details
                        </button>

                        ${detailedNotificationLink ? `
                            <a
                                class="card-action-btn secondary"
                                href="${escapeHtml(detailedNotificationLink)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                onclick="event.stopPropagation();"
                            >
                                Detailed Notification
                            </a>
                        ` : ''}

                        ${applyLink ? `
                            <a
                                class="card-action-btn secondary apply-btn"
                                href="${escapeHtml(applyLink)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                onclick="event.stopPropagation();"
                            >
                                Apply
                            </a>
                        ` : ''}

                        <button
                            type="button"
                            class="card-action-btn secondary ${saved ? 'saved' : ''}"
                            data-card-action="watchlist"
                            data-id="${escapeHtml(vacancyId)}"
                        >
                            ${saved ? 'Saved' : 'Save'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="cards-grid premium-cards-grid">${cards}</div>`;
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

    function openVacancyModal(vacancyId) {
        const item = getItemById(vacancyId);
        if (!item || !modal || !modalBody) return;

        modalBody.innerHTML = buildModalContent(item);
        modal.style.display = 'flex';
        lucide.createIcons();
    }

    function closeVacancyModal() {
        if (!modal || !modalBody) return;
        modal.style.display = 'none';
        modalBody.innerHTML = '';
    }

    function buildModalContent(item) {
        const vacancyId = safe(item.Vacancy_ID);
        const saved = watchlist.has(vacancyId);
        const daysLeft = parseInt(item.Days_Left, 10);
        const closingSoon = !Number.isNaN(daysLeft) && daysLeft >= 0 && daysLeft <= 15;
        const expired = !Number.isNaN(daysLeft) && daysLeft < 0;

        const title = safe(item.Post_Name) || '—';
        const ministry = safe(item.Ministry) || '—';
        const organisation = getFirstNonEmpty(item, [
            'Department_Organisation',
            'Organisation',
            'Department',
            'Office'
        ]);
        const location = formatLocation(item) || 'Not specified';
        const level = safe(item.Level_Text) || '—';
        const eligibility = formatEligibility(item);
        const status = safe(item.Status) || '—';

        const rawClosingDate = safe(item.Last_Date_To_Apply);
        const rawNotificationDate = safe(item.Notification_Date);
        const modeOfApplication = safe(item.Mode_of_Application) || 'Not specified';

        const closingDate = formatDisplayDate(rawClosingDate);
        const notificationDate = formatDisplayDate(rawNotificationDate);
        const closingDateDays = getDaysUntilDate(rawClosingDate);

        const tenure = getFirstNonEmpty(item, [
            'Tenure',
            'Deputation_Tenure',
            'Period_of_Deputation'
        ]);

        const ageLimit = getFirstNonEmpty(item, [
            'Age_Limit',
            'Maximum_Age',
            'Age'
        ]);

        const payScale = getFirstNonEmpty(item, [
            'Pay_Scale',
            'PayScale',
            'Pay_Band'
        ]);

        const essentialQualification = getFirstNonEmpty(item, [
            'Essential_Qualification',
            'Qualification',
            'Essential Qualifications'
        ]);

        const desirableQualification = getFirstNonEmpty(item, [
            'Desirable_Qualification',
            'Desirable Qualifications'
        ]);

        const experience = getFirstNonEmpty(item, [
            'Experience',
            'Essential_Experience',
            'Desirable_Experience'
        ]);

        const description = getFirstNonEmpty(item, [
            'Job_Description',
            'Description',
            'Remarks',
            'Notes'
        ]);

        const detailedNotificationLink = normalizeUrl(safe(item.Official_Notification_Link));
        const applyLink = normalizeUrl(safe(item.Application_Form_Link));

        return `
            <div class="vacancy-modal">
                <div class="vacancy-modal-header">
                    <div class="vacancy-modal-title-block">
                        <div class="vacancy-modal-title">${escapeHtml(title)}</div>
                        <div class="vacancy-modal-subtitle">${escapeHtml(ministry)}</div>
                        ${organisation && organisation !== ministry
                            ? `<div class="vacancy-modal-org">${escapeHtml(organisation)}</div>`
                            : ''}
                    </div>

                    <div class="modal-chip-row">
                        <span class="badge badge-level">${escapeHtml(level)}</span>
                        <span class="badge ${status === 'Active' ? 'badge-active' : ''}">${escapeHtml(status)}</span>
                        <span class="modal-deadline-chip ${expired ? 'expired' : closingSoon ? 'closing' : ''}">
                            ${escapeHtml(formatDaysLeft(daysLeft))}
                        </span>
                    </div>
                </div>

                <div class="modal-section">
                    <div class="modal-section-title">Overview</div>
                    <div class="modal-grid">
                        ${buildModalField('Eligibility', eligibility)}
                        ${buildModalField('Location', location)}
                        ${buildModalField('Pay Level', level)}
                        ${buildModalField('Days Left', formatDaysLeft(daysLeft))}
                        ${buildModalField('Organisation', organisation || 'Not specified')}
                        ${buildModalField(
                            'Closing Date',
                            `<span class="${closingDateDays !== null && closingDateDays >= 0 && closingDateDays <= 15 ? 'closing-date-text' : ''}">${escapeHtml(closingDate)}</span>`,
                            true
                        )}
                        ${buildModalField('Notification Date', notificationDate)}
                        ${buildModalField('Mode of Application', renderModeBadge(modeOfApplication), true)}
                        ${tenure ? buildModalField('Tenure', tenure) : ''}
                        ${ageLimit ? buildModalField('Age Limit', ageLimit) : ''}
                        ${payScale ? buildModalField('Pay / Scale', payScale) : ''}
                    </div>
                </div>

                ${renderModalRichSection('Essential Qualification', essentialQualification)}
                ${renderModalRichSection('Desirable Qualification', desirableQualification)}
                ${renderModalRichSection('Experience', experience)}
                ${renderModalRichSection('Description / Remarks', description)}

                <div class="modal-actions">
                    <button
                        type="button"
                        class="card-action-btn ${saved ? 'saved' : ''}"
                        data-modal-action="watchlist"
                        data-id="${escapeHtml(vacancyId)}"
                    >
                        ${saved ? 'Remove from Watchlist' : 'Save to Watchlist'}
                    </button>

                    ${detailedNotificationLink ? `
                        <a
                            class="card-action-btn secondary"
                            href="${escapeHtml(detailedNotificationLink)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Detailed Notification
                        </a>
                    ` : ''}

                    ${applyLink ? `
                        <a
                            class="card-action-btn secondary apply-btn"
                            href="${escapeHtml(applyLink)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Apply
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }

    function buildModalField(label, value, isHtml = false) {
        return `
            <div class="modal-field">
                <div class="modal-field-label">${escapeHtml(label)}</div>
                <div class="modal-field-value">${isHtml ? value : escapeHtml(value)}</div>
            </div>
        `;
    }

    function renderModalRichSection(title, value) {
        if (!hasMeaningfulValue(value)) return '';

        return `
            <div class="modal-section">
                <div class="modal-section-title">${escapeHtml(title)}</div>
                <div class="modal-richtext">${formatRichText(value)}</div>
            </div>
        `;
    }

    function toggleWatchlist(vacancyId) {
        const id = safe(vacancyId);
        if (!id) return;

        if (watchlist.has(id)) {
            watchlist.delete(id);
        } else {
            watchlist.add(id);
        }

        persistWatchlist();
        updateWatchlistUI();
    }

    function loadWatchlist() {
        try {
            const stored = localStorage.getItem('deputationWatchlist');
            if (!stored) return new Set();

            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return new Set();

            return new Set(parsed.map(item => String(item)));
        } catch (err) {
            console.warn('Unable to load watchlist:', err);
            return new Set();
        }
    }

    function persistWatchlist() {
        try {
            localStorage.setItem('deputationWatchlist', JSON.stringify([...watchlist]));
        } catch (err) {
            console.warn('Unable to save watchlist:', err);
        }
    }

    function getItemById(vacancyId) {
        const id = safe(vacancyId);
        return rawData.find(item => safe(item.Vacancy_ID) === id) || null;
    }

    function getFirstNonEmpty(item, keys) {
        for (const key of keys) {
            const value = item[key];
            if (hasMeaningfulValue(value)) {
                return safe(value);
            }
        }
        return '';
    }

    function hasMeaningfulValue(value) {
        const text = safe(value).toLowerCase();
        return Boolean(text) && !['-', '—', 'na', 'n/a', 'null', 'undefined'].includes(text);
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
            const minReq = Math.min(req1, req2);
            const maxReq = Math.max(req1, req2);
            return `Level ${minReq} to Level ${maxReq}`;
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

    function formatDaysLeft(daysLeft) {
        if (Number.isNaN(daysLeft)) return 'Not specified';
        if (daysLeft < 0) return 'Expired';
        if (daysLeft === 0) return 'Closes today';
        return `${daysLeft} days`;
    }

    function formatRichText(value) {
        return escapeHtml(safe(value)).replace(/\n/g, '<br>');
    }

    function normalizeUrl(value) {
        const url = safe(value);
        if (!url) return '';
        if (['-', '—', 'na', 'n/a', 'null', 'undefined'].includes(url.toLowerCase())) return '';
        if (/^https?:\/\//i.test(url)) return url;
        if (/^www\./i.test(url)) return `https://${url}`;
        return '';
    }

    function formatDisplayDate(value) {
        const raw = safe(value);
        if (!raw || ['-', '—', 'na', 'n/a', 'null', 'undefined'].includes(raw.toLowerCase())) {
            return 'Not specified';
        }

        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }

        return raw;
    }

    function getDaysUntilDate(value) {
        const raw = safe(value);
        if (!raw) return null;

        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return null;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());

        const diffMs = target - today;
        return Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

    function getApplicationModeClass(mode) {
        const text = safe(mode).toLowerCase();

        if (text.includes('both')) return 'mode-both';
        if (text.includes('online')) return 'mode-online';
        if (text.includes('physical') || text.includes('offline') || text.includes('post')) return 'mode-physical';

        return 'mode-default';
    }

    function renderModeBadge(mode) {
        const safeMode = safe(mode) || 'Not specified';
        return `<span class="application-mode-badge ${getApplicationModeClass(safeMode)}">${escapeHtml(safeMode)}</span>`;
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
