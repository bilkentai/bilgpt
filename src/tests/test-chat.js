/**
 * Test script for chat history handling
 * 
 * This script simulates a chat history and tests the ordering of messages
 * to ensure proper chronological order and correct OpenAI API formatting.
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

// Mock version of getBroResponse that simulates the API behavior
async function mockGetBroResponse(message, chatHistory = []) {
    // Check if user is asking about message history
    const queryLower = message.body.toLowerCase();
    const isAskingAboutHistory = [
        'last message', 'previous message', 'earlier', 
        'what did i say', 'what i wrote', 'what did you say',
        'ne yazdım', 'son mesaj', 'en son', 'önceki mesaj'
    ].some(phrase => queryLower.includes(phrase));
    
    if (isAskingAboutHistory) {
        console.log('User appears to be asking about message history');
        console.log(`Current query: "${message.body}"`);
        
        // Log some sample entries from the chat history for debugging
        console.log('Last few messages in history:');
        const lastFewMessages = chatHistory.slice(-3);
        lastFewMessages.forEach((msg, i) => {
            const index = chatHistory.length - lastFewMessages.length + i;
            const sender = msg.fromMe ? 'Bot' : (msg.senderName || 'User');
            console.log(`[${index}] ${sender}: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? '...' : ''}`);
        });
    }

    // Format chat history for proper OpenAI message format
    const historyMessages = chatHistory.map(msg => {
        // Determine the role (assistant or user)
        const role = msg.fromMe ? "assistant" : "user";
        
        // For user messages, use just the content without prefixing names
        const content = msg.body;
        
        // Log the message with sender info for debugging
        const senderName = msg.fromMe ? "Bot" : (msg.senderName || 'User');
        console.log(`Processing message from: ${senderName} (${role}): ${content.substring(0, 40)}${content.length > 40 ? '...' : ''}`);
        
        return { role, content };
    });

    // Debug log the chat history
    console.log(`\nPassing ${historyMessages.length} messages as context to AI (oldest first)`);
    historyMessages.forEach((msg, index) => {
        console.log(`[${index}] ${msg.role}: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
    });

    // System prompt (mockup of what would be loaded)
    const systemPrompt = "You are a helpful WhatsApp assistant. Respond concisely and accurately to user queries. You can see the conversation history for context. When asked about previous messages, refer directly to the message history provided to you.";

    // Add current message to console output for clarity
    console.log(`[${historyMessages.length}] user: ${message.body.substring(0, 50)}${message.body.length > 50 ? '...' : ''}`);
    
    // Create the messages array that would be sent to the API
    const messages = [
        { 
            role: "system", 
            content: systemPrompt
        },
        ...historyMessages,
        {
            role: "user",
            content: message.body
        }
    ];
    
    console.log(`\nWould send ${messages.length} total messages to OpenAI (including system prompt and current message)`);

    // Simulate a response based on the query
    if (isAskingAboutHistory) {
        // Find the last message from this user (excluding the current query)
        const userMessages = chatHistory.filter(msg => !msg.fromMe && msg.senderName === message.senderName);
        if (userMessages.length > 0) {
            const lastUserMessage = userMessages[userMessages.length - 1];
            return `Your last message was: "${lastUserMessage.body}"`;
        } else {
            return "I don't see any previous messages from you in this conversation.";
        }
    }

    return "I'd be happy to give you an example of AI! Autonomous vehicles use AI to navigate and make decisions in real-time. They process data from sensors like cameras and radar to identify objects, predict movements, and safely drive from one point to another.";
}

async function testChatHistory() {
    try {
        console.log('=== Chat History Test ===');
        
        // Create simulated chat history (in correct chronological order already)
        const chatHistory = [
            { 
                body: "Hello!", 
                fromMe: false,
                senderName: "User A"
            },
            { 
                body: "Hi there! How can I help you today?", 
                fromMe: true,
                senderName: "Bot"
            },
            { 
                body: "Can you tell me about AI?", 
                fromMe: false,
                senderName: "User A"
            },
            { 
                body: "AI stands for Artificial Intelligence. It's a field of computer science focused on creating systems that can perform tasks that would normally require human intelligence.", 
                fromMe: true,
                senderName: "Bot"
            }
        ];
        
        // TEST CASE 1: Regular question
        const currentMessage1 = {
            body: "Thanks for the explanation. Can you give me an example?",
            fromMe: false,
            senderName: "User A"
        };
        
        console.log('\n=== TEST CASE 1: Regular Question ===');
        console.log('\nHistory (chronological order, oldest first):');
        chatHistory.forEach((msg, idx) => {
            console.log(`[${idx}] ${msg.fromMe ? 'Bot' : msg.senderName}: ${msg.body.substring(0, 40)}${msg.body.length > 40 ? '...' : ''}`);
        });
        
        console.log('\nCurrent message:');
        console.log(`${currentMessage1.senderName}: ${currentMessage1.body}`);
        
        console.log('\n=== Generating Bot Response ===');
        const response1 = await mockGetBroResponse(currentMessage1, chatHistory);
        
        console.log('\nBot response:');
        console.log(response1);
        
        // TEST CASE 2: Question about previous message
        const currentMessage2 = {
            body: "What was my last message?",
            fromMe: false,
            senderName: "User A"
        };
        
        console.log('\n\n=== TEST CASE 2: Question About Previous Message ===');
        console.log('\nHistory (same as before):');
        chatHistory.forEach((msg, idx) => {
            console.log(`[${idx}] ${msg.fromMe ? 'Bot' : msg.senderName}: ${msg.body.substring(0, 40)}${msg.body.length > 40 ? '...' : ''}`);
        });
        
        console.log('\nCurrent message:');
        console.log(`${currentMessage2.senderName}: ${currentMessage2.body}`);
        
        console.log('\n=== Generating Bot Response ===');
        const response2 = await mockGetBroResponse(currentMessage2, chatHistory);
        
        console.log('\nBot response:');
        console.log(response2);
        
        console.log('\nTest completed!');
    } catch (error) {
        console.error('Error during test:', error);
    }
}

// Run the test
testChatHistory(); 