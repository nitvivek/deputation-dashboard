document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Elements
    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');
    const filterMyPayLevel = document.getElementById('filterMyPayLevel');
    const filterLevel = document.getElementById('filterLevel');
    const filterMinistry = document.getElementById('filterMinistry');
    const filterLocation = document.getElementById('filterLocation');

    let rawData = [];

    // Loading
    dataContainer.innerHTML = `
        <div style="height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;color:#94a3b8">
            <i data-lucide="loader-2" class="spin" style="width:60px;height:60px"></i>
            <p style="font-size:1.2rem">Loading Deputation Vacancies...</p>
        </div>`;
    lucide.createIcons();

    // Load Data
    Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            rawData = results.data.filter(row => row.Vacancy_ID);
            console.log('✅ Loaded', rawData.length, 'vacancies');

            populateFilters();
            renderDashboard();
        }
    });

    function populateFilters() {
        // Pay Level
        for (let i = 18; i >= 1; i--) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Level ${i}`;
            filterMyPayLevel.appendChild(opt);
        }

        // Other filters
        const levels = [...new Set(rawData.map(item => item.Level_Text).filter(Boolean))].sort();
        const ministries = [...new Set(rawData.map(item => item.Ministry).filter(Boolean))].sort();
        const locations = [...new Set(rawData.map(item => item.Location_State).filter(Boolean))].sort();

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
    }

    function renderDashboard() {
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
                <td>${item.Ministry}<br><small>${item.Organisation}</small></td>
                <td>${item.Location_City}, ${item.Location_State}</td>
                <td><span class="${isClosing ? 'days-left closing' : 'days-left'}">${item.Days_Left} days</span></td>
            </tr>`;
        });

        html += `</tbody></table></div>`;
        dataContainer.innerHTML = html;
        resultsCount.textContent = `${rawData.length} vacancies`;
        lucide.createIcons();
    }
});
