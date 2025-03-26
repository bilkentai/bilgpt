/**
 * Health Check Utility
 * 
 * Provides a simple HTTP server for health checks
 * Used by Docker and monitoring services
 */

import http from 'http';

let server = null;

/**
 * Starts a health check server
 * @param {number} port - Port to listen on
 * @param {Object} statusInfo - Status information to include in health check
 * @returns {http.Server} - HTTP server instance
 */
export function startHealthServer(port = 3000, statusInfo = {}) {
  if (server) {
    console.log('Health check server already running');
    return server;
  }

  console.log(`Starting health check server on port ${port}`);
  
  server = http.createServer((req, res) => {
    if (req.url === '/health') {
      const status = {
        status: 'up',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        ...statusInfo
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status, null, 2));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  server.listen(port, () => {
    console.log(`Health check server listening on port ${port}`);
  });
  
  return server;
}

/**
 * Updates status information for health checks
 * @param {Object} newStatus - New status information
 */
export function updateStatus(newStatus) {
  statusInfo = { ...statusInfo, ...newStatus };
}

/**
 * Stops the health check server
 */
export function stopHealthServer() {
  if (server) {
    console.log('Stopping health check server');
    server.close();
    server = null;
  }
} 