import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

const { ethers } = await network.create();
const ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";

// ponytail: 4 tests only — deploy, anchor, duplicate guard, tamper re-verify (incl emoji canary for RFC8785)
describe("FaceAnchor", async function () {

  // canonical helper mirrors frontend canonical.ts JCS (string-only) — test vector includes astral
  function jcs(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  it("deploys", async () => {
    const f = await ethers.getContractFactory("FaceAnchor");
    const c = await f.deploy();
    await c.waitForDeployment();
    assert.ok(await c.getAddress());
  });

  it("anchors and verifies", async () => {
    const [signer] = await ethers.getSigners();
    const f = await ethers.getContractFactory("FaceAnchor");
    const c = await f.deploy();
    await c.waitForDeployment();

    const manifest = { url: "https://x.com/alice/photo", ts: "2026-09-03T12:00:00Z", phash: "1010", canon_version: "canon_v1" };
    const sha = keccak256(toUtf8Bytes(jcs(manifest)));
    await (await c.anchor(sha, 3, manifest.url, "", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000")).wait();
    const [exists] = await c.verify(sha);
    assert.equal(exists, true);
  });

  it("prevents duplicate anchor", async () => {
    const f = await ethers.getContractFactory("FaceAnchor");
    const c = await f.deploy();
    await c.waitForDeployment();
    const sha = keccak256(toUtf8Bytes("dup"));
    await (await c.anchor(sha, 0, "https://a.com", "", ZERO, ZERO)).wait();
    await assert.rejects(() => c.anchor(sha, 0, "https://a.com", "", ZERO, ZERO), /exists/);
  });

  it("tamper: altered URL fails verify", async () => {
    const f = await ethers.getContractFactory("FaceAnchor");
    const c = await f.deploy();
    await c.waitForDeployment();
    const good = { url: "https://x.com/alice/photo", canon_version: "canon_v1" };
    const bad = { url: "https://x.com/alice/photp", canon_version: "canon_v1" }; // one char flip
    const shaGood = keccak256(toUtf8Bytes(jcs(good)));
    const shaBad = keccak256(toUtf8Bytes(jcs(bad)));
    await (await c.anchor(shaGood, 3, good.url, "", ZERO, ZERO)).wait();
    const [existsBad] = await c.verify(shaBad);
    assert.equal(existsBad, false, "tampered sha must not be found");
    // emoji canary
    const emoji = { "a": "x", "😀": "y" };
    assert.doesNotThrow(() => keccak256(toUtf8Bytes(jcs(emoji))));
  });
});
