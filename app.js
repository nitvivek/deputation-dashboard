document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App started');

    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv';
    const WATCHLIST_KEY = 'deputation_watchlist_v1';

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
    let watchlistOnly = false;
    let modalOpenVacancyId = null;
    let watchlist = loadWatchlist();

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
            rawData = results.data.filter(
                row => row.Vacancy_ID && String(row.Vacancy_ID).trim() !== ''
            );

            console.log('✅ Loaded vacancies:', rawData.length);

            populateFilters();
            bindEvents();
            updateWatchlistUI();
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
            watchlistOnly = false;
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
            watchlistOnly = !watchlistOnly;
            pagination.currentPage = 1;
            renderDashboard();
        });

        activeFilters.addEventListener('click', e => {
            const chip = e.target.closest('[data-remove-filter]');
            if (!chip) return;

            const filterName = chip.getAttribute('data-remove-filter');

            if (filterName === 'search') searchPost.value = '';
            if (filterName === 'myPayLevel') filterMyPayLevel.value = '';
            if (filterName === 'level') filterLevel.value = '';
            if (filterName === 'ministry') filterMinistry.value = '';
            if (filterName === 'location') filterLocation.value = '';
            if (filterName === 'status') filterStatus.value = '';
            if (filterName === 'watchlist') watchlistOnly = false;

            pagination.currentPage = 1;
            renderDashboard();
        });

        dataContainer.addEventListener('click', e => {
            const sortBtn = e.target.closest('[data-sort]');
            if (sortBtn) {
                toggleSort(sortBtn.getAttribute('data-sort'));
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

            const cardActionBtn = e.target.closest('[data-card-action]');
            if (cardActionBtn) {
                const action = cardActionBtn.getAttribute('data-card-action');
                const vacancyId = cardActionBtn.getAttribute('data-id');

                if (action === 'details') {
                    openModal(vacancyId);
                } else if (action === 'watchlist') {
                    toggleWatchlist(vacancyId);
                }
                return;
            }

            if (e.target.closest('button, a, input, select, label')) return;

            const openable = e.target.closest('[data-open-modal]');
            if (openable) {
                openModal(openable.getAttribute('data-id'));
            }
        });

        modalBody.addEventListener('click', e => {
            const modalWatchBtn = e.target.closest('[data-modal-watchlist]');
            if (modalWatchBtn) {
                const vacancyId = modalWatchBtn.getAttribute('data-modal-watchlist');
                toggleWatchlist(vacancyId);
            }
        });

        closeModalBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', e => {
            if (e.target === modal) {
                closeModal();
            }
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal();
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
            const vacancyId = safe(item.Vacancy_ID);
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

            if (watchlistOnly && !watchlist.has(vacancyId)) return false;
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
        if (watchlistOnly) {
            chips.push(makeChip('watchlist', 'Watchlist Only'));
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
                    ${watchlistOnly ? 'No saved vacancies match the current filters.' : 'No vacancies match the current filters.'}
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
            const saved = isInWatchlist(vacancyId);
            const daysLeft = parseInt(item.Days_Left, 10);
            const closingSoon = !Number.isNaN(daysLeft) && daysLeft >= 0 && daysLeft <= 15;
            const status = safe(item.Status) || '—';

            return `
                <tr class="clickable-row" data-open-modal="true" data-id="${escapeHtml(vacancyId)}">
                    <td>
                        <strong>${escapeHtml(safe(item.Post_Name) || '—')}</strong>
                        <div class="table-subline">
                            ${escapeHtml(safe(item.Department_Organisation) || safe(item.Ministry) || '')}
                        </div>
                        ${saved ? '<div class="table-subline saved-flag">Saved to watchlist</div>' : ''}
                    </td>
                    <td>${escapeHtml(safe(item.Level_Text) || '—')}</td>
                    <td>${escapeHtml(formatEligibility(item))}</td>
                    <td>${escapeHtml(safe(item.Ministry) || '—')}</td>
                    <td>${escapeHtml(formatLocation(item) || '—')}</td>
                    <td class="days-left ${closingSoon ? 'closing' : ''}">
                        ${formatDaysLeft(daysLeft)}
                    </td>
                    <td>
                        <span class="badge ${status === 'Active' ? 'badge-active' : ''}">
                            ${escapeHtml(status)}
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
            const vacancyId = safe(item.Vacancy_ID);
            const saved = isInWatchlist(vacancyId);
            const daysLeft = parseInt(item.Days_Left, 10);
            const closingSoon = !Number.isNaN(daysLeft) && daysLeft >= 0 && daysLeft <= 15;
            const expired = !Number.isNaN(daysLeft) && daysLeft < 0;
            const status = safe(item.Status) || '—';

            return `
                <div class="job-card premium-card" data-open-modal="true" data-id="${escapeHtml(vacancyId)}">
                    <div class="job-card-top">
                        <div class="job-meta-row">
                            <span class="meta-pill meta-pill-level">
                                ${escapeHtml(safe(item.Level_Text) || '—')}
                            </span>
                            <span class="meta-pill meta-pill-eligibility">
                                Eligible: ${escapeHtml(formatEligibility(item))}
                            </span>
                            ${saved ? '<span class="meta-pill meta-pill-saved">Saved</span>' : ''}
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
                                ${formatDaysLeft(daysLeft)}
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
                        <button type="button" class="card-action-btn" data-card-action="details" data-id="${escapeHtml(vacancyId)}">
                            View Details
                        </button>
                        <button
                            type="button"
                            class="card-action-btn secondary ${saved ? 'saved' : ''}"
                            data-card-action="watchlist"
                            data-id="${escapeHtml(vacancyId)}"
                            aria-pressed="${saved ? 'true' : 'false'}"
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

    function openModal(vacancyId) {
        const item = getItemById(vacancyId);
        if (!item) return;

        modalOpenVacancyId = String(vacancyId);
        modalBody.innerHTML = renderModalContent(item);
        modal.style.display = 'flex';
        lucide.createIcons();
    }

    function closeModal() {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
        modalOpenVacancyId = null;
    }

    function renderModalContent(item) {
        const vacancyId = safe(item.Vacancy_ID);
        const saved = isInWatchlist(vacancyId);
        const daysLeft = parseInt(item.Days_Left, 10);
        const status = safe(item.Status) || '—';

        const subtitle = buildModalSubtitle(item);
        const officialLink = getOfficialLink(item);
        const closingDate = pickFirstNonEmpty(item, [
            'Closing_Date', 'Closing Date', 'Last_Date', 'Last Date',
            'End_Date', 'End Date', 'Apply_By', 'Apply By'
        ]);

        const ageLimit = pickFirstNonEmpty(item, [
            'Age_Limit', 'Age Limit', 'Max_Age', 'Maximum Age', 'Age'
        ]);

        const tenure = pickFirstNonEmpty(item, [
            'Tenure', 'Deputation_Tenure', 'Deputation Tenure',
            'Period_of_Deputation', 'Period of Deputation'
        ]);

        const applicationMode = pickFirstNonEmpty(item, [
            'Application_Mode', 'Application Mode', 'Mode_of_Application',
            'Mode of Application', 'Apply_Mode'
        ]);

        const essentialQualification = pickFirstNonEmpty(item, [
            'Essential_Qualification', 'Essential Qualification',
            'Essential Qualifications'
        ]);

        const desirableQualification = pickFirstNonEmpty(item, [
            'Desirable_Qualification', 'Desirable Qualification',
            'Desirable Qualifications'
        ]);

        const experience = pickFirstNonEmpty(item, [
            'Experience', 'Required_Experience', 'Required Experience',
            'Relevant_Experience', 'Relevant Experience'
        ]);

        const description = pickFirstNonEmpty(item, [
            'Description', 'Post_Description', 'Post Description',
            'Job_Description', 'Job Description', 'Details'
        ]);

        const remarks = pickFirstNonEmpty(item, [
            'Remarks', 'Notes', 'Additional_Remarks', 'Additional Remarks'
        ]);

        return `
            <div class="vacancy-modal">
                <div class="modal-header-block">
                    <div class="modal-title-wrap">
                        <h2 class="modal-title">${escapeHtml(safe(item.Post_Name) || '—')}</h2>
                        <div class="modal-subtitle">${escapeHtml(subtitle || '—')}</div>
                    </div>

                    <div class="modal-actions">
                        <button
                            type="button"
                            class="modal-secondary-btn ${saved ? 'saved' : ''}"
                            data-modal-watchlist="${escapeHtml(vacancyId)}"
                        >
                            ${saved ? 'Remove from Watchlist' : 'Save to Watchlist'}
                        </button>
                        ${officialLink ? `
                            <a
                                class="modal-primary-btn"
                                href="${escapeHtml(officialLink)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Official Notice
                            </a>
                        ` : ''}
                    </div>
                </div>

                <div class="modal-chip-row">
                    <span class="modal-chip">${escapeHtml(safe(item.Level_Text) || '—')}</span>
                    <span class="modal-chip">Eligibility: ${escapeHtml(formatEligibility(item))}</span>
                    <span class="modal-chip ${status === 'Active' ? 'status-chip-active' : ''}">
                        ${escapeHtml(status)}
                    </span>
                    ${saved ? '<span class="modal-chip saved-chip">Saved</span>' : ''}
                </div>

                <div class="modal-grid">
                    ${buildModalInfoCard('Location', escapeHtml(formatLocation(item) || '—'))}
                    ${buildModalInfoCard('Organisation', escapeHtml(safe(item.Department_Organisation) || '—'))}
                    ${buildModalInfoCard('Days Left', `<span class="${daysLeft >= 0 && daysLeft <= 15 ? 'days-left closing' : ''}">${formatDaysLeft(daysLeft)}</span>`)}
                    ${buildModalInfoCard('Vacancy ID', escapeHtml(vacancyId || '—'))}
                    ${closingDate ? buildModalInfoCard('Closing Date', escapeHtml(closingDate)) : ''}
                    ${tenure ? buildModalInfoCard('Tenure', escapeHtml(tenure)) : ''}
                    ${ageLimit ? buildModalInfoCard('Age Limit', escapeHtml(ageLimit)) : ''}
                    ${applicationMode ? buildModalInfoCard('Application Mode', escapeHtml(applicationMode)) : ''}
                </div>

                <div class="modal-sections">
                    ${essentialQualification ? buildModalSection('Essential Qualification', essentialQualification) : ''}
                    ${desirableQualification ? buildModalSection('Desirable Qualification', desirableQualification) : ''}
                    ${experience ? buildModalSection('Experience', experience) : ''}
                    ${description ? buildModalSection('Description', description) : ''}
                    ${remarks ? buildModalSection('Remarks', remarks) : ''}
                </div>
            </div>
        `;
    }

    function buildModalInfoCard(label, valueHtml) {
        return `
            <div class="modal-info-card">
                <div class="modal-info-label">${label}</div>
                <div class="modal-info-value">${valueHtml}</div>
            </div>
        `;
    }

    function buildModalSection(title, text) {
        return `
            <div class="modal-section">
                <div class="modal-section-title">${escapeHtml(title)}</div>
                <div class="modal-paragraph">${formatTextBlock(text)}</div>
            </div>
        `;
    }

    function buildModalSubtitle(item) {
        const ministry = safe(item.Ministry);
        const organisation = safe(item.Department_Organisation);

        if (ministry && organisation && ministry.toLowerCase() !== organisation.toLowerCase()) {
            return `${ministry} • ${organisation}`;
        }

        return ministry || organisation || '';
    }

    function toggleWatchlist(vacancyId) {
        const normalizedId = String(vacancyId);
        if (!normalizedId) return;

        if (watchlist.has(normalizedId)) {
            watchlist.delete(normalizedId);
        } else {
            watchlist.add(normalizedId);
        }

        persistWatchlist();
        updateWatchlistUI();
        renderDashboard(false);

        if (modalOpenVacancyId === normalizedId) {
            if (watchlistOnly && !watchlist.has(normalizedId)) {
                closeModal();
            } else {
                openModal(normalizedId);
            }
        }
    }

    function loadWatchlist() {
        try {
            const stored = localStorage.getItem(WATCHLIST_KEY);
            if (!stored) return new Set();

            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return new Set();

            return new Set(parsed.map(String));
        } catch (error) {
            console.warn('Could not load watchlist from localStorage:', error);
            return new Set();
        }
    }

    function persistWatchlist() {
        try {
            localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...watchlist]));
        } catch (error) {
            console.warn('Could not save watchlist to localStorage:', error);
        }
    }

    function isInWatchlist(vacancyId) {
        return watchlist.has(String(vacancyId));
    }

    function updateWatchlistUI() {
        favCount.textContent = String(watchlist.size);
        favBtn.classList.toggle('active-watchlist', watchlistOnly);
        favBtn.setAttribute('aria-pressed', watchlistOnly ? 'true' : 'false');
    }

    function getItemById(vacancyId) {
        const normalizedId = String(vacancyId);
        return rawData.find(item => safe(item.Vacancy_ID) === normalizedId) || null;
    }

    function getOfficialLink(item) {
        const raw = pickFirstNonEmpty(item, [
            'Official_Link', 'Official Link', 'Notification_Link',
            'Notification Link', 'Apply_Link', 'Apply Link',
            'Vacancy_Link', 'Vacancy Link', 'URL', 'Link'
        ]);

        if (!raw) return '';

        if (/^https?:\/\//i.test(raw)) return raw;
        if (/^www\./i.test(raw)) return `https://${raw}`;
        return '';
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
        return [...new Set(arr.map(safe).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b));
    }

    function safe(value) {
        return value == null ? '' : String(value).trim();
    }

    function pickFirstNonEmpty(item, keys) {
        for (const key of keys) {
            const value = safe(item[key]);
            if (value) return value;
        }
        return '';
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
        if (Number.isNaN(daysLeft)) return '—';
        if (daysLeft < 0) return 'Expired';
        if (daysLeft === 0) return 'Today';
        if (daysLeft === 1) return '1 day';
        return `${daysLeft} days`;
    }

    function formatTextBlock(text) {
        return escapeHtml(text).replace(/\n/g, '<br>');
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
