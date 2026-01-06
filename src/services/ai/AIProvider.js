const config = require('../config');
const logger = require('../config/logger');

/**
 * Base interface for AI providers
 * Implementations must provide methods for summarization and similarity analysis
 */
class AIProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Generate a summary from extracted text
   * @param {string} text - The extracted text content
   * @param {Object} options - Provider-specific options (model, maxTokens, etc.)
   * @returns {Promise<{text: string, wordCount: number, providerMeta: Object}>}
   */
  async generateSummary(text, options = {}) {
    throw new Error('generateSummary must be implemented by provider');
  }

  /**
   * Compute similarity score against corpus
   * @param {string} text - The text to check
   * @param {Array<string>} corpus - Reference texts from other submissions
   * @param {Object} options - Provider-specific options (threshold, excludeReferences, etc.)
   * @returns {Promise<{scorePct: number, thresholdPct: number, flagged: boolean, excludeReferencesUsed: boolean}>}
   */
  async computeSimilarity(text, corpus, options = {}) {
    throw new Error('computeSimilarity must be implemented by provider');
  }

  /**
   * Run format checks on the document
   * @param {string} text - The extracted text content
   * @param {Object} metadata - Document metadata (title, abstract, etc.)
   * @returns {Promise<{score: number, checks: Array<{key: string, pass: boolean, notes: string}>}>}
   */
  async runFormatChecks(text, metadata) {
    // Default implementation - can be overridden
    const checks = [];
    let passedCount = 0;

    // Check 1: Minimum word count
    const wordCount = text.split(/\s+/).length;
    const minWords = 2000;
    const wordCheck = wordCount >= minWords;
    checks.push({
      key: 'minimum_word_count',
      pass: wordCheck,
      notes: `Document has ${wordCount} words (minimum: ${minWords})`
    });
    if (wordCheck) passedCount++;

    // Check 2: Has abstract
    const hasAbstract = metadata?.abstract && metadata.abstract.length > 50;
    checks.push({
      key: 'has_abstract',
      pass: hasAbstract,
      notes: hasAbstract ? 'Abstract present' : 'Abstract missing or too short'
    });
    if (hasAbstract) passedCount++;

    // Check 3: Has title
    const hasTitle = metadata?.title && metadata.title.length > 5;
    checks.push({
      key: 'has_title',
      pass: hasTitle,
      notes: hasTitle ? 'Title present' : 'Title missing or too short'
    });
    if (hasTitle) passedCount++;

    // Check 4: Has references section (heuristic)
    const hasReferences = /references|bibliography/i.test(text.toLowerCase());
    checks.push({
      key: 'has_references',
      pass: hasReferences,
      notes: hasReferences ? 'References section detected' : 'No references section found'
    });
    if (hasReferences) passedCount++;

    const score = Math.round((passedCount / checks.length) * 100);

    return { score, checks };
  }
}

module.exports = AIProvider;
