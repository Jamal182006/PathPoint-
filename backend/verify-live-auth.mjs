const base = 'http://localhost:5000/api';
const ts = Date.now();
const email = 'qa.user.' + ts + '@example.com';
const username = 'qa_user_' + ts;
const signup = {
  email,
  username,
  firstName: 'Test',
  lastName: 'User',
  dateOfBirth: '1998-01-15',
  password: 'StrongPass123',
  confirmPassword: 'StrongPass123',
  role: 'user',
  phoneCountryCode: '+1',
  phone: '5551234567',
};

const registerResponse = await fetch(base + '/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(signup),
});
const registerText = await registerResponse.text();
console.log('REGISTER_STATUS', registerResponse.status);
console.log(registerText);

const loginResponse = await fetch(base + '/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: email, password: 'StrongPass123' }),
});
const loginText = await loginResponse.text();
console.log('LOGIN_STATUS', loginResponse.status);
console.log(loginText);
