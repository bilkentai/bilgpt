/**
 * Message Handler Module
 * 
 * Processes incoming messages and dispatches them to the appropriate handler:
 * - URL processing with LLM critic 
 * - AI chat responses
 * - Message formatting and helper functions
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { criticizeContent } from '../ai/critic.js';
import { getBroResponse } from '../ai/chatbot.js';
import { criticsPath } from '../config/env.js';

// URL regex pattern
const urlPattern = /(https?:\/\/[^\s]+)/;

// Create URL patterns for specific sites
const xTwitterPattern = /https?:\/\/(x\.com|twitter\.com)\/.*/i;
const redditPattern = /https?:\/\/(www\.)?reddit\.com\/.*/i;

// Get formatted date for file organization
export function getFormattedDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Handle URL processing and criticism
export async function handleUrlMessage(message, url) {
    await message.react('👍');
    console.log('Processing URL:', url);
    
    try {
        let content = '';
        let title = '';
        
        // Check if the URL is from X/Twitter or Reddit
        if (xTwitterPattern.test(url) || redditPattern.test(url)) {
            console.log('Detected X/Twitter or Reddit URL. Using Puppeteer for extraction.');
            const extractionResult = await extractWithPuppeteer(url);
            if (extractionResult) {
                content = extractionResult.content;
                title = extractionResult.title;
            } else {
                // Fallback to axios/cheerio if Puppeteer fails
                console.log('Puppeteer extraction failed, falling back to Cheerio');
                const response = await axios.get(url);
                const $ = cheerio.load(response.data);
                
                // Clean up the HTML
                $('script').remove();
                $('style').remove();
                $('nav').remove();
                $('footer').remove();
                
                content = $('main, article, .content, #content, .post-content').first().text() || $('body').text();
                content = content.replace(/(\n\s*)+/g, '\n\n').trim();
                title = $('title').text();
            }
        } else {
            // For other sites, use the existing Cheerio-based approach
            console.log('Using Cheerio for standard web extraction');
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);
            
            // Clean up the HTML
            $('script').remove();
            $('style').remove();
            $('nav').remove();
            $('footer').remove();
            
            // Extract content from common content containers or fall back to body
            content = $('main, article, .content, #content, .post-content').first().text() || $('body').text();
            content = content.replace(/(\n\s*)+/g, '\n\n').trim();
            title = $('title').text();
        }
        
        console.log('Getting critique...');
        const result = await criticizeContent(content, url);
        
        if (result.criticism) {
            // First send the summary if available
            if (result.summary) {
                // Send the summary as is without adding our own header formatting
                await message.reply(result.summary);
                console.log('Summary sent successfully');
                
                // Slightly longer delay between messages to ensure they're received in order
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Remove the summary from the criticism to avoid duplication
                // Look for common summary patterns and remove them
                let fullCriticism = result.criticism;
                const summaryPatterns = [
                    /^Özet:.*?\n\n/si,
                    /^Summary:.*?\n\n/si,
                    /^Özet .*?\n\n/si,
                    /^Summary .*?\n\n/si
                ];
                
                for (const pattern of summaryPatterns) {
                    fullCriticism = fullCriticism.replace(pattern, '');
                }
                
                // Then send the detailed criticism (without the summary)
                await message.reply(`${fullCriticism.trim()}`);
            } else {
                // If no summary was extracted, send the full criticism
                await message.reply(`${result.criticism.trim()}`);
            }
            
            console.log('Detailed critique sent successfully');
            
            if (result.scoreEmoji) {
                await message.react(result.scoreEmoji);
                console.log('Reacted with score:', result.scoreEmoji);
            }
            
            // Save the content and critique (with title instead of $ object)
            await saveContentAndCritique(title, url, content, result);
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Processing error:', error);
        await message.reply('Sorry, I encountered an error while analyzing this link. Please make sure it\'s accessible and try again.');
        return false;
    }
}

