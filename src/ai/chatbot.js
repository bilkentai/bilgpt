import OpenAI from "openai";
import { promises as fs } from 'fs';
import path from 'path';
import { OPENAI_API_KEY, promptsPath } from '../config/env.js';

// Initialize OpenAI with API key
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

// Function to read prompt from markdown file
async function loadPrompt() {
    try {
        const promptPath = path.join(promptsPath, 'ai_bot_prompt.md');
        const promptContent = await fs.readFile(promptPath, 'utf-8');
        // Return the full prompt content, preserving all formatting and sections
        return promptContent.trim();
    } catch (error) {
        console.error('Error loading prompt:', error);
        throw error;
    }
}

/**
 * Creates a formatted chat message history for the AI
 * @param {object} message - Current message
 * @param {Array} messageHistory - Array of previous messages
 * @returns {Array} Formatted message history for the AI
 */
async function formatChatHistory(message, messageHistory) {
    const history = [];
    
    // Load system prompt from file
    const systemPrompt = await loadPrompt();
    
    // Add system message
    history.push({
        role: "system",
        content: systemPrompt
    });
    
    // Add message history (up to 10 messages)
    for (const msg of messageHistory.slice(-10)) {
        if (msg.fromMe) {
            history.push({
                role: "assistant",
                content: msg.body
            });
        } else {
            history.push({
                role: "user",
                content: `${msg.senderName || 'User'}: ${msg.body}`
            });
        }
    }
    
    // Add current message
    history.push({
        role: "user",
        content: `${message.senderName || 'User'}: ${message.body}`
    });
    
    return history;
}

/**
 * Gets a response from the AI for a given message
 * @param {object} message - Message object from WhatsApp
 * @param {Array} messageHistory - Array of previous messages
 * @returns {Promise<string>} AI response
 */
export async function getBroResponse(message, messageHistory) {
    try {
        console.log('Generating AI response...');
        
        // Format the chat history
        const formattedHistory = await formatChatHistory(message, messageHistory);
        
        // Log the conversation summary
        console.log(`Chat context: ${formattedHistory.length} messages`);
        
        // Call the OpenAI API
        const response = await openai.chat.completions.create({
            model: "gpt-4.5-preview",
            messages: formattedHistory,
            temperature: 0.7,
            max_tokens: 500,
            top_p: 1,
            frequency_penalty: 0.2,
            presence_penalty: 0.5
        });
        
        // Get the response message
        const botResponse = response.choices[0].message.content.trim();
        console.log(`Generated response (${botResponse.length} chars)`);
        
        return botResponse;
    } catch (error) {
        console.error('Error generating AI response:', error);
        return "Sorry, I'm having trouble generating a response right now. Please try again later.";
    }
} 