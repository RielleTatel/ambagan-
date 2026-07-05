import * as StellarSdk from '@stellar/stellar-sdk'
import CryptoJS from 'crypto-js'

// ─── Config ───────────────────────────────────────────────
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET

// Lazy getters so missing env vars don't crash the module at import time —
// they only throw when an actual Stellar operation is attempted.
function getHorizonServer() {
  return new StellarSdk.Horizon.Server(process.env.STELLAR_HORIZON_URL!)
}
function getEncryptionSecret() {
  return process.env.STELLAR_ENCRYPTION_SECRET!
}

export const horizonServer = {
  loadAccount: (pk: string) => getHorizonServer().loadAccount(pk),
  submitTransaction: (tx: StellarSdk.Transaction) => getHorizonServer().submitTransaction(tx),
  transactions: () => getHorizonServer().transactions(),
  payments: () => getHorizonServer().payments(),
}

// The asset your app uses as its currency (lazy — requires STELLAR_ISSUER_PUBLIC_KEY at runtime)
export function getAMBPHP() {
  return new StellarSdk.Asset('AMBPHP', process.env.STELLAR_ISSUER_PUBLIC_KEY!)
}

// ─── Keypair helpers ──────────────────────────────────────

export function generateKeypair() {
  const kp = StellarSdk.Keypair.random()
  return {
    publicKey: kp.publicKey(),
    secretKey: kp.secret(),
  }
}

export function encryptSecret(secret: string): string {
  return CryptoJS.AES.encrypt(secret, getEncryptionSecret()).toString()
}

export function decryptSecret(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, getEncryptionSecret())
  return bytes.toString(CryptoJS.enc.Utf8)
}

// ─── Account helpers ──────────────────────────────────────

// Fund a new account via Friendbot (testnet only)
export async function fundTestnetAccount(publicKey: string) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`)
  if (!res.ok) throw new Error(`Friendbot failed: ${res.statusText}`)
  return res.json()
}

// Load an account from Horizon
export async function loadAccount(publicKey: string) {
  return horizonServer.loadAccount(publicKey)
}

// Get AMBPHP balance for an account
export async function getAMBPHPBalance(publicKey: string): Promise<string> {
  const account = await horizonServer.loadAccount(publicKey)
  const balance = account.balances.find(
    (b: any) =>
      b.asset_type !== 'native' &&
      b.asset_code === 'AMBPHP' &&
      b.asset_issuer === process.env.STELLAR_ISSUER_PUBLIC_KEY
  )
  return balance ? balance.balance : '0'
}

// ─── Trustline ────────────────────────────────────────────

// A new account must establish a trustline before receiving AMBPHP
export async function establishTrustline(accountSecret: string) {
  const keypair = StellarSdk.Keypair.fromSecret(accountSecret)
  const account = await horizonServer.loadAccount(keypair.publicKey())

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.changeTrust({
        asset: getAMBPHP(),
      })
    )
    .setTimeout(30)
    .build()

  tx.sign(keypair)

  return horizonServer.submitTransaction(tx)
}

// ─── Payment ──────────────────────────────────────────────

// Send AMBPHP from one account to another
export async function sendAMBPHP(
  fromSecret: string,
  toPublicKey: string,
  amount: string
) {
  const fromKeypair = StellarSdk.Keypair.fromSecret(fromSecret)
  const account = await horizonServer.loadAccount(fromKeypair.publicKey())

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: toPublicKey,
        asset: getAMBPHP(),
        amount: amount,
      })
    )
    .setTimeout(30)
    .build()

  tx.sign(fromKeypair)

  return horizonServer.submitTransaction(tx)
}

// ─── Issuer: mint AMBPHP to an account ───────────────────

// Used to give test accounts AMBPHP during onboarding
export async function mintAMBPHP(toPublicKey: string, amount: string) {
  const issuerKeypair = StellarSdk.Keypair.fromSecret(
    process.env.STELLAR_ISSUER_SECRET_KEY!
  )
  const issuerAccount = await horizonServer.loadAccount(issuerKeypair.publicKey())

  const tx = new StellarSdk.TransactionBuilder(issuerAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: toPublicKey,
        asset: getAMBPHP(),
        amount: amount,
      })
    )
    .setTimeout(30)
    .build()

  tx.sign(issuerKeypair)

  return horizonServer.submitTransaction(tx)
}

// ─── Multisig ─────────────────────────────────────────────

// Configure a group fund account with multisig
// threshold: number of signatures required
// signers: array of member public keys
export async function setupGroupMultisig(
  groupSecret: string,
  signerPublicKeys: string[],
  threshold: number
) {
  const groupKeypair = StellarSdk.Keypair.fromSecret(groupSecret)
  const account = await horizonServer.loadAccount(groupKeypair.publicKey())

  const builder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })

  // Add each member as a signer with weight 1
  for (const signerKey of signerPublicKeys) {
    builder.addOperation(
      StellarSdk.Operation.setOptions({
        signer: {
          ed25519PublicKey: signerKey,
          weight: 1,
        },
      })
    )
  }

  // Set thresholds:
  // low/med/high threshold = number of member signatures required
  builder.addOperation(
    StellarSdk.Operation.setOptions({
      // Phase 2: keep master signing weight so the server can add signers on join.
      // Phase 4 hardens this to 0 once multi-party signature collection lands.
      masterWeight: 1,
      lowThreshold: threshold,
      medThreshold: threshold,
      highThreshold: threshold,
    })
  )

  const tx = builder.setTimeout(30).build()
  tx.sign(groupKeypair)

  return horizonServer.submitTransaction(tx)
}

// ─── Transaction history ──────────────────────────────────

// Fetch transaction history for the ledger view
export async function getAccountTransactions(publicKey: string, limit = 20) {
  const transactions = await horizonServer
    .transactions()
    .forAccount(publicKey)
    .limit(limit)
    .order('desc')
    .call()

  return transactions.records
}

export async function getAccountPayments(publicKey: string, limit = 20) {
  const payments = await horizonServer
    .payments()
    .forAccount(publicKey)
    .limit(limit)
    .order('desc')
    .call()

  return payments.records
}

// Add a new member as signer and update the group's on-chain threshold
// in a single transaction. Signed by the group's master keypair; if the
// current threshold requires more weight than the master alone provides,
// the admin's secret is also used to reach the threshold.
export async function addGroupSignerAndUpdateThreshold(
  groupSecret: string,
  newSignerPublicKey: string,
  newThreshold: number,
  adminSecret?: string,
) {
  const groupKeypair = StellarSdk.Keypair.fromSecret(groupSecret)
  const account = await horizonServer.loadAccount(groupKeypair.publicKey())

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.setOptions({
        signer: { ed25519PublicKey: newSignerPublicKey, weight: 1 },
      }),
    )
    .addOperation(
      StellarSdk.Operation.setOptions({
        lowThreshold: newThreshold,
        medThreshold: newThreshold,
        highThreshold: newThreshold,
      }),
    )
    .setTimeout(30)
    .build()

  tx.sign(groupKeypair)
  if (adminSecret) {
    tx.sign(StellarSdk.Keypair.fromSecret(adminSecret))
  }

  return horizonServer.submitTransaction(tx)
}