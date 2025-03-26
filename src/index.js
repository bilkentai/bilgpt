/**
 * WhatsApp Bot - Main Application Entry Point
 * 
 * Integrates all modules together to create a WhatsApp bot that can:
 * - Analyze URLs with AI criticism
 * - Respond to messages with AI
 * - Handle admin commands
 * - Manage group monitoring
 */

// Import config
import { 
    ADMIN_NUMBER, 
    authPath, 
    logConfig
} from './config/env.js';

// Import modules
import {
    createClient,
    setupClientEvents,
    initializeClient,
    registerShutdownHandlers
} from './utils/clientUtils.js';

import {
    isAdmin,
    handleAdminCommand,
    findAdminChat
} from './handlers/adminHandler.js';

import {
    extractUrl,
    handleUrlMessage,
    handleBotConversation,
    isMessageForBot
} from './handlers/messageHandler.js';

import { loadActiveGroups } from './services/groupStorage.js';
import { startHealthServer, stopHealthServer } from './utils/healthCheck.js';

// Application state
const appState = {
    version: '1.0.0',
    startTime: new Date().toISOString(),
    activeGroupIds: [],
    isReady: false
};

// Log environment configuration
logConfig();

// State variables
let activeGroupIds = [];
let adminChatId = '';

// Create and initialize WhatsApp client
const client = createClient(authPath);
setupClientEvents(client);

// Start health check server
const healthServer = startHealthServer(3000, { appState });

// Main ready event handler
client.on('ready', async () => {
    console.log('Client is ready! Setting up group monitoring...');
    appState.isReady = true;
    
    try {
        // Load active groups from storage
        activeGroupIds = await loadActiveGroups();
        appState.activeGroupIds = activeGroupIds;
        console.log(`Loaded ${activeGroupIds.length} active groups from persistent storage`);
        
        const chats = await client.getChats();
        console.log(`Total chats found: ${chats.length}`);
        
        // If no active groups were loaded from storage, try to find the default AGI group
        if (activeGroupIds.length === 0) {
            const agiChat = chats.find(chat => chat.name === "AGI");
            
            if (agiChat) {
                activeGroupIds.push(agiChat.id._serialized);
                appState.activeGroupIds = activeGroupIds;
                console.log(`Now monitoring "AGI" group (ID: ${agiChat.id._serialized})`);
            }
        }
        
        // Show details of loaded active groups
        if (activeGroupIds.length > 0) {
            console.log('Currently monitoring these groups:');
            for (const groupId of activeGroupIds) {
                try {
                    const chat = await client.getChatById(groupId);
                    console.log(`- ${chat.name} (${groupId})`);
                } catch (error) {
                    console.log(`- Unknown group (${groupId}) - Error: ${error.message}`);
                }
            }
        } else {
            console.log('No active groups configured. Use /setactive to add groups.');
        }

        // Handle admin setup if ADMIN_NUMBER is defined
        if (ADMIN_NUMBER) {
            console.log(`Looking for admin with number: ${ADMIN_NUMBER}`);
            
            const adminChat = await findAdminChat(client, ADMIN_NUMBER);
            
            if (adminChat) {
                adminChatId = adminChat.id._serialized;
                console.log(`Found admin chat with ID: ${adminChatId}`);
                console.log(`Admin name: ${adminChat.name || 'Unknown'}`);
                
                // Send a startup message to admin
                await client.sendMessage(adminChatId, 
                    "WhatsApp Bot is now online! 🤖\n\n" +
                    "You can use the following commands:\n" +
                    "/list - List all chats\n" +
                    "/debug - Show detailed debug info\n" +
                    "/setactive <id> - Set active group\n" +
                    "/removeactive <id> - Remove group from active list\n" +
                    "/active - Show currently active groups"
                );
                
                // Notify admin about active groups
                if (activeGroupIds.length > 0) {
                    await client.sendMessage(adminChatId, 
                        `${activeGroupIds.length} active group(s) loaded from storage. Use /active to see details.`
                    );
                }
            } else {
                console.log(`Admin number ${ADMIN_NUMBER.substring(0, 3)}... found in .env file but no chat exists yet.`);
                console.log('Please send a message to the bot from your WhatsApp with this number to enable admin controls.');
                console.log('If the bot still doesn\'t recognize you, send the /debug command from your phone to force recognition.');
            }
        }
    } catch (error) {
        console.error('Error setting up group monitoring:', error);
        appState.lastError = error.message;
    }
});

// Message event handler
client.on('message', async (message) => {
    try {
        console.log(`\nMessage received from: ${message.from}`);
        console.log(`Message content: ${message.body.substring(0, 30)}${message.body.length > 30 ? '...' : ''}`);
        
        // Check if message is from admin
        const msgIsFromAdmin = isAdmin(message, adminChatId, ADMIN_NUMBER);
        
        if (msgIsFromAdmin) {
            console.log('Message identified as from admin');
            
            // Set admin chat ID if not already set
            if (!adminChatId) {
                adminChatId = message.from;
                console.log(`Set admin chat ID to: ${adminChatId}`);
                await message.reply("You've been recognized as the admin! 🤖\n\nYou can use the following commands:\n/list - List all chats\n/debug - Show detailed debug info\n/setactive <id> - Set active group\n/removeactive <id> - Remove group from active list\n/active - Show currently active groups");
            }
            
            // Handle admin commands
            if (message.body.startsWith('/')) {
                console.log(`Processing admin command: ${message.body}`);
                const result = await handleAdminCommand(client, message, activeGroupIds, adminChatId);
                
                // Update state variables
                if (result) {
                    activeGroupIds = result.activeGroupIds;
                    adminChatId = result.adminChatId;
                    appState.activeGroupIds = activeGroupIds;
                }
                
                return; // Stop processing after handling admin command
            }
        } else if (message.body.startsWith('/debug') && !adminChatId) {
            // Allow debug command for first-time admin recognition
            console.log('Permissive first-time admin recognition for /debug command');
            adminChatId = message.from;
            await message.reply("You've been recognized as admin through the debug command! 🤖\nThis is a one-time permissive recognition to help with setup.");
            const result = await handleAdminCommand(client, message, activeGroupIds, adminChatId);
            
            if (result) {
                activeGroupIds = result.activeGroupIds;
                adminChatId = result.adminChatId;
                appState.activeGroupIds = activeGroupIds;
            }
            
            return;
        }
        
        // Check if the message is from an active group
        if (activeGroupIds.includes(message.from)) {
            // Check for a URL in the message
            const url = extractUrl(message);
            
            if (url) {
                // Handle URL with AI critic
                await handleUrlMessage(message, url);
            } else {
                // Check if the message is a reply to the bot or mentions the bot
                const isBotConversation = await isMessageForBot(message, client);
                
                if (isBotConversation) {
                    await handleBotConversation(message);
                }
            }
        }
    } catch (error) {
        console.error('Error processing message:', error);
        appState.lastError = error.message;
    }
});

// Handle shutdown for the health server too
const originalShutdownHandlers = registerShutdownHandlers(client, authPath);
process.on('SIGINT', async () => {
    console.log('Shutting down health check server...');
    stopHealthServer();
});
process.on('SIGTERM', async () => {
    console.log('Shutting down health check server...');
    stopHealthServer();
});

// Initialize the client
(async () => {
    try {
        // Initialize the client
        const success = await initializeClient(client);
        if (!success) {
            console.error('Failed to initialize client after retries. Exiting...');
            process.exit(1);
        }
    } catch (error) {
        console.error('Fatal error during startup:', error);
        appState.lastError = error.message;
        process.exit(1);
    }
})(); 