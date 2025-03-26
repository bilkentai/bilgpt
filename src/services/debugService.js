/**
 * Debug Service
 * 
 * Provides debugging utilities for admins to troubleshoot the bot
 */

// Debug chat functionality
export async function debugChats(client, message, adminChatId, activeGroupIds) {
    try {
        console.log('Running debug chat command...');
        const ADMIN_NUMBER = process.env.ADMIN_NUMBER || '';
        
        // Get all chats
        const chats = await client.getChats();
        console.log(`Found ${chats.length} chats total`);
        
        // Get sender info for debugging
        const senderNumber = message.from.split('@')[0];
        console.log(`Command sent from: ${message.from} (Number: ${senderNumber})`);
        console.log(`Admin number set as: ${ADMIN_NUMBER}`);
        
        // Log chat ID of this message
        console.log(`Current chat ID: ${message.from}`);
        
        // Check admin matching conditions
        const adminChecks = {
            exactMatch: message.from === adminChatId,
            includesAdminNumber: message.from.includes(ADMIN_NUMBER),
            senderMatchesAdmin: senderNumber === ADMIN_NUMBER,
            senderEndsWithAdmin: senderNumber.endsWith(ADMIN_NUMBER),
            adminEndsWithSender: ADMIN_NUMBER.endsWith(senderNumber)
        };
        console.log('Admin match checks:', adminChecks);
        
        let response = '*Debug Chat Information:*\n\n';
        response += `Your chat ID: \`${message.from}\`\n`;
        response += `Your number (extracted): \`${senderNumber}\`\n`;
        response += `Admin number (from .env): \`${ADMIN_NUMBER}\`\n`;
        response += `Admin chat ID (current): \`${adminChatId || 'Not set'}\`\n\n`;
        
        // Show admin recognition status
        response += '*Admin Recognition Tests:*\n';
        for (const [test, result] of Object.entries(adminChecks)) {
            response += `- ${test}: ${result ? '✅' : '❌'}\n`;
        }
        response += '\n';
        
        response += `Total chats found: ${chats.length}\n\n`;
        
        // First show raw information about the sender's chat
        response += '*Your Chat Info:*\n```\n';
        const thisChat = await message.getChat();
        const chatInfo = {
            id: thisChat.id._serialized,
            name: thisChat.name,
            isGroup: thisChat.isGroup,
            isGroupByID: thisChat.id._serialized.endsWith('@g.us'),
            participants: thisChat.participants ? 
                thisChat.participants.map(p => ({id: p.id._serialized})).slice(0, 3) : 'none',
            hasMore: thisChat.participants && thisChat.participants.length > 3
        };
        response += JSON.stringify(chatInfo, null, 2);
        response += '\n```\n\n';
        
        // Raw dump of all chats (limited info)
        response += '*All Chat IDs:*\n```\n';
        const allChatIds = chats.map(chat => ({
            id: chat.id._serialized,
            name: chat.name || 'Unnamed',
            isGroup: chat.isGroup,
            isGroupByID: chat.id._serialized.endsWith('@g.us'),
            mismatch: chat.isGroup !== chat.id._serialized.endsWith('@g.us') ? '⚠️' : '',
            matches: chat.id._serialized.includes(ADMIN_NUMBER) ? '⭐' : ''
        }));
        response += JSON.stringify(allChatIds.slice(0, 10), null, 2);
        if (allChatIds.length > 10) {
            response += `\n... and ${allChatIds.length - 10} more chats`;
        }
        response += '\n```\n\n';
        
        const reply = await message.reply(response);
        
        // Show specific problematic chats that might have mismatched isGroup vs ID
        const mismatchChats = chats.filter(chat => 
            (chat.isGroup !== true && chat.id._serialized.endsWith('@g.us')) ||
            (chat.isGroup === true && !chat.id._serialized.endsWith('@g.us'))
        );
        
        if (mismatchChats.length > 0) {
            let mismatchResponse = '*Potential Chat Type Issues:*\n\n';
            mismatchChats.forEach(chat => {
                mismatchResponse += `❗ *${chat.name || 'Unnamed Chat'}*\n`;
                mismatchResponse += `ID: \`${chat.id._serialized}\`\n`;
                mismatchResponse += `isGroup: ${chat.isGroup}\n`;
                mismatchResponse += `ID format: ${chat.id._serialized.endsWith('@g.us') ? 'Group (@g.us)' : 'Personal (@c.us)'}\n\n`;
            });
            
            mismatchResponse += "These chats have inconsistent properties which might cause issues with commands. Use ID format (ends with @g.us) as the primary indicator for groups.";
            
            await client.sendMessage(message.from, mismatchResponse);
        }
        
        // Detailed info to console for debugging
        console.log('==== DETAILED CHAT DEBUG INFO ====');
        chats.forEach((chat, idx) => {
            console.log(`Chat ${idx+1}:`);
            console.log(`- ID: ${chat.id._serialized}`);
            console.log(`- Name: ${chat.name || 'Unnamed'}`);
            console.log(`- IsGroup: ${chat.isGroup}`);
            console.log(`- ID indicates group: ${chat.id._serialized.endsWith('@g.us')}`);
            console.log(`- Mismatch: ${chat.isGroup !== chat.id._serialized.endsWith('@g.us') ? 'YES ⚠️' : 'No'}`);
            console.log(`- IsArchived: ${chat.isArchived}`);
            console.log(`- IsMuted: ${chat.isMuted}`);
            
            // Chat ID analysis for admin matching
            if (chat.id._serialized === message.from) {
                console.log(`- THIS IS THE CURRENT CHAT`);
            }
            
            // Check if this chat could be admin
            if (ADMIN_NUMBER) {
                const chatNumber = chat.id._serialized.split('@')[0];
                if (chatNumber === ADMIN_NUMBER || 
                    chatNumber.endsWith(ADMIN_NUMBER) || 
                    ADMIN_NUMBER.endsWith(chatNumber)) {
                    console.log(`- POTENTIAL ADMIN MATCH ⭐`);
                }
            }
            
            // Check if it's in the active groups list
            if (activeGroupIds.includes(chat.id._serialized)) {
                console.log(`- ACTIVE GROUP 🟢`);
            }
        });
        
        return reply;
    } catch (error) {
        console.error('Error in debug command:', error);
        await message.reply(`Error executing debug command: ${error.message}`);
    }
} 