import axios from 'axios';

/**
 * Gemini Chat Client
 * Provides the same interface as OnDemandClient but uses Google Gemini API
 */
class GeminiClient {
    /**
     * Initialize the Gemini Chat Client
     * @param {string} apiKey - Your Google Gemini API Key
     */
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.model = 'gemini-2.0-flash'; // Using latest stable Gemini 2.0 Flash model
        this.sessions = new Map(); // Store session data
    }

    /**
     * Helper to handle API requests
     */
    async _request(method, endpoint, data = null, params = null) {
        try {
            const config = {
                method: method,
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                params: params || {},
                timeout: 30000
            };

            // Add API key to params
            config.params.key = this.apiKey;

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(`Error [${method} ${endpoint}]:`, error.response ? error.response.data : error.message);
            throw error;
        }
    }

    // ==========================================
    // Session Management
    // ==========================================

    /**
     * Create a new Chat Session
     * @param {string} externalUserId - Unique ID for the user
     * @param {Array} pluginIds - Not used in Gemini, kept for compatibility
     */
    async createSession(externalUserId, pluginIds = []) {
        const sessionId = `session_${externalUserId}_${Date.now()}`;
        
        // Store session data locally
        this.sessions.set(sessionId, {
            id: sessionId,
            userId: externalUserId,
            createdAt: new Date(),
            messages: [],
            pluginIds: pluginIds
        });

        return {
            data: {
                id: sessionId,
                userId: externalUserId,
                createdAt: new Date()
            }
        };
    }

    /**
     * Get details of a specific Chat Session
     * @param {string} sessionId 
     */
    async getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        return {
            data: session
        };
    }

    /**
     * Get all Chat Sessions
     * @param {number} limit - Number of sessions to fetch (default 10)
     * @param {string} sort - 'asc' or 'desc'
     */
    async getAllSessions(limit = 10, sort = 'asc') {
        const sessions = Array.from(this.sessions.values());
        const sorted = sort === 'desc' 
            ? sessions.sort((a, b) => b.createdAt - a.createdAt)
            : sessions.sort((a, b) => a.createdAt - b.createdAt);
        
        return {
            data: sorted.slice(0, limit)
        };
    }

    // ==========================================
    // Chat Interaction
    // ==========================================

    /**
     * Submit a Query to the Gemini API
     * @param {string} sessionId - The Session ID
     * @param {string} query - The user's question
     * @param {string} endpointId - Not used in Gemini, kept for compatibility
     * @param {string} responseMode - Not used in Gemini, kept for compatibility
     */
    async submitQuery(sessionId, query, endpointId = "not-used", responseMode = "sync") {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Build conversation history for context
        const messages = session.messages.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // Add current query
        messages.push({
            role: 'user',
            parts: [{ text: query }]
        });

        try {
            // Call Gemini API
            const payload = {
                contents: messages,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    }
                ]
            };

            const response = await this._request(
                'POST',
                `/${this.model}:generateContent`,
                payload
            );

            // Extract the text response
            let answer = 'I apologize, but I could not generate a response.';
            
            if (response.candidates && response.candidates[0]) {
                const candidate = response.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
                    answer = candidate.content.parts[0].text;
                }
            }

            const responseId = `msg_${Date.now()}`;

            // Store messages in session
            session.messages.push({ type: 'user', content: query });
            session.messages.push({ type: 'bot', content: answer });

            // Return response in OnDemand format for compatibility
            return {
                data: {
                    id: responseId,
                    answer: answer,
                    query: query,
                    sessionId: sessionId
                }
            };
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw error;
        }
    }

    // ==========================================
    // Message History
    // ==========================================

    /**
     * Get a specific Chat Message
     * @param {string} sessionId 
     * @param {string} messageId 
     */
    async getMessage(sessionId, messageId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const message = session.messages.find(m => m.id === messageId);
        if (!message) {
            throw new Error(`Message ${messageId} not found`);
        }

        return {
            data: message
        };
    }

    /**
     * Get all messages for a session
     * @param {string} sessionId 
     * @param {number} limit 
     * @param {string} cursor - Not used in Gemini, kept for compatibility
     */
    async getAllMessages(sessionId, limit = 10, cursor = null) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const messages = session.messages.slice(-limit);

        return {
            data: messages
        };
    }
}

export default GeminiClient;
