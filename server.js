const express = require('express');
const path = require('path');

const app = express();
const host = '0.0.0.0';

// Disable all caching so browsers and proxies always receive the freshest content
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Serve static files from root directory with caching disabled
app.use(express.static(__dirname, { etag: false, maxAge: 0 }));

// Fallback to index.html for all other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Always listen on port 3000 for AI Studio environment
app.listen(3000, host, () => {
  console.log(`Gap Finder server running at http://${host}:3000`);
});

// Also listen on process.env.PORT if specified and different from 3000
const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
if (envPort && envPort !== 3000) {
  try {
    app.listen(envPort, host, () => {
      console.log(`Gap Finder also listening on port ${envPort}`);
    });
  } catch (err) {
    console.warn(`Could not bind to port ${envPort}:`, err.message);
  }
}
