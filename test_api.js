const fetch = require('node-fetch');

async function testReg() {
  const payload = {
    action: 'get_registration',
    empId: process.argv[2] || 'ops236220'
  };

  const apiLink = 'https://script.google.com/macros/s/AKfycbyfXco9SQzgQBFOucTUzRd9tRX4MqsogCBLi0ANnNDOiH7KG2e6itEu3bioGUjtnbtw/exec';
  
  try {
    const res = await fetch(apiLink, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}

testReg();
