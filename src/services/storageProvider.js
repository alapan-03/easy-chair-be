const { randomUUID } = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Local filesystem storage directory
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), 'uploads');

class StorageProvider {
  constructor() {
    // Ensure storage directory exists
    this._ensureStorageDir();
  }

  async _ensureStorageDir() {
    try {
      await fs.mkdir(STORAGE_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Store a file buffer and return the storage key
   * @param {Object} options
   * @param {string} options.orgId
   * @param {string} options.submissionId
   * @param {string} options.originalName
   * @param {Buffer} options.buffer - Optional: the file buffer to store
   * @returns {Promise<{storageKey: string}>}
   */
  async putObject({ orgId, submissionId, originalName, buffer }) {
    const storageKey = `org_${orgId}/submissions/${submissionId}/${randomUUID()}_${originalName}`;

    if (buffer) {
      const fullPath = path.join(STORAGE_DIR, storageKey);

      // Create directory structure
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Write file
      await fs.writeFile(fullPath, buffer);
    }

    return { storageKey };
  }

  /**
   * Retrieve file content as Buffer
   * @param {string} storageKey
   * @returns {Promise<Buffer>}
   */
  async getObject(storageKey) {
    const fullPath = path.join(STORAGE_DIR, storageKey);

    try {
      const buffer = await fs.readFile(fullPath);
      return buffer;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${storageKey}`);
      }
      throw error;
    }
  }

  /**
   * Generate a signed URL for download (stub for local storage)
   * @param {string} storageKey
   * @returns {Promise<{url: string, expiresInSeconds: number}>}
   */
  async getSignedUrl(storageKey) {
    // For local storage, return the file path or a placeholder URL
    return {
      url: `file://${path.join(STORAGE_DIR, storageKey)}`,
      expiresInSeconds: 3600
    };
  }

  /**
   * Delete a file
   * @param {string} storageKey
   */
  async deleteObject(storageKey) {
    const fullPath = path.join(STORAGE_DIR, storageKey);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // File might not exist
    }
  }

  /**
   * Check if file exists
   * @param {string} storageKey
   * @returns {Promise<boolean>}
   */
  async exists(storageKey) {
    const fullPath = path.join(STORAGE_DIR, storageKey);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new StorageProvider();
