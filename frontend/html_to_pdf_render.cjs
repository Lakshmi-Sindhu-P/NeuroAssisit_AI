
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log("Launching Browser...");
    const browser = await puppeteer.launch({
        headless: "new"
    });
    const page = await browser.newPage();

    // Path to the HTML file
    // Located at root/reports/...
    // Current dir is root/frontend
    // So we go up one level to root, then into reports
    const filePath = path.resolve(__dirname, '../reports/NeuroAssist_Updated_SRD.html');

    if (!fs.existsSync(filePath)) {
        console.error("File not found:", filePath);
        process.exit(1);
    }

    const fileUrl = 'file://' + filePath;
    console.log(`Processing: ${fileUrl}`);

    // Wait for network idle to ensure Mermaid scripts load and execute
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });

    // Inject print styles
    await page.addStyleTag({
        content: `
        @media print {
            .sidebar { display: none !important; }
            .main { 
                margin: 0 !important; 
                padding: 0 !important; 
                width: 100% !important; 
                max-width: none !important;
                overflow: visible !important;
            }
            body { 
                background: white; 
                margin: 0;
            }
            .mermaid {
                break-inside: avoid;
            }
            h1, h2, h3 {
                break-after: avoid;
            }
            table {
                break-inside: auto;
            }
            tr {
                break-inside: avoid;
                break-after: auto;
            }
        }
    `});

    // Wait a brief moment for any final render
    await new Promise(r => setTimeout(r, 2000));

    const outputPath = path.resolve(__dirname, '../reports/NeuroAssist_Updated_SRD_Print.pdf');

    console.log("Generating PDF...");
    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
            top: '20px',
            bottom: '20px',
            left: '20px',
            right: '20px'
        }
    });

    console.log(`PDF Generated at: ${outputPath}`);
    await browser.close();
})();
