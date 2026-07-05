import * as StellarSdk from '@stellar/stellar-sdk'

const HORIZON = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org'
const ISSUER_PUBLIC = process.env.STELLAR_ISSUER_PUBLIC_KEY
const ISSUER_SECRET = process.env.STELLAR_ISSUER_SECRET_KEY

if (!ISSUER_PUBLIC || !ISSUER_SECRET) {
  console.error('Missing STELLAR_ISSUER_PUBLIC_KEY or STELLAR_ISSUER_SECRET_KEY in .env')
  process.exit(1)
}

const server = new StellarSdk.Horizon.Server(HORIZON)
const NETWORK = StellarSdk.Networks.TESTNET
const AMBPHP = new StellarSdk.Asset('AMBPHP', ISSUER_PUBLIC)

const hashes = {}
const link = (h) => `https://stellar.expert/explorer/testnet/tx/${h}`

async function fund(kp) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`)
  if (!res.ok) throw new Error(`Friendbot failed for ${kp.publicKey()}`)
  await res.json()
}

async function trustline(kp) {
  const acc = await server.loadAccount(kp.publicKey())
  const tx = new StellarSdk.TransactionBuilder(acc, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.changeTrust({ asset: AMBPHP }))
    .setTimeout(30)
    .build()
  tx.sign(kp)
  return server.submitTransaction(tx)
}

async function mint(toPublicKey, amount) {
  const issuer = StellarSdk.Keypair.fromSecret(ISSUER_SECRET)
  const acc = await server.loadAccount(issuer.publicKey())
  const tx = new StellarSdk.TransactionBuilder(acc, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: toPublicKey,
      asset: AMBPHP,
      amount,
    }))
    .setTimeout(30)
    .build()
  tx.sign(issuer)
  return server.submitTransaction(tx)
}

async function pay(fromKp, toPublicKey, amount) {
  const acc = await server.loadAccount(fromKp.publicKey())
  const tx = new StellarSdk.TransactionBuilder(acc, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: toPublicKey,
      asset: AMBPHP,
      amount,
    }))
    .setTimeout(30)
    .build()
  tx.sign(fromKp)
  return server.submitTransaction(tx)
}

async function balanceAMBPHP(publicKey) {
  const acc = await server.loadAccount(publicKey)
  const b = acc.balances.find(
    (x) => x.asset_type !== 'native' && x.asset_code === 'AMBPHP' && x.asset_issuer === ISSUER_PUBLIC,
  )
  return b ? b.balance : '0'
}

async function setupMultisig(groupKp, signers, threshold) {
  const acc = await server.loadAccount(groupKp.publicKey())
  const builder = new StellarSdk.TransactionBuilder(acc, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
  for (const s of signers) {
    builder.addOperation(StellarSdk.Operation.setOptions({
      signer: { ed25519PublicKey: s, weight: 1 },
    }))
  }
  builder.addOperation(StellarSdk.Operation.setOptions({
    masterWeight: 1,
    lowThreshold: threshold,
    medThreshold: threshold,
    highThreshold: threshold,
  }))
  const tx = builder.setTimeout(30).build()
  tx.sign(groupKp)
  return server.submitTransaction(tx)
}

// ─── Scenario ─────────────────────────────────────────────

console.log('▶ Generating keypairs')
const alice = StellarSdk.Keypair.random()
const bob = StellarSdk.Keypair.random()
const carol = StellarSdk.Keypair.random()
const group = StellarSdk.Keypair.random()
console.log('  alice:', alice.publicKey())
console.log('  bob:  ', bob.publicKey())
console.log('  carol:', carol.publicKey())
console.log('  group:', group.publicKey())

console.log('▶ Friendbot funding all 4 accounts')
await Promise.all([fund(alice), fund(bob), fund(carol), fund(group)])

console.log('▶ Establishing AMBPHP trustlines')
const trustAlice = await trustline(alice)
hashes.trustAlice = trustAlice.hash
await trustline(bob)
await trustline(carol)
const trustGroup = await trustline(group)
hashes.trustGroup = trustGroup.hash

console.log('▶ Minting 10,000 AMBPHP to alice, bob, carol')
const mintAlice = await mint(alice.publicKey(), '10000')
hashes.mintAlice = mintAlice.hash
await mint(bob.publicKey(), '10000')
await mint(carol.publicKey(), '10000')

console.log('▶ Alice pays 500 AMBPHP → group (contribution)')
const contribute = await pay(alice, group.publicKey(), '500')
hashes.contribute = contribute.hash

const groupBal = await balanceAMBPHP(group.publicKey())
console.log('  group balance:', groupBal)
if (groupBal !== '500.0000000') throw new Error(`Expected group balance 500, got ${groupBal}`)

console.log('▶ Configuring multisig: 3 signers, threshold 2')
const multisig = await setupMultisig(
  group,
  [alice.publicKey(), bob.publicKey(), carol.publicKey()],
  2,
)
hashes.multisig = multisig.hash

console.log('▶ Negative test: disbursement signed by ONLY alice should fail')
try {
  const acc = await server.loadAccount(group.publicKey())
  const tx = new StellarSdk.TransactionBuilder(acc, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: alice.publicKey(),
      asset: AMBPHP,
      amount: '100',
    }))
    .setTimeout(30)
    .build()
  tx.sign(alice)
  await server.submitTransaction(tx)
  throw new Error('Single-signature disbursement should have failed')
} catch (err) {
  if (err.message === 'Single-signature disbursement should have failed') throw err
  console.log('  ✓ single-sig rejected (as expected)')
}

console.log('▶ Disbursement signed by alice + bob (meets threshold 2)')
const acc = await server.loadAccount(group.publicKey())
const tx = new StellarSdk.TransactionBuilder(acc, {
  fee: StellarSdk.BASE_FEE,
  networkPassphrase: NETWORK,
})
  .addOperation(StellarSdk.Operation.payment({
    destination: alice.publicKey(),
    asset: AMBPHP,
    amount: '100',
  }))
  .setTimeout(30)
  .build()
tx.sign(alice)
tx.sign(bob)
const disburse = await server.submitTransaction(tx)
hashes.disburse = disburse.hash

console.log('\n─── SUCCESS ───────────────────────────────')
for (const [name, hash] of Object.entries(hashes)) {
  console.log(`${name.padEnd(14)} ${link(hash)}`)
}