// Extract content using Puppeteer for JS-rendered sites
async function extractWithPuppeteer(url) {
    let browser = null;
    try {
        console.log('Launching Puppeteer browser');
        
        // Use the system Chrome (for compatibility with Docker setup)
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            ignoreHTTPSErrors: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
        });
        
        const page = await browser.newPage();
        
        // Set viewport and user agent
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');
        
        // Set timeout for navigation
        await page.setDefaultNavigationTimeout(30000);
        
        // Log navigation start
        console.log(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });
        console.log('Page loaded, extracting content');
        
        // Allow time for JavaScript to execute - using setTimeout instead of waitForTimeout
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get page title
        const title = await page.title();
        
        let content = '';
        
        // Handle different sites differently
        if (xTwitterPattern.test(url)) {
            // X.com / Twitter specific extraction
            try {
                // Wait for tweet content to appear
                await page.waitForSelector('[data-testid="tweetText"]', { timeout: 5000 });
                
                // Extract tweet text and user info
                content = await page.evaluate(() => {
                    // Get the tweet author name and handle
                    const authorElement = document.querySelector('[data-testid="User-Name"]');
                    const author = authorElement ? authorElement.textContent : 'Unknown Author';
                    
                    // Get the tweet text
                    const tweetTextElements = Array.from(document.querySelectorAll('[data-testid="tweetText"]'));
                    const tweetText = tweetTextElements.map(el => el.textContent).join('\n\n');
                    
                    // Get images if any
                    const imagesText = Array.from(document.querySelectorAll('[data-testid="tweetPhoto"]'))
                        .length > 0 ? `[Tweet contains ${document.querySelectorAll('[data-testid="tweetPhoto"]').length} image(s)]` : '';
                    
                    // Get quote tweets if any
                    const quotedTweet = document.querySelector('[data-testid="Tweet-public-conversation"]');
                    const quotedText = quotedTweet ? `\n\nQuoted Tweet: ${quotedTweet.textContent}` : '';
                    
                    // Combine all information
                    return `Tweet by ${author}\n\n${tweetText}\n${imagesText}${quotedText}`;
                });
                
            } catch (error) {
                console.error('Error extracting Twitter content:', error.message);
                content = `Failed to extract Tweet content: ${error.message}`;
            }
        } else if (redditPattern.test(url)) {
            // Reddit specific extraction
            try {
                // Wait for post content to appear
                await page.waitForSelector('.Post', { timeout: 5000 });
                
                // Extract post content
                content = await page.evaluate(() => {
                    // Get post title
                    const titleElement = document.querySelector('h1');
                    const postTitle = titleElement ? titleElement.textContent : 'Unknown Post';
                    
                    // Get post author
                    const authorElement = document.querySelector('a[href*="/user/"]');
                    const author = authorElement ? authorElement.textContent : 'Unknown Author';
                    
                    // Get post content
                    const postContentElement = document.querySelector('.Post div[data-testid="post-content"]');
                    const postContent = postContentElement ? postContentElement.textContent : '';
                    
                    // Get comments
                    const comments = Array.from(document.querySelectorAll('.Comment'))
                        .slice(0, 5) // Only get top 5 comments
                        .map(comment => {
                            const commentAuthor = comment.querySelector('a[href*="/user/"]')?.textContent || 'Unknown';
                            const commentText = comment.querySelector('[data-testid="comment"]')?.textContent || '';
                            return `${commentAuthor}: ${commentText}`;
                        })
                        .join('\n\n');
                    
                    return `Reddit Post: ${postTitle}\nBy: ${author}\n\n${postContent}\n\nTop Comments:\n${comments}`;
                });
                
            } catch (error) {
                console.error('Error extracting Reddit content:', error.message);
                content = `Failed to extract Reddit content: ${error.message}`;
            }
        } else {
            // Generic content extraction for other sites
            content = await page.evaluate(() => {
                // Remove scripts, styles, etc.
                document.querySelectorAll('script, style, nav, footer, header, aside, iframe').forEach(el => el.remove());
                
                // Try to get main content
                const mainContent = document.querySelector('main, article, .content, #content, .post-content');
                if (mainContent) {
                    return mainContent.innerText;
                }
                
                // Fall back to body text
                return document.body.innerText;
            });
            
            // Clean up the content
            content = content.replace(/(\n\s*)+/g, '\n\n').trim();
        }
        
        await browser.close();
        console.log('Browser closed');
        
        return { content, title };
    } catch (error) {
        console.error('Puppeteer extraction error:', error);
        if (browser) {
            await browser.close().catch(err => console.error('Error closing browser:', err));
        }
        return null;
    }
}

