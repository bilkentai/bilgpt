/**
 * Test script for group storage functionality
 * 
 * Run this script with: node src/test-storage.js
 */

import {
    loadActiveGroups,
    saveActiveGroups,
    addActiveGroup,
    removeActiveGroup
} from './groupStorage.js';

// Example group IDs (fictional)
const testGroupId1 = '123456789012@g.us';
const testGroupId2 = '987654321098@g.us';

// Test function
async function testStorage() {
    try {
        console.log('=== Group Storage Test ===');
        
        // Load existing groups
        console.log('\n1. Loading existing active groups:');
        const existingGroups = await loadActiveGroups();
        console.log(`   Loaded ${existingGroups.length} groups:`, existingGroups);
        
        // Add a test group
        console.log('\n2. Adding test group 1:');
        const groupsAfterAdd1 = await addActiveGroup(testGroupId1);
        console.log(`   Groups after add:`, groupsAfterAdd1);
        
        // Add another test group
        console.log('\n3. Adding test group 2:');
        const groupsAfterAdd2 = await addActiveGroup(testGroupId2);
        console.log(`   Groups after second add:`, groupsAfterAdd2);
        
        // Try adding a duplicate (should not change anything)
        console.log('\n4. Adding duplicate group:');
        const groupsAfterDuplicate = await addActiveGroup(testGroupId1);
        console.log(`   Groups after adding duplicate:`, groupsAfterDuplicate);
        
        // Remove a group
        console.log('\n5. Removing test group 1:');
        const groupsAfterRemove = await removeActiveGroup(testGroupId1);
        console.log(`   Groups after remove:`, groupsAfterRemove);
        
        // Save directly
        console.log('\n6. Saving empty list directly:');
        await saveActiveGroups([]);
        const finalGroups = await loadActiveGroups();
        console.log(`   Final groups after direct save:`, finalGroups);
        
        // Restore original groups
        console.log('\n7. Restoring original groups:');
        await saveActiveGroups(existingGroups);
        const restoredGroups = await loadActiveGroups();
        console.log(`   Restored groups:`, restoredGroups);
        
        console.log('\nTest completed successfully!');
    } catch (error) {
        console.error('Error during test:', error);
    }
}

// Run the test
testStorage(); 