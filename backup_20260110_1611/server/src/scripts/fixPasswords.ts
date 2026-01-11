import bcrypt from 'bcryptjs'

async function generatePasswordHash() {
  const password = '123456'
  const hash = await bcrypt.hash(password, 10)
  console.log('Password:', password)
  console.log('Hash:', hash)
  
  // Test the hash
  const isValid = await bcrypt.compare(password, hash)
  console.log('Verification:', isValid)
}

generatePasswordHash()