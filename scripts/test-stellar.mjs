import * as StellarSdk from '@stellar/stellar-sdk'

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org')

// Generate two test accounts
const alice = StellarSdk.Keypair.random()
const bob = StellarSdk.Keypair.random()

console.log('Alice:', alice.publicKey())
console.log('Bob:', bob.publicKey())

// Fund both
await fetch(`https://friendbot.stellar.org?addr=${alice.publicKey()}`)
await fetch(`https://friendbot.stellar.org?addr=${bob.publicKey()}`)

// Wait a moment for funding to settle
await new Promise(r => setTimeout(r, 3000))

// Check balances
const aliceAccount = await server.loadAccount(alice.publicKey())
console.log('Alice XLM balance:', aliceAccount.balances[0].balance)

// Send XLM from Alice to Bob
const account = await server.loadAccount(alice.publicKey())
const tx = new StellarSdk.TransactionBuilder(account, {
  fee: StellarSdk.BASE_FEE,
  networkPassphrase: StellarSdk.Networks.TESTNET,
})
  .addOperation(StellarSdk.Operation.payment({
    destination: bob.publicKey(),
    asset: StellarSdk.Asset.native(),
    amount: '10',
  }))
  .setTimeout(30)
  .build()

tx.sign(alice)
const result = await server.submitTransaction(tx)
console.log('Transaction hash:', result.hash)
console.log('Explorer link:', `https://stellar.expert/explorer/testnet/tx/${result.hash}`)