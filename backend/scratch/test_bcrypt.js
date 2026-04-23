import bcrypt from 'bcryptjs';

async function testBcrypt() {
    const password = "mysecretpassword";
    const saltRounds = 12;

    console.log(`Password: "${password}"`);
    console.log(`Salt Rounds: ${saltRounds}`);

    const hash = await bcrypt.hash(password, saltRounds);
    console.log(`Generated Hash: ${hash}`);

    const isValid = await bcrypt.compare(password, hash);
    console.log(`Comparison result for same password: ${isValid}`);

    const isInvalid = await bcrypt.compare("wrongpassword", hash);
    console.log(`Comparison result for wrong password: ${isInvalid}`);
    
    // Test with empty string
    const emptyHash = await bcrypt.hash("", saltRounds);
    console.log(`Empty string hash: ${emptyHash}`);
    console.log(`Compare "" with emptyHash: ${await bcrypt.compare("", emptyHash)}`);
}

testBcrypt();
