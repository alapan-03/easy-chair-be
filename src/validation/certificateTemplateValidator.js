const ALLOWED_PLACEHOLDERS = [
  "userName",
  "conferenceName",
  "role",
  "issueDate",
  "certificateId",
  "verifyUrl",
];

const validateCertificateTemplate = ({ html, css }) => {
  const errors = [];

  if (!html?.trim()) errors.push("HTML template cannot be empty.");
  if (!css?.trim()) errors.push("CSS template cannot be empty.");

  if (/<script[\s>]/i.test(html || "")) {
    errors.push("Scripts are not allowed.");
  }

  if (/<iframe[\s>]/i.test(html || "")) errors.push("iframe is not allowed.");
  if (/<object[\s>]/i.test(html || "")) errors.push("object is not allowed.");
  if (/<embed[\s>]/i.test(html || "")) errors.push("embed is not allowed.");

  if (/\son[a-z]+\s*=/i.test(html || "")) {
    errors.push("Inline event handlers are not allowed.");
  }

  const matches = (html || "").match(/{{\s*[\w]+\s*}}/g) || [];
  const foundKeys = matches.map((m) => m.replace(/[{}]/g, "").trim());

  const unknown = foundKeys.filter((k) => !ALLOWED_PLACEHOLDERS.includes(k));
  if (unknown.length > 0) {
    errors.push(
      `Unknown placeholders found: ${unknown.map((x) => `{{${x}}}`).join(", ")}`
    );
  }

  return errors;
};

module.exports = { validateCertificateTemplate };
