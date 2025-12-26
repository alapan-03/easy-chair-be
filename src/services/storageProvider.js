const { randomUUID } = require('crypto');

class StorageProvider {
  async putObject({ orgId, submissionId, originalName }) {
    const storageKey = `org_${orgId}/submissions/${submissionId}/${randomUUID()}_${originalName}`;
    // Stub: in a real provider, upload happens here.
    return { storageKey };
  }

  async getSignedUrl(storageKey) {
    // Stub signed URL for download.
    return { url: `https://stub-storage.local/${storageKey}`, expiresInSeconds: 3600 };
  }
}

module.exports = new StorageProvider();
