document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App started');

    lucide.createIcons();

    // Elements
    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');
    const filterMyPayLevel = document.getElementById('filterMyPayLevel');
    const filterLevel = document.getElementById('filterLevel');
    const filterMinistry = document.getElementById('filterMinistry');
    const filterLocation = document.getElementById('filterLocation');
    const themeToggle = document.getElementById('themeToggle');

    let rawData = [];

    // Theme Toggle
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

    // Loading
    dataContainer.innerHTML = `
        <div style="height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;color:#94a3b8">
            <i data-lucide="loader-2" class="spin" style="width:70px;height:70px"></i>
            <p style="font-size:1.25rem">Loading vacancies from Google Sheet...</p>
        </div>`;
    lucide.createIcons();

    // Load CSV
    Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            rawData = results.data.filter(row => row.Vacancy_ID);
            console.log('✅ Loaded', rawData.length, 'vacancies');

            populateFilters();
            renderDashboard();
        },
        error: function(err) {
            console.error('PapaParse Error:', err);
            dataContainer.innerHTML = `<div style="padding:60px;text-align:center;color:#f43f5e">Failed to load data.<br>Please refresh the page.</div>`;
        }
    });

    function populateFilters() {
        // My Pay Level
        for (let i = 18; i >= 1; i--) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Level ${i}`;
            filterMyPayLevel.appendChild(opt);
        }

        // Other filters
        const levels = [...new Set(rawData.map(i => i.Level_Text).filter(Boolean))].sort();
        const ministries = [...new Set(rawData.map(i => i.Ministry).filter(Boolean))].sort();
        const locations = [...new Set(rawData.map(i => i.Location_State).filter(Boolean))].sort();

        levels.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; filterLevel.appendChild(o); });
        ministries.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; filterMinistry.appendChild(o); });
        locations.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; filterLocation.appendChild(o); });
    }

    function renderDashboard() {
        console.log('Rendering dashboard with', rawData.length, 'items');

        // KPIs
        const activeCount = rawData.filter(d => d.Status === "Active").length;
        kpiGrid.innerHTML = `
            <div class="kpi-card">
                <span class="kpi-title">TOTAL VACANCIES</span>
                <span class="kpi-value">${rawData.length}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-title">ACTIVE</span>
                <span class="kpi-value">${activeCount}</span>
            </div>
        `;

        // Table
        let html = `<div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Post Name</th>
                        <th>Level</th>
                        <th>Ministry</th>
                        <th>Location</th>
                        <th>Days Left</th>
                    </tr>
                </thead>
                <tbody>`;

        rawData.forEach(item => {
            const isClosing = parseInt(item.Days_Left) > 0 && parseInt(item.Days_Left) <= 15;
            html += `<tr>
                <td><strong>${item.Post_Name}</strong></td>
                <td><span class="badge badge-level">${item.Level_Text}</span></td>
                <td>${item.Ministry}<br><small>${item.Organisation || ''}</small></td>
                <td>${item.Location_City}, ${item.Location_State}</td>
                <td><span class="${isClosing ? 'days-left closing' : 'days-left'}">${item.Days_Left} days</span></td>
            </tr>`;
        });

        html += `</tbody></table></div>`;

        dataContainer.innerHTML = html;
        resultsCount.textContent = `${rawData.length} vacancies`;
        lucide.createIcons();

        console.log('✅ Dashboard rendered successfully');
    }
});