// Save content and critique to file system
async function saveContentAndCritique(title, url, content, result) {
    try {
        // Create a date-based directory
        const dateStr = getFormattedDate();
        const criticsDir = path.join(criticsPath, dateStr);
        
        // Create directory if it doesn't exist
        await fs.mkdir(criticsDir, { recursive: true });
        
        // Create a filename based on sanitized title
        const sanitizedTitle = title
            .replace(/[^a-z0-9]/gi, '_')
            .replace(/_+/g, '_')
            .substring(0, 50);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}_${sanitizedTitle}.json`;
        
        // Create JSON data
        const data = {
            title,
            url,
            timestamp: new Date().toISOString(),
            content: content.substring(0, 10000), // Limit content size
            criticism: result.criticism,
            summary: result.summary,
            score: result.scoreNumber
        };
        
        // Write to file
        await fs.writeFile(
            path.join(criticsDir, filename),
            JSON.stringify(data, null, 2)
        );
        
        console.log(`Saved critique to ${filename}`);
    } catch (error) {
        console.error('Error saving critique:', error);
    }
}

// Handle bot conversation
export async function handleBotConversation(message, isReplyToBot, mentionsBot) {
    try {
        // Get chat
        const chat = await message.getChat();
        console.log(`Processing message from chat: ${chat.name || 'private'}`);
        
        // Fetch message history for this chat (limited to last 50 messages)
        let messageHistory = [];
        
        // Try to get messages before the current one for context
        const fetchedMessages = await chat.fetchMessages({ limit: 50 });
        
        if (fetchedMessages && fetchedMessages.length > 0) {
            console.log(`Got ${fetchedMessages.length} messages for context`);
            
            // Add sender names to messages for better context
            for (const msg of fetchedMessages) {
                if (!msg.fromMe) {
                    try {
                        // Only attempt to get contact info for messages not from the bot
                        const contact = await msg.getContact();
                        msg.senderName = contact.name || contact.pushname || contact.number;
                    } catch (error) {
                        msg.senderName = 'Unknown';
                        console.log('Error getting contact info:', error.message);
                    }
                }
            }
            
            // Sort messages by timestamp to ensure they're in chronological order
            messageHistory = fetchedMessages
                .sort((a, b) => a.timestamp - b.timestamp) // Sort by timestamp
                .filter(msg => msg.timestamp < message.timestamp); // Only include messages before the current one
        }
        
        // Add sender name to current message
        try {
            const contact = await message.getContact();
            message.senderName = contact.name || contact.pushname || contact.number;
        } catch (error) {
            message.senderName = 'Unknown';
            console.log('Error getting sender contact info:', error.message);
        }
        
        console.log(`Generating AI response for ${message.senderName}`);
        
        // Set typing indicator to show the bot is "thinking"
        chat.sendStateTyping();
        
        // Get AI response
        const response = await getBroResponse(message, messageHistory);
        
        // Send response
        await message.reply(response);
        
        return true;
    } catch (error) {
        console.error('Error handling conversation:', error);
        await message.reply('Sorry, I encountered an error while processing your message. Please try again.');
        return false;
    }
}

// Extract URL from message
export function extractUrl(message) {
    const match = message.body.match(urlPattern);
    return match ? match[0] : null;
}

// Check if message is intended for the bot
export async function isMessageForBot(message, client) {
    // Check if message is a reply to a message from the bot
    const isReplyToBot = message.hasQuotedMsg && await message.getQuotedMessage().then(quoted => quoted.fromMe).catch(() => false);
    
    // Check if message mentions the bot (by including "@bot" or similar)
    // Note: You might want to customize this based on how your bot is named
    const botNumber = client.info.wid._serialized.split('@')[0];
    const mentionsBot = message.mentionedIds?.includes(`${botNumber}@c.us`) || 
                        message.body.toLowerCase().includes('@bot') ||
                        message.body.toLowerCase().includes('@ai');
    
    return isReplyToBot || mentionsBot;
} 