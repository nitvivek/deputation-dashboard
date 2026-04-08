document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const dataContainer = document.getElementById('dataContainer');
    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');

    // Show loading
    dataContainer.innerHTML = `
        <div style="height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;color:#64748b">
            <i data-lucide="loader-2" class="spin" style="width:52px;height:52px"></i>
            <p style="font-size:1.1rem">Loading Deputation Vacancies...</p>
        </div>`;
    lucide.createIcons();

    // Load data from Google Sheet
    Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const rawData = results.data.filter(row => row.Vacancy_ID);
            console.log('✅ Loaded', rawData.length, 'vacancies');

            // Render KPIs
            kpiGrid.innerHTML = `
                <div class="kpi-card"><span class="kpi-title">Total Vacancies</span><span class="kpi-value">${rawData.length}</span></div>
                <div class="kpi-card"><span class="kpi-title">Active</span><span class="kpi-value">${rawData.filter(d => d.Status === 'Active').length}</span></div>
            `;

            // Render simple table
            let html = `<div class="table-wrapper"><table class="data-table"><thead><tr>
                <th>Post</th><th>Level</th><th>Ministry</th><th>Location</th><th>Days Left</th>
            </tr></thead><tbody>`;

            rawData.forEach(item => {
                html += `<tr>
                    <td><strong>${item.Post_Name}</strong></td>
                    <td><span class="badge badge-level">${item.Level_Text}</span></td>
                    <td>${item.Ministry}</td>
                    <td>${item.Location_City}, ${item.Location_State}</td>
                    <td>${item.Days_Left} days</td>
                </tr>`;
            });

            html += `</tbody></table></div>`;
            dataContainer.innerHTML = html;
            resultsCount.textContent = `${rawData.length} vacancies`;
            lucide.createIcons();
        },
        error: function() {
            dataContainer.innerHTML = `<div style="padding:3rem;text-align:center;color:#f43f5e">Failed to load data. Refresh the page.</div>`;
        }
    });
});
