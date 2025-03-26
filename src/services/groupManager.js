/**
 * Group Management Module
 * 
 * Handles all group-related operations such as:
 * - Active group management
 * - Group retrieval and listing
 * - Adding and removing active groups for monitoring
 */

import { 
    addActiveGroup as persistAddGroup, 
    removeActiveGroup as persistRemoveGroup 
} from './groupStorage.js';

// Helper function to determine if a chat ID is a group
export function isGroupId(id) {
    return id.endsWith('@g.us');
}

// Handles setting a group as active for monitoring
export async function setActiveGroup(client, message, groupId, activeGroupIds) {
    try {
        console.log(`Attempting to set active group with ID: ${groupId}`);
        
        // Verify the ID format
        if (!groupId.endsWith('@g.us')) {
            console.log(`Group ID doesn't have the expected format (should end with @g.us)`);
            await message.reply(`Error: The provided ID "${groupId}" doesn't look like a group ID. Group IDs should end with @g.us`);
            return activeGroupIds;
        }
        
        // Try to fetch the chat
        console.log(`Fetching chat with ID: ${groupId}`);
        const chat = await client.getChatById(groupId);
        console.log(`Chat found, name: ${chat.name}, isGroup: ${chat.isGroup}`);
        
        // Extra safety check
        if (!chat) {
            console.log('getChatById returned but chat is null/undefined');
            await message.reply(`Error: Could not find a chat with ID ${groupId}`);
            return activeGroupIds;
        }
        
        // Check if it's a group by ID format and chat object properties
        const isValidGroup = groupId.endsWith('@g.us') && chat.name && chat.id && chat.id._serialized;
        
        if (!isValidGroup) {
            console.log(`Chat with ID ${groupId} does not seem to be a valid group chat`);
            await message.reply(`Error: The chat with ID "${groupId}" doesn't appear to be a valid group chat.`);
            return activeGroupIds;
        }
        
        // Only check isGroup property if it's defined, to avoid false negatives
        if (chat.isGroup === false) {  // Only explicitly check if false, not undefined
            console.log(`Chat with ID ${groupId} explicitly marked as not a group (isGroup=${chat.isGroup})`);
            await message.reply(`Warning: This chat (${chat.name}) might not be a true group chat according to the API, but I'll add it anyway since the ID format is correct.`);
        }
        
        // Return a new array if we need to update
        if (!activeGroupIds.includes(groupId)) {
            // Use the persistent storage to add the group
            await persistAddGroup(groupId);
            
            const updatedGroups = [...activeGroupIds, groupId];
            console.log(`Added group "${chat.name}" to active list. Current active groups: ${updatedGroups.length}`);
            await message.reply(`Successfully added *${chat.name}* to active monitoring list. ✅`);
            return updatedGroups;
        } else {
            await message.reply(`Group *${chat.name}* is already being monitored.`);
            return activeGroupIds;
        }
    } catch (error) {
        console.error('Error setting active group:', error);
        
        // Better error handling with more details
        let errorDetails = '';
        if (error.message && error.message.includes('not found')) {
            errorDetails = ' The group ID may be incorrect or you might not be a member of this group.';
        }
        
        await message.reply(`Error: Could not set active group. ${error.message || 'Unknown error'}${errorDetails}\n\nPlease run /list to see available groups and their correct IDs.`);
        return activeGroupIds;
    }
}

// Handles removing a group from active monitoring
export async function removeActiveGroup(client, message, groupId, activeGroupIds) {
    try {
        console.log(`Attempting to remove active group with ID: ${groupId}`);
        
        // Check if already monitoring
        if (!activeGroupIds.includes(groupId)) {
            console.log(`Group ${groupId} is not currently being monitored`);
            await message.reply('This group is not currently being monitored. Use /active to see monitored groups.');
            return activeGroupIds;
        }
        
        // Try to fetch the chat info
        console.log(`Fetching chat with ID: ${groupId}`);
        try {
            const chat = await client.getChatById(groupId);
            console.log(`Chat found, removing "${chat.name}" from active list`);
            
            // Remove from persistent storage
            await persistRemoveGroup(groupId);
            
            const updatedGroups = activeGroupIds.filter(id => id !== groupId);
            console.log(`Removed group from active list. Remaining active groups: ${updatedGroups.length}`);
            
            await message.reply(`Successfully removed *${chat.name}* from active monitoring list. ❌`);
            return updatedGroups;
        } catch (chatError) {
            // If we can't fetch the chat but it's in our list, remove it anyway
            console.log(`Chat not found, but removing ID from active list anyway: ${groupId}`);
            
            // Remove from persistent storage even if we can't fetch chat details
            await persistRemoveGroup(groupId);
            
            const updatedGroups = activeGroupIds.filter(id => id !== groupId);
            
            await message.reply(`Removed ID \`${groupId}\` from monitoring list. (Note: Could not fetch chat details)`);
            return updatedGroups;
        }
    } catch (error) {
        console.error('Error removing active group:', error);
        await message.reply(`Error: Could not process remove command. ${error.message || 'Unknown error'}`);
        return activeGroupIds;
    }
}

