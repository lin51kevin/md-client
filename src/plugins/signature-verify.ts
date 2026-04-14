/**
 * Plugin Signature Verification Framework (Phase 6 skeleton)
 *
 * Provides a basic structure for verifying plugin signatures.
 * Currently validates format and structure; full cryptographic verification
 * will be implemented when the crypto backend (Tauri or Web Crypto API) is ready.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export enum SignatureStatus {
  /** Plugin manifest has no signature field */
  Missing = 'missing',
  /** Signature field exists but format is invalid */
  InvalidFormat = 'invalid_format',
  /** Verification skipped (e.g. no public keys configured) */
  Skipped = 'skipped',
  /** Signature verified successfully */
  Verified = 'verified',
  /** Signature verification failed */
  Failed = 'failed',
}

export interface SignaturePublicKey {
  /** Identifier for this key (e.g. fingerprint, key ID) */
  keyId: string;
  /** PEM-encoded public key */
  publicKey: string;
}

export type SignatureAlgorithm = 'Ed25519' | 'RSA-SHA256' | 'ECDSA-P256';

export interface SignatureVerifyOptions {
  /** Trusted public keys to verify against */
  publicKeys: SignaturePublicKey[];
  /** Expected algorithm (default: Ed25519) */
  algorithm?: SignatureAlgorithm;
  /** Optional: allowed plugin IDs (if set, only these IDs are accepted) */
  allowedPluginIds?: string[];
}

export interface SignatureResult {
  status: SignatureStatus;
  /** Key ID that matched (only when status === Verified) */
  keyId?: string;
  /** Human-readable detail */
  message: string;
}

/** Minimal manifest shape expected by verifier */
export interface SignatureManifest {
  id?: string;
  signature?: string;
  version?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Basic check: is the signature string plausible (base64url-like, reasonable length)? */
function isValidSignatureFormat(sig: string): boolean {
  if (sig.length < 32) return false;
  // Base64url alphabet + padding
  return /^[A-Za-z0-9_-]+=*$/.test(sig);
}

/** Build a human-readable message from status */
function statusMessage(status: SignatureStatus, detail?: string): string {
  switch (status) {
    case SignatureStatus.Missing:
      return 'Plugin is missing signature information';
    case SignatureStatus.InvalidFormat:
      return 'Invalid plugin signature format';
    case SignatureStatus.Skipped:
      return 'Signature verification skipped (no public key configured)';
    case SignatureStatus.Verified:
      return `Signature verified (${detail ?? 'unknown key'})`;
    case SignatureStatus.Failed:
      return `Signature verification failed${detail ? `: ${detail}` : ''}`;
  }
}

// ── Verify function ─────────────────────────────────────────────────────────

/**
 * Verify a plugin's signature against trusted public keys.
 *
 * This is the framework skeleton. Full cryptographic verification is a TODO
 * that will use Web Crypto API or Tauri's crypto plugin when available.
 */
export function verifyPluginSignature(
  manifest: SignatureManifest,
  options: SignatureVerifyOptions = { publicKeys: [] },
): SignatureResult {
  const { publicKeys, algorithm = 'Ed25519', allowedPluginIds: _allowedPluginIds } = options;

  // Step 1: Check signature exists
  if (manifest.signature == null) {
    return { status: SignatureStatus.Missing, message: statusMessage(SignatureStatus.Missing) };
  }

  // Step 2: Validate format
  if (!isValidSignatureFormat(manifest.signature)) {
    return { status: SignatureStatus.InvalidFormat, message: statusMessage(SignatureStatus.InvalidFormat) };
  }

  // Step 3: If no public keys, skip verification
  if (publicKeys.length === 0) {
    return { status: SignatureStatus.Skipped, message: statusMessage(SignatureStatus.Skipped) };
  }

  // Step 4: Verify against each public key
  // TODO: Implement actual crypto verification using Web Crypto API or Tauri plugin
  // For now, we return Failed since no real signature will match
  for (const _pubKey of publicKeys) {
    // const isValid = await crypto.verify(algorithm, ...);
    // if (isValid) return { status: SignatureStatus.Verified, keyId: pubKey.keyId, ... };
  }

  return {
    status: SignatureStatus.Failed,
    keyId: undefined,
    message: statusMessage(SignatureStatus.Failed, `no matching ${algorithm} key`),
  };
}

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a pre-configured verifier function with fixed options.
 */
export function createSignatureVerifier(options: SignatureVerifyOptions) {
  return (manifest: SignatureManifest): SignatureResult => {
    return verifyPluginSignature(manifest, options);
  };
}
