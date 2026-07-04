import * as StellarSdk from '@stellar/stellar-sdk'

// Generate issuer keypair
const issuer = StellarSdk.Keypair.random()
console.log('STELLAR_ISSUER_PUBLIC_KEY=', issuer.publicKey())
console.log('STELLAR_ISSUER_SECRET_KEY=', issuer.secret())

// Fund via Friendbot
const response = await fetch(
  `https://friendbot.stellar.org?addr=${issuer.publicKey()}`
)
const result = await response.json()
console.log('Friendbot result:', result.successful ? 'Funded!' : result)

// Verify balance
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org')
const account = await server.loadAccount(issuer.publicKey())
console.log('Balance:', account.balances)