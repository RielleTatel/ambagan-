import {
  generateKeypair,
  encryptSecret,
  fundTestnetAccount,
  establishTrustline,
  mintAMBPHP,
} from './stellar'

export async function createCustodialAccount() {
  // 1. Generate keypair
  const { publicKey, secretKey } = generateKeypair()

  // 2. Fund via Friendbot (gives them XLM for fees)
  await fundTestnetAccount(publicKey)

  // 3. Establish AMBPHP trustline
  await establishTrustline(secretKey)

  // 4. Mint some test AMBPHP so they can contribute immediately
  await mintAMBPHP(publicKey, '10000') // ₱10,000 test balance

  // 5. Return public key and encrypted secret for storage in Supabase
  return {
    publicKey,
    encryptedSecret: encryptSecret(secretKey),
  }
}