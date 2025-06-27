#!/usr/bin/env node

/**
 * Quick API test script for PrahEstate Service
 * Usage: node test-api.js [base-url]
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.argv[2] || 'http://localhost:3000';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    }).on('error', reject);
  });
}

async function testEndpoints() {
  console.log(`Testing API endpoints at: ${BASE_URL}\n`);

  const endpoints = [
    { name: 'Health Check', path: '/health' },
    { name: 'Get Estates', path: '/api/estates?limit=5' },
    { name: 'Get Stats', path: '/api/stats' },
    { name: 'Sync Status', path: '/api/sync/status' },
    { name: 'Sync History', path: '/api/sync/history?limit=3' },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      const result = await makeRequest(`${BASE_URL}${endpoint.path}`);
      
      console.log(`  Status: ${result.status}`);
      if (result.data.success !== undefined) {
        console.log(`  Success: ${result.data.success}`);
      }
      if (result.data.data) {
        const data = result.data.data;
        if (Array.isArray(data)) {
          console.log(`  Items: ${data.length}`);
        } else if (typeof data === 'object') {
          console.log(`  Data keys: ${Object.keys(data).join(', ')}`);
        }
      }
      console.log('  ✓ OK\n');
    } catch (error) {
      console.log(`  ✗ ERROR: ${error.message}\n`);
    }
  }

  console.log('API test completed!');
}

if (require.main === module) {
  testEndpoints().catch(console.error);
}

module.exports = { testEndpoints, makeRequest };
