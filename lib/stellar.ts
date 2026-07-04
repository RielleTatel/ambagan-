// Stellar SDK wrapper. Owns: SDK client init, keypair generation, encrypt/decrypt
// helpers for custodial secret keys, low-level transaction builders. All Stellar
// SDK usage in the app must go through this module (spec NFR 5.5) so a
// testnet/mainnet switch is a single-file change.

export type KeypairSummary = {
  publicKey: string;
  secretKey: string;
};

export function generateKeypair(): KeypairSummary {
  throw new Error("not_implemented");
}

export function encryptSecret(_secret: string): string {
  throw new Error("not_implemented");
}

export function decryptSecret(_encrypted: string): string {
  throw new Error("not_implemented");
}
