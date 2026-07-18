// tests/regValidation.test.js
const assert = require('assert');
const RegValidation = require('../js/registration/regValidation.js');

// Mock global variables that the browser would have
global.CONFIG = {
  EMPLOYEE_ID_REGEX: /^Ops\d{5,6}$/i,
  PHONE_REGEX: /^(03|05|07|08|09)\d{8}$/
};

function runTests() {
  console.log('🧪 Running Validation Tests...\n');
  
  // Test Employee ID
  assert.strictEqual(RegValidation.validateEmployeeId('Ops123456'), true, 'Should accept Ops123456');
  assert.strictEqual(RegValidation.validateEmployeeId('ops654321'), true, 'Should accept case-insensitive Ops');
  assert.strictEqual(RegValidation.validateEmployeeId('ABC123456'), false, 'Should reject ABC123456');
  assert.strictEqual(RegValidation.validateEmployeeId('Ops1234'), false, 'Should reject Ops1234 (too short)');
  console.log('✓ Employee ID validation passed');
  
  // Test Phone
  assert.strictEqual(RegValidation.validatePhone('0901234567'), true, 'Should accept valid phone');
  assert.strictEqual(RegValidation.validatePhone('0398765432'), true, 'Should accept valid phone (03)');
  assert.strictEqual(RegValidation.validatePhone('1234567890'), false, 'Should reject invalid phone prefix');
  assert.strictEqual(RegValidation.validatePhone('090123456'), false, 'Should reject invalid phone length');
  console.log('✓ Phone validation passed');
  
  // Test validateInputs
  const validInputs = RegValidation.validateInputs('Ops123456', 'Nguyen Van A', '0901234567', 'Nam');
  assert.strictEqual(validInputs.length, 0, 'Should return no errors for valid inputs');
  
  const emptyInputs = RegValidation.validateInputs('', '', '', '');
  assert.strictEqual(emptyInputs.length, 1, 'Should return missing field error');
  assert.strictEqual(emptyInputs[0].includes('Vui lòng nhập đầy đủ'), true);
  
  const invalidInputs = RegValidation.validateInputs('ABC123', 'Nguyen Van A', '123', 'Nam');
  assert.strictEqual(invalidInputs.length, 2, 'Should return 2 validation errors');
  
  console.log('✓ Combined inputs validation passed');
  
  console.log('\n✅ All tests passed!');
}

try {
  runTests();
} catch (error) {
  console.error('\n❌ Test failed:');
  console.error(error.message);
  process.exit(1);
}
