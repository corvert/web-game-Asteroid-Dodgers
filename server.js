/**
 * Simple web server for local development with CORS support
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// Define MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Create server
const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
    }

    // Apply CORS headers to all responses
    const responseHeaders = { ...corsHeaders };

    // Handle root URL
    let filePath = req.url === '/' ? './index.html' : '.' + req.url;

    // Determine the content type based on file extension
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    responseHeaders['Content-Type'] = contentType;

    // Read the file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found
                fs.readFile('./404.html', (error, content) => {
                    if (error) {
                        // If 404.html is not found, send a simple text response
                        res.writeHead(404, responseHeaders);
                        res.end('404 - File Not Found');
                    } else {
                        responseHeaders['Content-Type'] = 'text/html';
                        res.writeHead(404, responseHeaders);
                        res.end(content, 'utf-8');
                    }
                });
            } else {
                // Server error
                res.writeHead(500, responseHeaders);
                res.end(`Server Error: ${error.code}`);
                console.error(`Server Error: ${error.code}`);
            }
        } else {
            // Success
            res.writeHead(200, responseHeaders);
            res.end(content, 'utf-8');
        }
    });
});

// Set port (default: 3000)
const port = process.env.PORT || 3000;

// Start server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
