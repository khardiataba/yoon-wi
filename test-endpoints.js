// Test script to verify new endpoints
const fetch = globalThis.fetch

if (typeof fetch !== "function") {
  throw new Error("Global fetch is not available in this Node.js runtime.")
}

const BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:5000/api';
const TOKEN = process.env.TEST_API_TOKEN || 'test_token';

async function testEndpoints() {
  try {
    console.log('🧪 Testing new endpoints...\n');
    
    // Test 1: GET /rides/:id (should return error for invalid ID, but proves route exists)
    console.log('Test 1: GET /rides/:id');
    const rideRes = await fetch(`${BASE_URL}/rides/507f1f77bcf86cd799439011`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const rideData = await rideRes.text();
    console.log(`Status: ${rideRes.status}, Response: ${rideData.substring(0, 100)}...\n`);
    
    // Test 2: GET /services/:id/messages (should return empty array for non-existent service)
    console.log('Test 2: GET /services/:id/messages');
    const messagesRes = await fetch(`${BASE_URL}/services/507f1f77bcf86cd799439011/messages`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const messagesData = await messagesRes.text();
    console.log(`Status: ${messagesRes.status}, Response: ${messagesData.substring(0, 100)}...\n`);
    
    console.log('✅ Endpoints are responding!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEndpoints();
