document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App started');

    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv';

    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');
    const activeFilters = document.getElementById('activeFilters');
    const dashboardContent = document.querySelector('.dashboard-content');

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
    let lastLoadedAt = null;

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

    let quickFilters = {
        closing7: false,
        delhiNcr: false,
        closingToday: false
    };

    let searchSuggestions = [];
    let searchDatalist = null;
    let quickFiltersBar = null;
    let footerInfo = null;

    initializeModal();
    initializeEnhancements();
    updateWatchlistUI();

    dataContainer.innerHTML = `
        <div class="loading-shell">
            <div class="loading-header-skeleton shimmer"></div>

            <div class="loading-kpi-row">
                <div class="loading-kpi-card shimmer"></div>
                <div class="loading-kpi-card shimmer"></div>
                <div class="loading-kpi-card shimmer"></div>
                <div class="loading-kpi-card shimmer"></div>
            </div>

            <div class="loading-table-shell">
                <div class="loading-table-toolbar shimmer"></div>
                <div class="loading-row shimmer"></div>
                <div class="loading-row shimmer"></div>
                <div class="loading-row shimmer"></div>
                <div class="loading-row shimmer"></div>
                <div class="loading-row shimmer"></div>
            </div>
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

            reconcileWatchlistWithData();
            lastLoadedAt = new Date();
            buildSearchSuggestions();
            updateQuickFiltersBar();
            updateFooterInfo();

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

    function initializeEnhancements() {
        createSearchDatalist();
        createQuickFiltersBar();
        createFooterInfo();
    }

    function createSearchDatalist() {
        searchDatalist = document.createElement('datalist');
        searchDatalist.id = 'searchSuggestionsList';
        document.body.appendChild(searchDatalist);
        searchPost.setAttribute('list', 'searchSuggestionsList');
    }

    function createQuickFiltersBar() {
        if (!dashboardContent) return;

        quickFiltersBar = document.createElement('div');
        quickFiltersBar.className = 'quick-filters-bar';
        quickFiltersBar.id = 'quickFiltersBar';

        const toolbar = dashboardContent.querySelector('.content-toolbar');
        if (toolbar) {
            dashboardContent.insertBefore(quickFiltersBar, toolbar);
        } else {
            dashboardContent.appendChild(quickFiltersBar);
        }
    }

    function createFooterInfo() {
        if (!dashboardContent) return;

        footerInfo = document.createElement('div');
        footerInfo.className = 'dashboard-footer-info';
        footerInfo.id = 'dashboardFooterInfo';

        dashboardContent.appendChild(footerInfo);
    }

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
                    const alreadySaved = watchlist.has(safe(vacancyId));

                    toggleWatchlist(vacancyId);
                    renderDashboard(false);

                    if (!alreadySaved) {
                        animateBookmarkButton(vacancyId);
                    }

                    if (showWatchlistOnly && alreadySaved) {
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

        searchPost.addEventListener('input', () => {
            refreshSearchSuggestions(searchPost.value);
        });

        if (quickFiltersBar) {
            quickFiltersBar.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-quick-filter]');
                if (!btn) return;

                const key = btn.getAttribute('data-quick-filter');
                if (!Object.prototype.hasOwnProperty.call(quickFilters, key)) return;

                quickFilters[key] = !quickFilters[key];
                pagination.currentPage = 1;
                updateQuickFiltersBar();
                renderDashboard();
            });
        }

        clearFiltersBtn.addEventListener('click', () => {
            searchPost.value = '';
            filterMyPayLevel.value = '';
            filterLevel.value = '';
            filterMinistry.value = '';
            filterLocation.value = '';
            filterStatus.value = 'Active';
            showWatchlistOnly = false;

            quickFilters = {
                closing7: false,
                delhiNcr: false,
                closingToday: false
            };

            updateQuickFiltersBar();
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

            const cardAction = e.target.closest('[data-card-action]');
            if (cardAction) {
                e.stopPropagation();

                const action = cardAction.getAttribute('data-card-action');
                const vacancyId = cardAction.getAttribute('data-id');

                if (action === 'watchlist') {
                    const wasSaved = watchlist.has(safe(vacancyId));
                    toggleWatchlist(vacancyId);
                    renderDashboard(false);
                    if (!wasSaved) animateBookmarkButton(vacancyId);
                }
                return;
            }

            const tableAction = e.target.closest('[data-table-action]');
            if (tableAction) {
                e.stopPropagation();

                const action = tableAction.getAttribute('data-table-action');
                const vacancyId = tableAction.getAttribute('data-id');

                if (action === 'watchlist') {
                    const wasSaved = watchlist.has(safe(vacancyId));
                    toggleWatchlist(vacancyId);
                    renderDashboard(false);
                    if (!wasSaved) animateBookmarkButton(vacancyId);
                }
                return;
            }

            const detailsTrigger = e.target.closest('[data-open-details]');
            if (detailsTrigger) {
                openVacancyModal(detailsTrigger.getAttribute('data-open-details'));
            }
        });
    }

     document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App started');

    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv';

    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');
    const activeFilters = document.getElementById('activeFilters');
    const dashboardContent = document.querySelector('.dashboard-content');

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
    let lastLoadedAt = null;

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

    let quickFilters = {
        closing7: false,
        delhiNcr: false,
        closingToday: false
    };

    let searchSuggestions = [];
    let searchDatalist = null;
    let quickFiltersBar = null;
    let footerInfo = null;

    initializeModal();
    initializeEnhancements();
    updateWatchlistUI();

    dataContainer.innerHTML = `
        <div class="loading-shell">
            <div class="loading-header-skeleton shimmer"></div>

            <div class="loading-kpi-row">
                <div class="loading-kpi-card shimmer"></div>
                <div class="loading-kpi-card shimmer"></div>
                <div class="loading-kpi-card shimmer"></div>
                <div class="loading-kpi-card shimmer"></div>
            </div>

            <div class="loading-table-shell">
                <div class="loading-table-toolbar shimmer"></div>
                <div class="loading-row shimmer"></div>
                <div class="loading-row shimmer"></div>
                <div class="loading-row shimmer"></div>
                <div class="loading-row shimmer"></div>
                <div class="loading-row shimmer"></div>
            </div>
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

            reconcileWatchlistWithData();
            lastLoadedAt = new Date();
            buildSearchSuggestions();
            updateQuickFiltersBar();
            updateFooterInfo();

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

    function initializeEnhancements() {
        createSearchDatalist();
        createQuickFiltersBar();
        createFooterInfo();
    }

    function createSearchDatalist() {
        searchDatalist = document.createElement('datalist');
        searchDatalist.id = 'searchSuggestionsList';
        document.body.appendChild(searchDatalist);
        searchPost.setAttribute('list', 'searchSuggestionsList');
    }

    function createQuickFiltersBar() {
        if (!dashboardContent) return;

        quickFiltersBar = document.createElement('div');
        quickFiltersBar.className = 'quick-filters-bar';
        quickFiltersBar.id = 'quickFiltersBar';

        const toolbar = dashboardContent.querySelector('.content-toolbar');
        if (toolbar) {
            dashboardContent.insertBefore(quickFiltersBar, toolbar);
        } else {
            dashboardContent.appendChild(quickFiltersBar);
        }
    }

    function createFooterInfo() {
        if (!dashboardContent) return;

        footerInfo = document.createElement('div');
        footerInfo.className = 'dashboard-footer-info';
        footerInfo.id = 'dashboardFooterInfo';

        dashboardContent.appendChild(footerInfo);
    }

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
                    const alreadySaved = watchlist.has(safe(vacancyId));

                    toggleWatchlist(vacancyId);
                    renderDashboard(false);

                    if (!alreadySaved) {
                        animateBookmarkButton(vacancyId);
                    }

                    if (showWatchlistOnly && alreadySaved) {
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

        searchPost.addEventListener('input', () => {
            refreshSearchSuggestions(searchPost.value);
        });

        if (quickFiltersBar) {
            quickFiltersBar.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-quick-filter]');
                if (!btn) return;

                const key = btn.getAttribute('data-quick-filter');
                if (!Object.prototype.hasOwnProperty.call(quickFilters, key)) return;

                quickFilters[key] = !quickFilters[key];
                pagination.currentPage = 1;
                updateQuickFiltersBar();
                renderDashboard();
            });
        }

        clearFiltersBtn.addEventListener('click', () => {
            searchPost.value = '';
            filterMyPayLevel.value = '';
            filterLevel.value = '';
            filterMinistry.value = '';
            filterLocation.value = '';
            filterStatus.value = 'Active';
            showWatchlistOnly = false;

            quickFilters = {
                closing7: false,
                delhiNcr: false,
                closingToday: false
            };

            updateQuickFiltersBar();
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

            const cardAction = e.target.closest('[data-card-action]');
            if (cardAction) {
                e.stopPropagation();

                const action = cardAction.getAttribute('data-card-action');
                const vacancyId = cardAction.getAttribute('data-id');

                if (action === 'watchlist') {
                    const wasSaved = watchlist.has(safe(vacancyId));
                    toggleWatchlist(vacancyId);
                    renderDashboard(false);
                    if (!wasSaved) animateBookmarkButton(vacancyId);
                }
                return;
            }

            const tableAction = e.target.closest('[data-table-action]');
            if (tableAction) {
                e.stopPropagation();

                const action = tableAction.getAttribute('data-table-action');
                const vacancyId = tableAction.getAttribute('data-id');

                if (action === 'watchlist') {
                    const wasSaved = watchlist.has(safe(vacancyId));
                    toggleWatchlist(vacancyId);
                    renderDashboard(false);
                    if (!wasSaved) animateBookmarkButton(vacancyId);
                }
                return;
            }

            const detailsTrigger = e.target.closest('[data-open-details]');
            if (detailsTrigger) {
                openVacancyModal(detailsTrigger.getAttribute('data-open-details'));
            }
        });
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
                    <td class="table-heart-cell">
                        <button
                            type="button"
                            class="table-heart-btn ${saved ? 'saved' : ''}"
                            data-table-action="watchlist"
                            data-id="${escapeHtml(vacancyId)}"
                            title="Bookmark the Vacancy"
                            aria-label="${saved ? 'Remove bookmarked vacancy' : 'Bookmark the Vacancy'}"
                            aria-pressed="${saved ? 'true' : 'false'}"
                        >
                            <i data-lucide="heart"></i>
                        </button>
                    </td>
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
                                Detailed Notification
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
                </tr>
            `;
        }).join('');

        return `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Save</th>
                            ${renderSortableHeader('Post Name', 'Post_Name')}
                            ${renderSortableHeader('Level', 'Level_Text')}
                            ${renderSortableHeader('Eligibility', 'Eligibility')}
                            ${renderSortableHeader('Ministry', 'Ministry')}
                            ${renderSortableHeader('Location', 'Location')}
                            ${renderSortableHeader('Days Left', 'Days_Left')}
                            ${renderSortableHeader('Status', 'Status')}
                            <th>Notification</th>
                            <th>Apply</th>
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
                    <button
                        type="button"
                        class="card-heart-btn ${saved ? 'saved' : ''}"
                        data-card-action="watchlist"
                        data-id="${escapeHtml(vacancyId)}"
                        title="Bookmark the Vacancy"
                        aria-label="${saved ? 'Remove bookmarked vacancy' : 'Bookmark the Vacancy'}"
                        aria-pressed="${saved ? 'true' : 'false'}"
                    >
                        <i data-lucide="heart"></i>
                    </button>

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

                    ${(detailedNotificationLink || applyLink) ? `
                        <div class="job-card-footer">
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
                        </div>
                    ` : ''}
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
                    <td class="table-heart-cell">
                        <button
                            type="button"
                            class="table-heart-btn ${saved ? 'saved' : ''}"
                            data-table-action="watchlist"
                            data-id="${escapeHtml(vacancyId)}"
                            title="Bookmark the Vacancy"
                            aria-label="${saved ? 'Remove bookmarked vacancy' : 'Bookmark the Vacancy'}"
                            aria-pressed="${saved ? 'true' : 'false'}"
                        >
                            <i data-lucide="heart"></i>
                        </button>
                    </td>
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
                                Detailed Notification
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
                </tr>
            `;
        }).join('');

        return `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Save</th>
                            ${renderSortableHeader('Post Name', 'Post_Name')}
                            ${renderSortableHeader('Level', 'Level_Text')}
                            ${renderSortableHeader('Eligibility', 'Eligibility')}
                            ${renderSortableHeader('Ministry', 'Ministry')}
                            ${renderSortableHeader('Location', 'Location')}
                            ${renderSortableHeader('Days Left', 'Days_Left')}
                            ${renderSortableHeader('Status', 'Status')}
                            <th>Notification</th>
                            <th>Apply</th>
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
                    <button
                        type="button"
                        class="card-heart-btn ${saved ? 'saved' : ''}"
                        data-card-action="watchlist"
                        data-id="${escapeHtml(vacancyId)}"
                        title="Bookmark the Vacancy"
                        aria-label="${saved ? 'Remove bookmarked vacancy' : 'Bookmark the Vacancy'}"
                        aria-pressed="${saved ? 'true' : 'false'}"
                    >
                        <i data-lucide="heart"></i>
                    </button>

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

                    ${(detailedNotificationLink || applyLink) ? `
                        <div class="job-card-footer">
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
                        </div>
                    ` : ''}
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
