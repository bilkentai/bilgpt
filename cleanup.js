import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanup() {
    console.log('Running cleanup...');
    
    // Clean up session files
    const sessionDir = path.join(__dirname, '.wwebjs_auth', 'session-whatsapp-bot-new');
    if (fs.existsSync(sessionDir)) {
        const lockFiles = [
            'SingletonLock',
            'SingletonCookie',
            'SingletonSocket'
        ];
        
        lockFiles.forEach(file => {
            const filePath = path.join(sessionDir, file);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Removed ${file}`);
                } catch (err) {
                    console.error(`Error removing ${file}:`, err);
                }
            }
        });
    }
    
    console.log('Cleanup complete');
}

cleanup(); 