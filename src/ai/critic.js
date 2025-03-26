import OpenAI from "openai";
import { promises as fs } from 'fs';
import path from 'path';
import { OPENAI_API_KEY, promptsPath, criticsPath } from '../config/env.js';

// Initialize OpenAI with API key
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

// Function to extract score and convert to emoji
function getScoreEmoji(criticResponse) {
    try {
        // Updated regex to match both "BAI Score: X.X/100" and "BAI Puanı: X.X/100" formats
        const scoreMatch = criticResponse.match(/BAI (?:Score|Puanı):\s*(-?\d+\.?\d*)\/100/i);
        if (!scoreMatch) {
            console.log('No score match found in response:', criticResponse);
            return null;
        }
        
        const score = parseFloat(scoreMatch[1]);
        
        // Select emoji based on score range for more meaningful representation
        let scoreEmoji;
        if (score < 0) {
            // Negative score (penalty applied for promotional content)
            scoreEmoji = '❌'; // Red X for promotional content
        } else if (score >= 90) {
            scoreEmoji = '🌟'; // Excellent
        } else if (score >= 80) {
            scoreEmoji = '✨'; // Very good
        } else if (score >= 70) {
            scoreEmoji = '👌'; // Good
        } else if (score >= 60) {
            scoreEmoji = '👍'; // Decent
        } else if (score >= 50) {
            scoreEmoji = '🤔'; // Average/questionable
        } else if (score >= 30) {
            scoreEmoji = '👎'; // Poor
        } else if (score >= 10) {
            scoreEmoji = '⚠️'; // Bad
        } else {
            scoreEmoji = '🚫'; // Very bad
        }
        
        // Also return the number emoji for the first digit
        const firstDigit = score < 0 ? '0' : Math.min(9, Math.floor(Math.abs(score) / 10));
        const numberEmojis = {
            0: '0️⃣',
            1: '1️⃣',
            2: '2️⃣',
            3: '3️⃣',
            4: '4️⃣',
            5: '5️⃣',
            6: '6️⃣',
            7: '7️⃣',
            8: '8️⃣',
            9: '9️⃣'
        };
        
        console.log(`Extracted score: ${score}, emoji: ${scoreEmoji}, digit emoji: ${numberEmojis[firstDigit]}`);
        return scoreEmoji;
    } catch (error) {
        console.error('Error extracting score:', error);
        return null;
    }
}

// Function to read prompt from markdown file
async function loadPrompt() {
    try {
        const promptPath = path.join(promptsPath, 'critic_prompt.md');
        const promptContent = await fs.readFile(promptPath, 'utf-8');
        // Remove the markdown title and return the actual prompt
        return promptContent.split('\n').slice(2).join('\n').trim();
    } catch (error) {
        console.error('Error loading prompt:', error);
        throw error;
    }
}

/**
 * Analyzes content and provides critical assessment
 * @param {string} content - Text content to analyze
 * @param {string} url - Source URL of the content
 * @returns {Promise<object>} Object containing the criticism, summary, and score emoji
 */
export async function criticizeContent(content, url) {
    try {
        // Limit content length to avoid excessive token usage
        const maxContentLength = 10000;
        const truncatedContent = content.length > maxContentLength 
            ? content.substring(0, maxContentLength) + "... [content truncated]"
            : content;
        
        console.log(`Analyzing content from ${url} (${truncatedContent.length} chars)`);
        
        // Load the critic prompt from markdown file
        const criticPrompt = await loadPrompt();
        
        // Prepare the content for analysis
        const userPrompt = `URL: ${url}

Content to analyze:
===
${truncatedContent}
===`;

        const response = await openai.chat.completions.create({
            model: "gpt-4.5-preview",
            messages: [
                {
                    role: "system",
                    content: criticPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            max_tokens: 800,
            temperature: 0.7
        });
        
        // Get the criticism from the response
        const criticism = response.choices[0]?.message.content.trim();
        console.log('Received criticism response, extracting components...');
        
        // Extract summary from the first paragraph (as per the critic prompt structure)
        let summary = '';
        const paragraphs = criticism.split('\n\n');
        if (paragraphs.length > 0) {
            // Look for explicitly marked summary sections with various possible formats
            const summaryRegexPatterns = [
                /Özet:\s*(.*?)(?:\n\n|$)/si,           // Turkish format with colon
                /Summary:\s*(.*?)(?:\n\n|$)/si,        // English format with colon
                /^Özet\s+(.*?)(?:\n\n|$)/mi,           // Turkish format without colon
                /^Summary\s+(.*?)(?:\n\n|$)/mi,        // English format without colon
            ];
            
            let foundSummary = false;
            for (const pattern of summaryRegexPatterns) {
                const match = criticism.match(pattern);
                if (match && match[1]) {
                    summary = match[1].trim();
                    console.log(`Found summary with pattern: ${pattern}`);
                    foundSummary = true;
                    break;
                }
            }
            
            if (!foundSummary) {
                // More aggressive summary extraction
                // Try to find the first line/paragraph that might be a summary
                for (const paragraph of paragraphs) {
                    if (paragraph.trim().length > 10 && paragraph.trim().length < 300) {
                        // This is likely the summary - first short paragraph
                        summary = paragraph.trim();
                        console.log('Using first short paragraph as summary');
                        break;
                    }
                }
                
                // If still no summary, fall back to first paragraph
                if (!summary) {
                    summary = paragraphs[0].trim();
                    console.log('No explicit summary found, using first paragraph');
                }
            }
        }
        
        // Extract score emoji using the BAI Score format
        const scoreEmoji = getScoreEmoji(criticism);
        
        // Extract numeric score for other uses
        const scoreMatch = criticism.match(/BAI (?:Score|Puanı):\s*(-?\d+\.?\d*)\/100/i);
        let scoreNumber = 50; // Default middle score
        
        if (scoreMatch) {
            scoreNumber = parseFloat(scoreMatch[1]);
            console.log(`Found BAI Score: ${scoreNumber}/100`);
        } else {
            console.log('No BAI Score found in response, using default score of 50');
        }
        
        console.log(`Analysis complete. BAI Score: ${scoreNumber}/100 (${scoreEmoji || 'No emoji'})`);
        
        return {
            criticism,
            summary,
            scoreEmoji,
            scoreNumber
        };
    } catch (error) {
        console.error('Error criticizing content:', error);
        return {
            criticism: "I'm sorry, I couldn't analyze this content due to a technical issue.",
            summary: "Analysis error",
            scoreEmoji: "⚠️",
            scoreNumber: 0
        };
    }
} 