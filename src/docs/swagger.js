const path = require("path");
const swaggerJSDoc = require("swagger-jsdoc");

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Conference Management API",
    version: "1.0.0",
    description: "API documentation for the Conference platform",
  },

  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development",
    },
    {
      url: "https://easy-chair-be.onrender.com",
      description: "Production (Render)",
    },
  ],

  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT Authorization header. Format: Bearer <token>",
      },
      OrgIdHeader: {
        type: "apiKey",
        in: "header",
        name: "x-org-id",
        description: "Organization ID for multi-tenant context",
      },
    },
  },

  /**
   * 🔐 Apply BOTH globally
   * Swagger UI will show both fields in "Authorize"
   */
  security: [{ BearerAuth: [] }, { OrgIdHeader: [] }],

  tags: [
    { name: "Auth", description: "Authentication APIs" },
    { name: "Organizations", description: "Organization management" },
    { name: "Conferences", description: "Conference management" },
    { name: "Tracks", description: "Conference tracks" },
    { name: "Submissions", description: "Author submissions" },
    { name: "Admin Submissions", description: "Admin submission actions" },
    { name: "AI", description: "AI analysis & reports" },
  ],
};

const options = {
  swaggerDefinition,
  apis: [
    path.join(__dirname, "../routes/*.js"),
    path.join(__dirname, "../controllers/*.js"),
    path.join(__dirname, "./schemas.js"),
  ],
};

module.exports = swaggerJSDoc(options);
