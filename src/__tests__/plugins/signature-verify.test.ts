import { describe, it, expect, vi } from 'vitest';
import {
  type SignatureResult,
  type SignatureVerifyOptions,
  verifyPluginSignature,
  SignatureStatus,
  createSignatureVerifier,
} from '../../plugins/signature-verify';

describe('signature-verify', () => {
  describe('verifyPluginSignature', () => {
    it('returns missing when plugin has no signature field', () => {
      const result = verifyPluginSignature({} as any);
      expect(result.status).toBe(SignatureStatus.Missing);
    });

    it('returns invalidFormat when signature is empty string', () => {
      const result = verifyPluginSignature({ signature: '' } as any);
      expect(result.status).toBe(SignatureStatus.InvalidFormat);
    });

    it('returns invalidFormat when signature is not a valid base64-like string', () => {
      const result = verifyPluginSignature({ signature: 'not-valid!!!' } as any);
      expect(result.status).toBe(SignatureStatus.InvalidFormat);
    });

    it('returns skipped when no publicKeys configured', () => {
      const result = verifyPluginSignature(
        { signature: 'a'.repeat(64) } as any,
        { publicKeys: [] },
      );
      expect(result.status).toBe(SignatureStatus.Skipped);
    });

    it('returns failed when signature does not match any public key', () => {
      const result = verifyPluginSignature(
        { signature: 'a'.repeat(64), id: 'fake-plugin' } as any,
        {
          publicKeys: [
            { keyId: 'test-key', publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A\n-----END PUBLIC KEY-----' },
          ],
          algorithm: 'Ed25519',
        },
      );
      // Without real crypto, we get failed for mismatched signature
      expect(result.status).toBe(SignatureStatus.Failed);
    });

    it('includes keyId in result when matched', () => {
      const result = verifyPluginSignature(
        { signature: 'a'.repeat(64), id: 'fake-plugin' } as any,
        {
          publicKeys: [
            { keyId: 'test-key', publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A\n-----END PUBLIC KEY-----' },
          ],
          algorithm: 'Ed25519',
        },
      );
      expect(result).toHaveProperty('keyId');
    });
  });

  describe('createSignatureVerifier', () => {
    it('returns a verifier function with preset options', () => {
      const verify = createSignatureVerifier({
        publicKeys: [],
        algorithm: 'Ed25519',
      });
      expect(typeof verify).toBe('function');

      const result = verify({} as any);
      expect(result.status).toBe(SignatureStatus.Missing);
    });
  });
});
