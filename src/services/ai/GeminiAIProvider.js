const AIProvider = require('./AIProvider');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../config/logger');

const API_KEY = process.env.GEMINI_API_KEY;

class GeminiAIProvider extends AIProvider {
  constructor() {
    super('gemini');

    if (!API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    this.genAI = new GoogleGenerativeAI(API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
    });
  }

  /**
   * Generate a summary from extracted text
   * @param {string} text
   * @param {Object} options
   * @returns {Promise<{text: string, wordCount: number, providerMeta: Object}>}
   */
  async generateSummary(text, options = {}) {
    try {
      const {
        maxWords = 300,
        style = 'academic',
      } = options;

      const prompt = `
Summarize the following document in ${maxWords} words.
Style: ${style}.
Ensure clarity, coherence, and originality.

Document:
${text}
      `.trim();

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const summaryText = response.text();

      const wordCount = summaryText.split(/\s+/).length;

      return {
        text: summaryText,
        wordCount,
        providerMeta: {
          model: 'gemini-2.5-pro',
        },
      };
    } catch (error) {
      logger.error('Gemini generateSummary failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Compute similarity score against corpus (LLM-assisted heuristic)
   * @param {string} text
   * @param {Array<string>} corpus
   * @param {Object} options
   * @returns {Promise<{scorePct: number, thresholdPct: number, flagged: boolean, excludeReferencesUsed: boolean}>}
   */
  async computeSimilarity(text, corpus, options = {}) {
    try {
      const {
        thresholdPct = 25,
        excludeReferences = false,
      } = options;

      const corpusText = corpus.slice(0, 5).join('\n\n---\n\n'); // limit context size

      const prompt = `
Analyze the similarity between the PRIMARY document and the REFERENCE documents.
Return ONLY a number between 0 and 100 representing similarity percentage.

PRIMARY DOCUMENT:
${text}

REFERENCE DOCUMENTS:
${corpusText}
      `.trim();

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const raw = response.text();

      const scorePct = Math.min(
        100,
        Math.max(0, parseFloat(raw.match(/\d+(\.\d+)?/)?.[0] || 0))
      );

      return {
        scorePct,
        thresholdPct,
        flagged: scorePct >= thresholdPct,
        excludeReferencesUsed: excludeReferences,
      };
    } catch (error) {
      logger.error('Gemini computeSimilarity failed', {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = GeminiAIProvider;
