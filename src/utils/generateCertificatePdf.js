const puppeteer = require("puppeteer");

const buildPreviewDoc = ({ html, css }) => {
  const styleTag = `<style>${css || ""}</style>`;

  if (/<head[\s>]/i.test(html || "")) {
    return (html || "").replace(/<\/head>/i, `${styleTag}</head>`);
  }

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    ${styleTag}
  </head>
  <body>
    ${html || ""}
  </body>
</html>`;
};

const fillPlaceholders = (html, data) => {
  let out = html || "";
  Object.entries(data).forEach(([key, value]) => {
    out = out.replaceAll(`{{${key}}}`, String(value ?? ""));
  });
  return out;
};

const generateCertificatePdfBuffer = async ({ html, css, data }) => {
  const filledHtml = fillPlaceholders(html, data);
  const finalDoc = buildPreviewDoc({ html: filledHtml, css });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(finalDoc, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
};

module.exports = { generateCertificatePdfBuffer };
