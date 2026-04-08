document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App started');

    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');

    // Clear everything and show big visible loading
    dataContainer.innerHTML = `
        <div style="padding:100px 20px; text-align:center; background:#0f172a; border:3px solid #22d3ee; border-radius:20px; color:white; font-size:1.5rem;">
            LOADING 53 VACANCIES...
        </div>`;

    Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const data = results.data.filter(row => row.Vacancy_ID);

            console.log('✅ Loaded', data.length, 'vacancies');

            // Very obvious KPIs
            kpiGrid.innerHTML = `
                <div style="background:#0f172a;border:2px solid #22d3ee;border-radius:16px;padding:30px;text-align:center;margin-bottom:20px;">
                    <div style="font-size:1rem;color:#94a3b8;">TOTAL VACANCIES</div>
                    <div style="font-size:3.5rem;font-weight:900;color:#22d3ee;">${data.length}</div>
                </div>
                <div style="background:#0f172a;border:2px solid #22c55e;border-radius:16px;padding:30px;text-align:center;">
                    <div style="font-size:1rem;color:#94a3b8;">ACTIVE VACANCIES</div>
                    <div style="font-size:3.5rem;font-weight:900;color:#22c55e;">${data.filter(d => d.Status === "Active").length}</div>
                </div>`;

            // Very obvious table with huge inline styles
            let html = `<div style="background:#0f172a;border:3px solid #334155;border-radius:20px;overflow:hidden;margin-top:20px;">
                <table style="width:100%;border-collapse:collapse;font-size:1.1rem;">
                    <thead>
                        <tr style="background:#1e2937;">
                            <th style="padding:20px;text-align:left;color:#22d3ee;">Post Name</th>
                            <th style="padding:20px;text-align:left;color:#22d3ee;">Level</th>
                            <th style="padding:20px;text-align:left;color:#22d3ee;">Ministry</th>
                            <th style="padding:20px;text-align:left;color:#22d3ee;">Location</th>
                            <th style="padding:20px;text-align:left;color:#22d3ee;">Days Left</th>
                        </tr>
                    </thead>
                    <tbody>`;

            data.forEach(item => {
                html += `<tr style="border-top:1px solid #334155;">
                    <td style="padding:20px;"><strong>${item.Post_Name}</strong></td>
                    <td style="padding:20px;">${item.Level_Text}</td>
                    <td style="padding:20px;">${item.Ministry}</td>
                    <td style="padding:20px;">${item.Location_City}, ${item.Location_State}</td>
                    <td style="padding:20px;color:#f59e0b;">${item.Days_Left} days</td>
                </tr>`;
            });

            html += `</tbody></table></div>`;

            dataContainer.innerHTML = html;
            resultsCount.textContent = `${data.length} vacancies`;
            console.log('✅ Table should now be visible');
        }
    });
});
