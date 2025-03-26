/**
 * Group Storage Module
 * 
 * Handles persistent storage of active groups:
 * - Saves active groups to a JSON file
 * - Loads active groups on startup
 * - Provides functions to update the stored list
 */

import { promises as fs } from 'fs';
import path from 'path';
import { dataPath } from '../config/env.js';

const STORAGE_FILE = path.join(dataPath, 'active-groups.json');

// Ensure the data directory exists
async function ensureDataDirExists() {
    try {
        const dataDir = path.dirname(STORAGE_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        return true;
    } catch (error) {
        console.error('Error creating data directory:', error);
        return false;
    }
}

/**
 * Loads active groups from storage
 * @returns {Promise<string[]>} Array of active group IDs
 */
export async function loadActiveGroups() {
    try {
        await ensureDataDirExists();
        
        // Check if the file exists
        try {
            await fs.access(STORAGE_FILE);
        } catch (error) {
            // File doesn't exist yet, return empty array
            console.log('No stored active groups found. Starting with empty list.');
            return [];
        }
        
        // Read and parse the file
        const data = await fs.readFile(STORAGE_FILE, 'utf8');
        const groups = JSON.parse(data);
        
        console.log(`Loaded ${groups.length} active groups from storage`);
        return groups;
    } catch (error) {
        console.error('Error loading active groups:', error);
        // Return empty array as fallback
        return [];
    }
}

/**
 * Saves active groups to storage
 * @param {string[]} activeGroups - Array of active group IDs to save
 * @returns {Promise<boolean>} Success status
 */
export async function saveActiveGroups(activeGroups) {
    try {
        await ensureDataDirExists();
        
        // Format the JSON with indentation for readability
        const data = JSON.stringify(activeGroups, null, 2);
        await fs.writeFile(STORAGE_FILE, data, 'utf8');
        
        console.log(`Saved ${activeGroups.length} active groups to storage`);
        return true;
    } catch (error) {
        console.error('Error saving active groups:', error);
        return false;
    }
}

/**
 * Adds a group to storage
 * @param {string} groupId - Group ID to add
 * @returns {Promise<string[]>} Updated array of active group IDs
 */
export async function addActiveGroup(groupId) {
    const groups = await loadActiveGroups();
    
    // Check if the group is already in the list
    if (!groups.includes(groupId)) {
        groups.push(groupId);
        await saveActiveGroups(groups);
        console.log(`Added group ${groupId} to persistent storage`);
    }
    
    return groups;
}

/**
 * Removes a group from storage
 * @param {string} groupId - Group ID to remove
 * @returns {Promise<string[]>} Updated array of active group IDs
 */
export async function removeActiveGroup(groupId) {
    const groups = await loadActiveGroups();
    
    // Filter out the group
    const updatedGroups = groups.filter(id => id !== groupId);
    
    // Only save if there was a change
    if (updatedGroups.length !== groups.length) {
        await saveActiveGroups(updatedGroups);
        console.log(`Removed group ${groupId} from persistent storage`);
    }
    
    return updatedGroups;
}

/**
 * Updates the entire active groups list
 * @param {string[]} groups - New array of active group IDs
 * @returns {Promise<boolean>} Success status
 */
export async function updateActiveGroups(groups) {
    return await saveActiveGroups(groups);
} 