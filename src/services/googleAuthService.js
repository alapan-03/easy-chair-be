const { OAuth2Client } = require('google-auth-library');
const config = require('../config');
const logger = require('../config/logger');

/**
 * Google OAuth Service
 * Handles verification of Google ID tokens
 */
class GoogleAuthService {
    constructor() {
        this.client = new OAuth2Client(config.google?.clientId);
    }

    /**
     * Verify Google ID token and extract user information
     * @param {string} idToken - The ID token from Google Sign-In
     * @returns {Promise<Object>} User info from Google
     */
    async verifyIdToken(idToken) {
        try {
            const ticket = await this.client.verifyIdToken({
                idToken,
                audience: config.google?.clientId,
            });

            const payload = ticket.getPayload();

            if (!payload) {
                throw new Error('Invalid token payload');
            }

            // Verify email is verified
            if (!payload.email_verified) {
                throw new Error('Email not verified with Google');
            }

            return {
                googleId: payload.sub,
                email: payload.email.toLowerCase(),
                name: payload.name || payload.email.split('@')[0],
                picture: payload.picture,
                emailVerified: payload.email_verified,
            };
        } catch (error) {
            logger.error({ error: error.message }, 'Google token verification failed');
            throw new Error('Invalid Google token');
        }
    }
}

module.exports = new GoogleAuthService();