// Displays currently active groups
export async function showActiveGroups(client, message, activeGroupIds) {
    try {
        console.log(`Showing active groups. Current count: ${activeGroupIds.length}`);
        
        if (activeGroupIds.length === 0) {
            await message.reply('No groups are currently being monitored. Use */list* to see available groups, then */setactive <id>* to start monitoring a group.');
            return;
        }
        
        let response = '*Currently Monitored Groups:*\n\n';
        let validGroups = 0;
        let unreachableGroups = 0;
        
        for (const groupId of activeGroupIds) {
            try {
                console.log(`Fetching details for active group: ${groupId}`);
                const chat = await client.getChatById(groupId);
                response += `✅ *${chat.name}*\nID: \`${groupId}\`\n`;
                
                // Add participant count if available
                if (chat.participants) {
                    response += `Participants: ${chat.participants.length}\n`;
                }
                
                response += '\n';
                validGroups++;
            } catch (error) {
                console.log(`Error getting details for group ${groupId}: ${error.message}`);
                response += `❓ *Unknown Group*\nID: \`${groupId}\`\nError: ${error.message}\n\n`;
                unreachableGroups++;
            }
        }
        
        // Summary information
        response += `---\nTotal active groups: ${activeGroupIds.length}`;
        if (unreachableGroups > 0) {
            response += ` (${validGroups} reachable, ${unreachableGroups} unreachable)`;
        }
        
        response += "\n\nTo stop monitoring a group, use:\n*/removeactive <id>*";
        
        await message.reply(response);
        console.log('Sent active groups list to admin');
    } catch (error) {
        console.error('Error showing active groups:', error);
        await message.reply('Error showing active groups: ' + error.message);
    }
}

// Lists all available chats
export async function listAllChats(client, message, activeGroupIds) {
    try {
        console.log('Listing all chats');
        const chats = await client.getChats();
        let response = '*Available Chats:*\n\n';
        
        // Helper function to determine if a chat is a group
        const isGroupChat = (chat) => {
            // Check both the isGroup property and ID format
            return chat.isGroup || chat.id._serialized.endsWith('@g.us');
        };
        
        // Groups first - using our enhanced detection
        const groups = chats.filter(chat => isGroupChat(chat));
        console.log(`Found ${groups.length} group chats (including @g.us IDs)`);
        
        if (groups.length > 0) {
            response += '*Groups:*\n';
            groups.forEach(chat => {
                // Mark active groups
                const isActive = activeGroupIds.includes(chat.id._serialized);
                const activeSymbol = isActive ? ' 🟢' : '';
                
                response += `${chat.name}${activeSymbol}\nID: \`${chat.id._serialized}\`\n`;
                
                // Show mismatch warning if relevant
                const idIndicatesGroup = chat.id._serialized.endsWith('@g.us');
                const propertyIndicatesGroup = chat.isGroup === true;
                if (idIndicatesGroup !== propertyIndicatesGroup) {
                    response += `⚠️ *Property mismatch* (isGroup=${chat.isGroup})\n`;
                }
                
                response += '\n';
            });
        }
        
        // DMs second
        const dms = chats.filter(chat => !isGroupChat(chat));
        console.log(`Found ${dms.length} direct message chats`);
        
        if (dms.length > 0) {
            response += '\n*Direct Messages:*\n';
            dms.forEach(chat => {
                response += `${chat.name || 'Unknown'}\nID: \`${chat.id._serialized}\`\n\n`;
            });
        }
        
        // Add instructions
        response += '\n---\n';
        response += 'To monitor a group, use:\n*/setactive <group-id>*\n\n';
        response += 'To see currently monitored groups, use:\n*/active*';
        
        await message.reply(response);
        console.log('Sent chat list to admin');
    } catch (error) {
        console.error('Error listing chats:', error);
        await message.reply('Error listing chats: ' + error.message);
    }
} 