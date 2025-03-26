/**
 * Test script for message ordering functionality
 * 
 * This script simulates a scenario where a user asks about message order
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

// Mock version of getBroResponse
async function mockGetBroResponse(message, chatHistory = []) {
    // Check if user is asking about message order
    const queryLower = message.body.toLowerCase();
    const isAskingAboutOrder = [
        'order', 'sequence', 'chronological', 'chronologically', 'order of messages',
        'sıra', 'sırada', 'kronolojik', 'son mesajları', 'attığım sırada'
    ].some(phrase => queryLower.includes(phrase));
    
    if (isAskingAboutOrder) {
        console.log('User appears to be asking about message order');
        console.log(`Current query: "${message.body}"`);
        
        // List messages in the chat history
        console.log('\nMessages in the chat history:');
        chatHistory.forEach((msg, idx) => {
            const sender = msg.fromMe ? 'Bot' : (msg.senderName || 'User');
            console.log(`[${idx}] ${sender}: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? '...' : ''}`);
        });
    }

    // Format chat history for proper OpenAI message format
    const historyMessages = chatHistory.map(msg => {
        const role = msg.fromMe ? "assistant" : "user";
        const content = msg.body;
        return { role, content };
    });

    // Create special system guidance for ordering
    const orderGuidance = {
        role: "system",
        content: "The user is asking about message ordering. When listing messages, ALWAYS number them with oldest first (1) and newest last. This means message #1 is the oldest message in the history, message #2 is the second oldest, and so on. NEVER reverse this order."
    };

    // System prompt
    const systemPrompt = "You are a helpful WhatsApp assistant. When asked about message ordering, always list messages in chronological order with oldest first (1) and newest last.";

    // Create the messages array
    const messages = [
        { role: "system", content: systemPrompt },
        ...historyMessages
    ];
    
    // Add order guidance if relevant
    if (isAskingAboutOrder) {
        messages.push(orderGuidance);
    }
    
    // Add current message
    messages.push({
        role: "user",
        content: message.body
    });
    
    console.log(`\nWould send ${messages.length} total messages to OpenAI`);

    // Generate mock response for order query
    if (isAskingAboutOrder) {
        // Simulate the response showing messages in order
        let response = `Here are the messages in chronological order (oldest first):\n\n`;
        
        // Filter to get only user messages
        const userMessages = chatHistory.filter(msg => !msg.fromMe);
        
        userMessages.forEach((msg, idx) => {
            response += `${idx+1}. "${msg.body}"\n`;
        });
        
        response += `\nThese messages are in chronological order, with message #1 being the oldest and message #${userMessages.length} being the most recent.`;
        
        return response;
    }

    return "I'd be happy to help you with your question!";
}

async function testMessageOrder() {
    try {
        console.log('=== Message Order Test ===');
        
        // Create simulated chat history with numbered messages for clear testing
        const chatHistory = [
            { 
                body: "1", 
                fromMe: false,
                senderName: "User A"
            },
            { 
                body: "Hello! How can I help?", 
                fromMe: true,
                senderName: "Bot"
            },
            { 
                body: "2", 
                fromMe: false,
                senderName: "User A"
            },
            { 
                body: "I see you're sending numbered messages.", 
                fromMe: true,
                senderName: "Bot"
            },
            { 
                body: "3", 
                fromMe: false,
                senderName: "User A"
            },
            { 
                body: "4", 
                fromMe: false,
                senderName: "User A"
            },
            { 
                body: "That's interesting!", 
                fromMe: true,
                senderName: "Bot"
            },
            { 
                body: "5", 
                fromMe: false,
                senderName: "User A"
            },
            { 
                body: "6", 
                fromMe: false,
                senderName: "User A"
            },
            { 
                body: "I see you're continuing the sequence.", 
                fromMe: true,
                senderName: "Bot"
            },
            { 
                body: "7", 
                fromMe: false,
                senderName: "User A"
            },
            { 
                body: "8", 
                fromMe: false,
                senderName: "User A"
            }
        ];
        
        // Simulate a message asking about order
        const orderQuestion = {
            body: "@BilGPT son mesajları kronolojik sırada sana attığım sırada yazar mısın",
            fromMe: false,
            senderName: "User A"
        };
        
        console.log('\nSimulated chat history (chronological order, oldest first):');
        chatHistory.forEach((msg, idx) => {
            console.log(`[${idx}] ${msg.fromMe ? 'Bot' : msg.senderName}: ${msg.body}`);
        });
        
        console.log('\nOrder question:');
        console.log(`${orderQuestion.senderName}: ${orderQuestion.body}`);
        
        console.log('\n=== Generating Bot Response ===');
        const response = await mockGetBroResponse(orderQuestion, chatHistory);
        
        console.log('\nBot response:');
        console.log(response);
        
        console.log('\nTest completed!');
    } catch (error) {
        console.error('Error during test:', error);
    }
}

// Run the test
testMessageOrder(); 