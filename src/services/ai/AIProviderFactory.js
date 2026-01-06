const OpenAIProvider = require('./OpenAIProvider');
const logger = require('../../config/logger');

/**
 * Factory to get the appropriate AI provider
 */
class AIProviderFactory {
  static getProvider(providerName = 'openai') {
    switch (providerName.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider();
      default:
        logger.warn({ providerName }, 'Unknown AI provider, defaulting to OpenAI');
        return new OpenAIProvider();
    }
  }
}

module.exports = AIProviderFactory;
