document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');

    // Strong loading message
    dataContainer.innerHTML = `
        <div style="padding:80px 20px; text-align:center; background:#0f172a; border-radius:16px; color:#94a3b8; font-size:1.3rem;">
            <i data-lucide="loader-2" class="spin" style="width:70px;height:70px;display:block;margin:0 auto 20px;"></i>
            Loading 53 vacancies...
        </div>`;
    lucide.createIcons();

    Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const data = results.data.filter(row => row.Vacancy_ID);

            // KPIs with inline styles
            kpiGrid.innerHTML = `
                <div style="background:#0f172a;border:1px solid #334155;border-radius:16px;padding:25px;text-align:center;">
                    <div style="font-size:0.9rem;color:#94a3b8;font-weight:600;">TOTAL VACANCIES</div>
                    <div style="font-size:3rem;font-weight:800;color:#22d3ee;">${data.length}</div>
                </div>
                <div style="background:#0f172a;border:1px solid #334155;border-radius:16px;padding:25px;text-align:center;">
                    <div style="font-size:0.9rem;color:#94a3b8;font-weight:600;">ACTIVE</div>
                    <div style="font-size:3rem;font-weight:800;color:#22c55e;">${data.filter(d => d.Status === "Active").length}</div>
                </div>`;

            // Table with very strong inline styles
            let html = `<div style="background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #334155;">
                <table style="width:100%;border-collapse:collapse;font-size:1rem;">
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

            data.forEach(item => {
                const isClosing = parseInt(item.Days_Left) > 0 && parseInt(item.Days_Left) <= 15;
                html += `<tr style="border-top:1px solid #334155;">
                    <td style="padding:18px 16px;"><strong>${item.Post_Name}</strong></td>
                    <td style="padding:18px 16px;">${item.Level_Text}</td>
                    <td style="padding:18px 16px;">${item.Ministry}</td>
                    <td style="padding:18px 16px;">${item.Location_City}, ${item.Location_State}</td>
                    <td style="padding:18px 16px;color:${isClosing ? '#f43f5e' : '#94a3b8'};">${item.Days_Left} days</td>
                </tr>`;
            });

            html += `</tbody></table></div>`;

            dataContainer.innerHTML = html;
            resultsCount.textContent = `${data.length} vacancies`;
            lucide.createIcons();
        }
    });
});
