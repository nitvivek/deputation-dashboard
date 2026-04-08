document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const kpiGrid = document.getElementById('kpiGrid');
    const resultsCount = document.getElementById('resultsCount');
    const dataContainer = document.getElementById('dataContainer');

    // Loading message
    dataContainer.innerHTML = `
        <div style="height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8">
            <i data-lucide="loader-2" class="spin" style="width:60px;height:60px"></i>
            <p style="margin-top:20px;font-size:1.2rem">Loading Deputation Vacancies...</p>
        </div>`;
    lucide.createIcons();

    // Load data from Google Sheet
    Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const data = results.data.filter(row => row.Vacancy_ID);

            // KPIs
            kpiGrid.innerHTML = `
                <div class="kpi-card">
                    <span class="kpi-title">Total Vacancies</span>
                    <span class="kpi-value">${data.length}</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-title">Active</span>
                    <span class="kpi-value">${data.filter(d => d.Status === "Active").length}</span>
                </div>
            `;

            // Table
            let html = `<div class="table-wrapper"><table class="data-table"><thead><tr>
                <th>Post Name</th>
                <th>Level</th>
                <th>Ministry</th>
                <th>Location</th>
                <th>Days Left</th>
            </tr></thead><tbody>`;

            data.forEach(item => {
                html += `<tr>
                    <td><strong>${item.Post_Name || ''}</strong></td>
                    <td><span class="badge badge-level">${item.Level_Text || ''}</span></td>
                    <td>${item.Ministry || ''}</td>
                    <td>${item.Location_City || ''}, ${item.Location_State || ''}</td>
                    <td>${item.Days_Left || ''} days</td>
                </tr>`;
            });

            html += `</tbody></table></div>`;
            dataContainer.innerHTML = html;
            resultsCount.textContent = `${data.length} vacancies found`;
            lucide.createIcons();
        },
        error: function() {
            dataContainer.innerHTML = `<div style="padding:40px;text-align:center;color:#f43f5e">Could not load data.<br>Please refresh the page.</div>`;
        }
    });
});
