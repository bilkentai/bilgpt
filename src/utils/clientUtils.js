/**
 * WhatsApp Client Utilities
 * 
 * Handles client setup, initialization, and shutdown:
 * - Client configuration
 * - Authentication and connection
 * - Error handling and reconnection
 * - Graceful shutdown
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Create a properly configured WhatsApp client
export function createClient(dataPath) {
    console.log('Creating WhatsApp client...');
    
    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: 'whatsapp-bot-new',
            dataPath: dataPath
        }),
        puppeteer: {
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--disable-notifications',
                '--window-size=1280,720',
                '--disable-features=site-per-process',
                '--disable-infobars'
            ],
            headless: true,
            timeout: 60000,
            executablePath: '/usr/bin/google-chrome',
            defaultViewport: {
                width: 1280,
                height: 720
            },
            ignoreDefaultArgs: ['--enable-automation']
        },
        qrMaxRetries: 3,
        authTimeoutMs: 90000,
        qrTimeoutMs: 60000,
        restartOnAuthFail: true
    });
    
    // Add debug information
    console.log('Puppeteer config:', {
        executablePath: '/usr/bin/google-chrome',
        version: 'whatsapp-web.js v1.26.0',
        userDataDir: path.join(dataPath, 'session-whatsapp-bot-new')
    });
    
    return client;
}

// Set up common client event handlers
export function setupClientEvents(client) {
    client.on('loading_screen', (percent, message) => {
        console.log(`Loading WhatsApp Web: ${percent}% - ${message}`);
    });

    client.on('qr', (qr) => {
        console.log('\nQR Code received! Scan this with WhatsApp:');
        qrcode.generate(qr, {small: true});
    });

    client.on('authenticated', () => {
        console.log('Authentication successful!');
    });

    client.on('auth_failure', (msg) => {
        console.error('Authentication failed:', msg);
    });
    
    client.on('disconnected', (reason) => {
        console.log('Client was disconnected:', reason);
    });
    
    return client;
}

// Initialize the client with retries
export async function initializeClient(client) {
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
        try {
            console.log(`Initialization attempt ${retries + 1}/${maxRetries}...`);
            console.log('Starting browser...');
            
            await client.initialize();
            console.log('Client initialized successfully!');
            return true;
        } catch (error) {
            retries++;
            console.error(`Initialization attempt ${retries} failed:`, error.message);
            
            if (retries === maxRetries) {
                console.error('Max retries reached. Exiting...');
                return false;
            }
            
            console.log(`Waiting 5 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    return false;
}

// Gracefully shut down the client and clean up resources
export async function shutdownClient(client, dataPath) {
    console.log('Shutting down gracefully...');
    let shutdownSuccessful = false;
    
    try {
        // Add a timeout to ensure the process will exit even if something hangs
        const shutdownTimeout = setTimeout(() => {
            console.error('Shutdown taking too long, forcing exit...');
            process.exit(1);
        }, 10000); // 10 seconds max
        
        // Destroy the client
        if (client) {
            console.log('Destroying WhatsApp client...');
            try {
                await Promise.race([
                    client.destroy(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Client destroy timeout')), 5000))
                ]);
                console.log('WhatsApp client destroyed');
            } catch (error) {
                console.error('Error or timeout destroying client:', error.message);
            }
        }
        
        // Kill browser processes directly
        try {
            console.log('Ensuring all browser processes are terminated...');
            await execAsync('pkill -9 -f chrome || true');
            await execAsync('pkill -9 -f google-chrome || true');
            await execAsync('pkill -9 -f chromium || true');
            await execAsync('pkill -9 -f puppeteer || true');
            // Wait a moment for processes to be killed
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('Browser processes terminated');
        } catch (err) {
            console.log('Error killing browser processes:', err.message);
        }
        
        // Clean up lock files to prevent issues on restart
        const sessionPath = path.join(dataPath, 'session-whatsapp-bot-new');
        
        try {
            console.log('Cleaning up lock files...');
            const lockFiles = [
                path.join(sessionPath, 'SingletonLock'),
                path.join(sessionPath, 'SingletonCookie'),
                path.join(sessionPath, 'SingletonSocket')
            ];
            
            for (const lockFile of lockFiles) {
                try {
                    await fs.unlink(lockFile);
                } catch (err) {
                    // Ignore if file doesn't exist
                    if (err.code !== 'ENOENT') {
                        console.log(`Error removing lock file ${lockFile}:`, err.message);
                    }
                }
            }
            console.log('Lock files cleaned up');
        } catch (err) {
            console.log('Error during lock file cleanup:', err.message);
        }
        
        clearTimeout(shutdownTimeout);
        shutdownSuccessful = true;
        console.log('Cleanup completed');
        
        return true;
    } catch (err) {
        console.error('Error during shutdown:', err);
        return shutdownSuccessful;
    }
}

// Register handlers for graceful shutdown on process termination
export function registerShutdownHandlers(client, dataPath) {
    const handleShutdown = async () => {
        console.log('Received shutdown signal');
        const success = await shutdownClient(client, dataPath);
        process.exit(success ? 0 : 1);
    };
    
    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
    process.on('SIGUSR2', handleShutdown); // Used by nodemon
    process.on('uncaughtException', (err) => {
        console.error('Uncaught exception:', err);
        handleShutdown();
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection at:', promise, 'reason:', reason);
    });
} 