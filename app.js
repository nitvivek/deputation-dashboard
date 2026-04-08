document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');

    // Loading State
    dataContainer.innerHTML = `
        <div style="height:400px;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#94a3b8;gap:15px">
            <i data-lucide="loader-2" class="spin" style="width:60px;height:60px"></i>
            <p style="font-size:1.2rem">Loading Deputation Vacancies...</p>
        </div>`;
    lucide.createIcons();

    Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const data = results.data.filter(row => row.Vacancy_ID);

            console.log('✅ Successfully loaded', data.length, 'vacancies');

            // KPIs
            kpiGrid.innerHTML = `
                <div class="kpi-card">
                    <span class="kpi-title">TOTAL VACANCIES</span>
                    <span class="kpi-value">${data.length}</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-title">ACTIVE</span>
                    <span class="kpi-value">${data.filter(d => d.Status === "Active").length}</span>
                </div>
            `;

            // Beautiful Table using your CSS classes
            let html = `<div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Post Name</th>
                            <th>Level</th>
                            <th>Ministry / Organisation</th>
                            <th>Location</th>
                            <th>Days Left</th>
                        </tr>
                    </thead>
                    <tbody>`;

            data.forEach(item => {
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
            resultsCount.textContent = `${data.length} vacancies`;

            lucide.createIcons();
        },
        error: function(err) {
            console.error(err);
            dataContainer.innerHTML = `<div style="padding:40px;text-align:center;color:#f43f5e">Failed to load data. Please refresh.</div>`;
        }
    });
});
