/**
 * Admin Management Module
 * 
 * Handles all administrative operations including:
 * - Command processing
 * - Admin recognition
 * - Debug functionality
 */

import { 
    setActiveGroup, 
    removeActiveGroup, 
    showActiveGroups, 
    listAllChats 
} from '../services/groupManager.js';

import { debugChats } from '../services/debugService.js';

// Main command handler for admin commands
export async function handleAdminCommand(client, message, activeGroupIds, adminChatId) {
    // Get the first word as the command
    const command = message.body.split(' ')[0].toLowerCase();
    let result = { adminChatId, activeGroupIds };
    
    // Special handling for setactive and removeactive to capture the full ID
    if (command === '/setactive' || command === '/removeactive') {
        console.log(`Processing ${command} command with full message: "${message.body}"`);
        
        // Extract everything after the command as the group ID
        const groupId = message.body.substring(command.length).trim();
        
        if (!groupId) {
            await message.reply(`Please provide a group ID: ${command} <id>`);
            return result;
        }
        
        console.log(`Extracted group ID: "${groupId}"`);
        
        try {
            if (command === '/setactive') {
                result.activeGroupIds = await setActiveGroup(client, message, groupId, activeGroupIds);
            } else {
                result.activeGroupIds = await removeActiveGroup(client, message, groupId, activeGroupIds);
            }
            return result;
        } catch (error) {
            console.error(`Error handling ${command}:`, error);
            await message.reply(`Error executing command: ${error.message}`);
            return result;
        }
    }
    
    // Standard command processing for other commands
    const args = message.body.split(' ').slice(1);
    console.log(`Processing admin command: ${command} with args:`, args);
    
    try {
        switch (command) {
            case '/list':
                await listAllChats(client, message, activeGroupIds);
                break;
                
            case '/debug':
                await debugChats(client, message, adminChatId, activeGroupIds);
                break;
                
            case '/reset':
                // Reset admin chat ID for troubleshooting
                result.adminChatId = '';
                await message.reply('Admin chat ID has been reset. Any user who sends a /debug command will now be recognized as admin for first-time setup. USE THIS CAREFULLY.');
                break;
                
            case '/active':
                await showActiveGroups(client, message, activeGroupIds);
                break;
                
            default:
                await message.reply('Unknown command. Available commands:\n/list - List all chats\n/debug - Debug chat information\n/setactive <id> - Set active group\n/removeactive <id> - Remove group from active list\n/active - Show currently active groups\n/reset - Reset admin chat ID (use with caution)');
        }
    } catch (error) {
        console.error(`Error handling admin command ${command}:`, error);
        await message.reply(`Error executing command: ${error.message}`);
    }
    
    return result;
}

// Check if a message is from an admin
export function isAdmin(message, adminChatId, adminNumber) {
    // If admin chat ID is set, use that as the primary check
    if (adminChatId && message.from === adminChatId) {
        return true;
    }
    
    // Otherwise, fall back to checking against the admin number
    if (adminNumber) {
        const senderNumber = message.from.split('@')[0];
        return senderNumber === adminNumber || senderNumber.endsWith(adminNumber);
    }
    
    return false;
}

// Find admin's chat based on admin number
export async function findAdminChat(client, adminNumber) {
    if (!adminNumber) {
        console.log('No admin number provided, skipping admin chat search');
        return null;
    }
    
    try {
        const chats = await client.getChats();
        
        // Look for a one-on-one chat with the admin's number
        for (const chat of chats) {
            if (!chat.isGroup) {
                // Extract the number from the chat ID (format: number@c.us)
                const chatNumber = chat.id._serialized.split('@')[0];
                
                // Check for exact or suffix match
                if (chatNumber === adminNumber || chatNumber.endsWith(adminNumber)) {
                    console.log(`Found admin chat: ${chat.id._serialized} (${chat.name || 'Unnamed chat'})`);
                    return chat;
                }
            }
        }
        
        console.log(`No chat found for admin number: ${adminNumber}`);
        return null;
    } catch (error) {
        console.error('Error finding admin chat:', error);
        return null;
    }
} 