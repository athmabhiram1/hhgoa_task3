import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Contract, JsonRpcProvider, keccak256, toUtf8Bytes } from "ethers";

const root = resolve(import.meta.dirname, "..");
const imagePath = resolve(root, "cr7.jpg");
const reportPath = resolve(root, ".omo", "reports", "e2e-receipts.json");
const contractPath = resolve(root, "public", "contract.json");
const startedAt = new Date().toISOString();

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function jsonResponse(response, label) {
  const body = await response.json().catch(() => ({}));
  assert(response.ok, `${label} failed (${response.status}): ${JSON.stringify(body)}`);
  return body;
}

async function multipart(url, bytes) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/jpeg" }), "cr7.jpg");
  return fetch(url, { method: "POST", body: form });
}

const bytes = await readFile(imagePath);
const health = await jsonResponse(await fetch("http://127.0.0.1:8000/health"), "backend health");
assert(health.ok === true, "backend health did not report ok=true");

const backendDetection = await jsonResponse(await multipart("http://127.0.0.1:8000/detect", bytes), "backend detect");
assert(backendDetection.embedding?.length === 512, "backend embedding must contain 512 values");
assert(/^[0-9a-f]{16}$/i.test(backendDetection.phash_hex), "backend phash_hex must be 16 hex characters");
assert(/^data:image\/[^;]+;base64,/.test(backendDetection.crop_b64), "backend crop_b64 must be an image data URL");
assert(typeof backendDetection.quality === "number", "backend detection quality must be numeric");
assert(/^0x[0-9a-f]{64}$/i.test(backendDetection.canonical_sha), "backend canonical_sha must be bytes32 hex");

const appDetection = await jsonResponse(await multipart("http://127.0.0.1:3000/api/detect", bytes), "app detect");
assert(appDetection.embedding?.length === 512, "app embedding must contain 512 values");
assert(/^[0-9a-f]{16}$/i.test(appDetection.phash_hex), "app phash_hex must be 16 hex characters");
assert(/^data:image\/[^;]+;base64,/.test(appDetection.crop_b64), "app crop_b64 must be an image data URL");
assert(typeof appDetection.quality === "number", "app detection quality must be numeric");
assert(/^0x[0-9a-f]{64}$/i.test(appDetection.canonical_sha), "app canonical_sha must be bytes32 hex");

const lens = await jsonResponse(await multipart("http://127.0.0.1:3000/api/lens", bytes), "lens");
assert(lens.search_id, "lens search_id must be present");
assert(Object.hasOwn(lens, "pagesWithMatchingImages"), "lens pagesWithMatchingImages key must be present");

const visionResponse = await multipart("http://127.0.0.1:3000/api/vision", bytes);
assert(visionResponse.status !== 404, "vision endpoint is missing");
const vision = await visionResponse.json().catch(() => ({}));

const contractConfig = JSON.parse(await readFile(contractPath, "utf8"));
assert(contractConfig.address, "public/contract.json must contain an address");
const provider = new JsonRpcProvider("http://127.0.0.1:8545");
const signer = await provider.getSigner(0);
const contract = new Contract(
  contractConfig.address,
  [
    "function anchor(bytes32 sha, uint64 phash, string url, string cid, bytes32 prev, bytes32 consent)",
    "function verify(bytes32 sha) view returns (bool exists, uint64 phash, string url, bytes32 prev, uint64 ts)",
  ],
  signer,
);
const sha = appDetection.canonical_sha;
const phash = BigInt(`0x${appDetection.phash_hex}`);
const tx = await contract.anchor(sha, phash, "http://127.0.0.1:3000", "local-e2e", "0x" + "00".repeat(32), keccak256(toUtf8Bytes("local-e2e-consent")));
const mined = await tx.wait();
const verified = await contract.verify(sha);
const shaBad = "0x" + "ff".repeat(32);
const tamperCheck = await contract.verify(shaBad);
assert(verified[0] === true, "anchored digest must verify on chain");
assert(tamperCheck[0] === false, "tampered digest must fail verification");

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(
  reportPath,
  JSON.stringify(
    {
      search_id: lens.search_id,
      txHash: tx.hash,
      blockNumber: mined.blockNumber,
      digests: { canonical_sha: sha, tampered_sha: shaBad },
      verified: verified[0] === true,
      tamperDetected: tamperCheck[0] === false,
      vision: { status: visionResponse.status, body: vision },
      startedAt,
      completedAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ search_id: lens.search_id, txHash: tx.hash, blockNumber: mined.blockNumber, verified: true, tamperDetected: true }));
