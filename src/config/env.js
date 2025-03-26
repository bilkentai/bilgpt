import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Setup dirname and environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '../..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

export const ADMIN_NUMBER = process.env.ADMIN_NUMBER || '';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Get paths
export const authPath = path.join(rootDir, '.wwebjs_auth');
export const dataPath = path.join(rootDir, 'data');
export const criticsPath = path.join(rootDir, 'critics');
export const promptsPath = path.join(rootDir, 'src', 'prompts');

// Log environment configuration (with sanitized keys)
export function logConfig() {
  console.log('\nEnvironment configuration:');
  console.log('- ADMIN_NUMBER:', ADMIN_NUMBER ? `${ADMIN_NUMBER.substring(0, 3)}...${ADMIN_NUMBER.substring(ADMIN_NUMBER.length - 2)}` : 'Not set');
  console.log('- OPENAI_API_KEY:', OPENAI_API_KEY ? `Set (starts with ${OPENAI_API_KEY.substring(0, 3)}...)` : 'Not set');
  
  if (!ADMIN_NUMBER) {
    console.log('\nWARNING: ADMIN_NUMBER is not set in .env file. The bot will list all available chats on startup.');
    console.log('You should add your number to ADMIN_NUMBER in .env file and restart.');
  }
} 