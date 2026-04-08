document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');

    // Show loading
    dataContainer.innerHTML = `
        <div style="padding:60px 20px; text-align:center; color:#94a3b8;">
            <i data-lucide="loader-2" class="spin" style="width:60px;height:60px;"></i>
            <p style="margin-top:20px; font-size:1.2rem;">Loading 53 vacancies...</p>
        </div>`;
    lucide.createIcons();

    Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const data = results.data.filter(row => row.Vacancy_ID);

            console.log('✅ Rendering', data.length, 'vacancies');

            // Simple KPIs
            kpiGrid.innerHTML = `
                <div class="kpi-card" style="padding:20px; border-radius:12px; background:rgba(15,23,42,0.8); border:1px solid #334155;">
                    <span style="font-size:0.9rem; color:#94a3b8;">TOTAL VACANCIES</span>
                    <span style="font-size:2.8rem; font-weight:800; display:block; margin-top:8px;">${data.length}</span>
                </div>
                <div class="kpi-card" style="padding:20px; border-radius:12px; background:rgba(15,23,42,0.8); border:1px solid #334155;">
                    <span style="font-size:0.9rem; color:#94a3b8;">ACTIVE</span>
                    <span style="font-size:2.8rem; font-weight:800; display:block; margin-top:8px;">${data.filter(d => d.Status === "Active").length}</span>
                </div>
            `;

            // Simple Table with inline styles (so it shows even if CSS is partial)
            let html = `<div style="background:#0f172a; border-radius:12px; overflow:hidden; border:1px solid #334155;">
                <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
                    <thead>
                        <tr style="background:#1e2937;">
                            <th style="padding:16px; text-align:left; color:#94a3b8;">Post Name</th>
                            <th style="padding:16px; text-align:left; color:#94a3b8;">Level</th>
                            <th style="padding:16px; text-align:left; color:#94a3b8;">Ministry</th>
                            <th style="padding:16px; text-align:left; color:#94a3b8;">Location</th>
                            <th style="padding:16px; text-align:left; color:#94a3b8;">Days Left</th>
                        </tr>
                    </thead>
                    <tbody>`;

            data.forEach(item => {
                html += `<tr style="border-top:1px solid #334155;">
                    <td style="padding:16px;"><strong>${item.Post_Name}</strong></td>
                    <td style="padding:16px;">${item.Level_Text}</td>
                    <td style="padding:16px;">${item.Ministry}</td>
                    <td style="padding:16px;">${item.Location_City}, ${item.Location_State}</td>
                    <td style="padding:16px;">${item.Days_Left} days</td>
                </tr>`;
            });

            html += `</tbody></table></div>`;

            dataContainer.innerHTML = html;
            resultsCount.textContent = `${data.length} vacancies`;
            lucide.createIcons();
        }
    });
});
