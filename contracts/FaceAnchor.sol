// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// ponytail: stores hash only, not raw face — hash + phash + prev lineage + consentHash on cheap local, sufficient for custody
contract FaceAnchor {
    struct Anchor {
        bytes32 sha;
        uint64 phash;
        string url;
        string cid;
        bytes32 prev;
        uint64 ts;
        address consenter;
        bytes32 consentHash;
    }

    mapping(bytes32 => Anchor) public anchors;
    event Anchored(bytes32 indexed sha, uint64 phash, string url, bytes32 prev, address consenter);

    function anchor(bytes32 sha, uint64 phash, string calldata url, string calldata cid, bytes32 prev, bytes32 consent) external {
        require(anchors[sha].ts == 0, "exists");
        anchors[sha] = Anchor(sha, phash, url, cid, prev, uint64(block.timestamp), msg.sender, consent);
        emit Anchored(sha, phash, url, prev, msg.sender);
    }

    function verify(bytes32 sha) external view returns (bool exists, uint64 phash, string memory url, bytes32 prev, uint64 ts) {
        Anchor memory a = anchors[sha];
        return (a.ts != 0, a.phash, a.url, a.prev, a.ts);
    }
}
