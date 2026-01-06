const OpenAI = require('openai');
const AIProvider = require('./AIProvider');
const logger = require('../../config/logger');

class OpenAIProvider extends AIProvider {
  constructor() {
    super('openai');
    this.apiKey = process.env.OPENAI_API_KEY;
    
    if (!this.apiKey) {
      logger.warn('OPENAI_API_KEY not set - AI features will fail');
    }
    
    this.client = new OpenAI({
      apiKey: this.apiKey
    });
  }

  /**
   * Generate summary using OpenAI GPT models
   */
  async generateSummary(text, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    const model = options.model || 'gpt-4';
    const maxTokens = options.maxTokens || 500;

    try {
      // Truncate text if too long (GPT-4 has ~8k token limit for input)
      const maxInputLength = 15000; // ~4000 tokens roughly
      const truncatedText = text.length > maxInputLength 
        ? text.substring(0, maxInputLength) + '...[truncated]'
        : text;

      const completion = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an academic paper reviewer. Provide a concise summary of the paper highlighting key contributions, methodology, and findings.'
          },
          {
            role: 'user',
            content: `Summarize this academic paper:\n\n${truncatedText}`
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.3
      });

      const summaryText = completion.choices[0]?.message?.content || '';
      const wordCount = summaryText.split(/\s+/).length;

      return {
        text: summaryText,
        wordCount,
        providerMeta: {
          provider: 'openai',
          model,
          usage: completion.usage
        }
      };
    } catch (error) {
      logger.error({ error: error.message }, 'OpenAI summary generation failed');
      
      // Provide more helpful error messages
      if (error.message?.includes('Incorrect API key') || error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please verify OPENAI_API_KEY in your .env file.');
      } else if (error.code === 'rate_limit_exceeded') {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI quota exceeded. Please check your billing at https://platform.openai.com/account/billing');
      }
      
      throw new Error(`OpenAI summary failed: ${error.message}`);
    }
  }

  /**
   * Compute similarity using OpenAI embeddings
   * Simplified implementation - compares against corpus using cosine similarity
   */
  async computeSimilarity(text, corpus, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    const model = options.model || 'text-embedding-3-small';
    const thresholdPct = options.thresholdPct || 20;
    const excludeReferences = options.excludeReferences !== false;

    try {
      // Preprocess: remove references section if enabled
      let processedText = text;
      if (excludeReferences) {
        processedText = this._removeReferencesSection(text);
      }

      // Truncate for embedding (max ~8k tokens)
      const maxLength = 8000;
      processedText = processedText.substring(0, maxLength);

      // Get embedding for current document
      const embeddingResponse = await this.client.embeddings.create({
        model,
        input: processedText
      });

      const currentEmbedding = embeddingResponse.data[0].embedding;

      // If corpus is empty, return low similarity
      if (!corpus || corpus.length === 0) {
        return {
          scorePct: 0,
          thresholdPct,
          flagged: false,
          excludeReferencesUsed: excludeReferences
        };
      }

      // Get embeddings for corpus (batch process in real implementation)
      // For now, we'll do a simplified comparison with first few corpus items
      const corpusSample = corpus.slice(0, 5); // Limit to avoid rate limits
      const corpusEmbeddings = [];

      for (const corpusText of corpusSample) {
        const corpusEmbedResponse = await this.client.embeddings.create({
          model,
          input: corpusText.substring(0, maxLength)
        });
        corpusEmbeddings.push(corpusEmbedResponse.data[0].embedding);
      }

      // Compute cosine similarity with each corpus item
      const similarities = corpusEmbeddings.map(corpusEmbed => 
        this._cosineSimilarity(currentEmbedding, corpusEmbed)
      );

      // Take the maximum similarity
      const maxSimilarity = Math.max(...similarities, 0);
      const scorePct = Math.round(maxSimilarity * 100);

      return {
        scorePct,
        thresholdPct,
        flagged: scorePct >= thresholdPct,
        excludeReferencesUsed: excludeReferences
      };
    } catch (error) {
      logger.error({ error: error.message }, 'OpenAI similarity computation failed');
      
      // Provide helpful error messages
      if (error.message?.includes('Incorrect API key') || error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please verify OPENAI_API_KEY in your .env file.');
      } else if (error.code === 'rate_limit_exceeded') {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }
      
      // Fallback to simple text comparison if embeddings fail
      logger.warn('Falling back to simple similarity calculation');
      return this._fallbackSimilarity(text, corpus, thresholdPct, excludeReferences);
    }
  }

  /**
   * Remove references section heuristically
   */
  _removeReferencesSection(text) {
    // Find common reference section headers
    const refPatterns = [
      /\n\s*references\s*\n/i,
      /\n\s*bibliography\s*\n/i,
      /\n\s*works cited\s*\n/i
    ];

    for (const pattern of refPatterns) {
      const match = text.search(pattern);
      if (match !== -1) {
        return text.substring(0, match);
      }
    }

    return text;
  }

  /**
   * Compute cosine similarity between two vectors
   */
  _cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Fallback similarity using simple text comparison
   */
  _fallbackSimilarity(text, corpus, thresholdPct, excludeReferences) {
    logger.warn('Using fallback similarity calculation');
    
    // Very simple n-gram overlap approach
    const ngramSize = 5;
    const currentNgrams = this._extractNgrams(text.toLowerCase(), ngramSize);
    
    let maxOverlap = 0;
    for (const corpusText of corpus) {
      const corpusNgrams = this._extractNgrams(corpusText.toLowerCase(), ngramSize);
      const overlap = this._computeOverlap(currentNgrams, corpusNgrams);
      maxOverlap = Math.max(maxOverlap, overlap);
    }

    const scorePct = Math.round(maxOverlap * 100);

    return {
      scorePct,
      thresholdPct,
      flagged: scorePct >= thresholdPct,
      excludeReferencesUsed: excludeReferences
    };
  }

  _extractNgrams(text, n) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const ngrams = new Set();
    
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.add(words.slice(i, i + n).join(' '));
    }
    
    return ngrams;
  }

  _computeOverlap(setA, setB) {
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) {
        intersection++;
      }
    }
    
    return setA.size > 0 ? intersection / setA.size : 0;
  }
}

module.exports = OpenAIProvider;
