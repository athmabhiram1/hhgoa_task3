import { Contract, JsonRpcProvider, BrowserProvider, TypedDataEncoder, keccak256, toUtf8Bytes } from "ethers";
import { jcs } from "./canonical";

const ABI = [
  "function anchor(bytes32 sha, uint64 phash, string url, string cid, bytes32 prev, bytes32 consent) external",
  "function verify(bytes32 sha) external view returns (bool exists, uint64 phash, string url, bytes32 prev, uint64 ts)",
  "event Anchored(bytes32 indexed sha, uint64 phash, string url, bytes32 prev, address consenter)"
];

export const CONSENT_TYPES = {
  Consent: [
    { name: "faceHash", type: "bytes32" },
    { name: "purpose", type: "string" },
    { name: "ts", type: "uint64" },
  ],
};

export function getDomain(chainId: number, verifyingContract: string) {
  return { name: "HHGoa-Face", version: "1", chainId, verifyingContract } as const;
}

export function consentHashFor(chainId: number, verifyingContract: string, value: { faceHash: string; purpose: string; ts: bigint }) {
  return TypedDataEncoder.hash(getDomain(chainId, verifyingContract), CONSENT_TYPES, value);
}

export async function signConsent(signer: any, chainId: number, verifyingContract: string, value: { faceHash: string; purpose: string; ts: bigint }) {
  return signer.signTypedData(getDomain(chainId, verifyingContract), CONSENT_TYPES, value);
}

export function verifyConsent(domain: any, types: any, value: any, sig: string) {
  // ethers v6: verifyTypedData
  const { verifyTypedData } = require("ethers");
  return verifyTypedData(domain, types, value, sig);
}

export function canonicalShaFor(manifest: Record<string, unknown>): string {
  const s = jcs(manifest);
  return keccak256(toUtf8Bytes(s));
}

export function getContract(address: string, signerOrProvider: any) {
  return new Contract(address, ABI, signerOrProvider);
}

export function getProvider(rpcUrl = "http://127.0.0.1:8545") {
  return new JsonRpcProvider(rpcUrl);
}

export function getBrowserProvider() {
  if (typeof window === "undefined" || !(window as any).ethereum) throw new Error("no window.ethereum");
  return new BrowserProvider((window as any).ethereum);
}
