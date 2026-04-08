document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App started - Minimal version');

    // Elements
    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');
    const filterMyPayLevel = document.getElementById('filterMyPayLevel');
    const filterLevel = document.getElementById('filterLevel');
    const filterMinistry = document.getElementById('filterMinistry');
    const filterLocation = document.getElementById('filterLocation');

    let rawData = [];

    // Simple Loading
    dataContainer.innerHTML = `
        <div style="padding:80px 20px;text-align:center;background:#0f172a;border-radius:16px;color:#94a3b8;font-size:1.3rem;">
            Loading 53 vacancies from Google Sheet...
        </div>`;

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
        // My Pay Level
        for (let i = 18; i >= 1; i--) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Level ${i}`;
            filterMyPayLevel.appendChild(opt);
        }

        const levels = [...new Set(rawData.map(i => i.Level_Text).filter(Boolean))].sort();
        const ministries = [...new Set(rawData.map(i => i.Ministry).filter(Boolean))].sort();
        const locations = [...new Set(rawData.map(i => i.Location_State).filter(Boolean))].sort();

        levels.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; filterLevel.appendChild(o); });
        ministries.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; filterMinistry.appendChild(o); });
        locations.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; filterLocation.appendChild(o); });
    }

    function renderDashboard() {
        // KPIs
        const active = rawData.filter(d => d.Status === "Active").length;
        kpiGrid.innerHTML = `
            <div style="background:#0f172a;border:1px solid #334155;border-radius:16px;padding:25px;text-align:center;margin-bottom:20px;">
                <div style="font-size:0.9rem;color:#94a3b8;">TOTAL VACANCIES</div>
                <div style="font-size:3rem;font-weight:800;color:#22d3ee;">${rawData.length}</div>
            </div>
            <div style="background:#0f172a;border:1px solid #334155;border-radius:16px;padding:25px;text-align:center;">
                <div style="font-size:0.9rem;color:#94a3b8;">ACTIVE</div>
                <div style="font-size:3rem;font-weight:800;color:#22c55e;">${active}</div>
            </div>`;

        // Table
        let html = `<div style="background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #334155;">
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#1e2937;">
                        <th style="padding:18px 16px;text-align:left;color:#94a3b8;">Post Name</th>
                        <th style="padding:18px 16px;text-align:left;color:#94a3b8;">Level</th>
                        <th style="padding:18px 16px;text-align:left;color:#94a3b8;">Ministry</th>
                        <th style="padding:18px 16px;text-align:left;color:#94a3b8;">Location</th>
                        <th style="padding:18px 16px;text-align:left;color:#94a3b8;">Days Left</th>
                    </tr>
                </thead>
                <tbody>`;

        rawData.forEach(item => {
            const closing = parseInt(item.Days_Left) <= 15 && parseInt(item.Days_Left) > 0;
            html += `<tr style="border-top:1px solid #334155;">
                <td style="padding:18px 16px;"><strong>${item.Post_Name}</strong></td>
                <td style="padding:18px 16px;">${item.Level_Text}</td>
                <td style="padding:18px 16px;">${item.Ministry}</td>
                <td style="padding:18px 16px;">${item.Location_City}, ${item.Location_State}</td>
                <td style="padding:18px 16px;color:${closing ? '#f43f5e' : '#94a3b8'};">${item.Days_Left} days</td>
            </tr>`;
        });

        html += `</tbody></table></div>`;

        dataContainer.innerHTML = html;
        resultsCount.textContent = `${rawData.length} vacancies`;
    }
});
