import hre from "hardhat";
import { expect } from "chai";

// Buat network connection (Hardhat 3 style)
const { ethers } = await hre.network.create();

describe("DocumentRegistry", function () {
  let registry;
  let owner;
  let otherAccount;

  // Sample data untuk testing
  const sampleDocId = "DOC-2026-001";
  // Simulasi SHA-256 hash (32 bytes)
  const sampleHash = ethers.keccak256(ethers.toUtf8Bytes("sample-document-content"));
  const anotherHash = ethers.keccak256(ethers.toUtf8Bytes("another-document-content"));

  beforeEach(async function () {
    // Deploy contract baru sebelum setiap test
    [owner, otherAccount] = await ethers.getSigners();
    const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
    registry = await DocumentRegistry.deploy();
    await registry.waitForDeployment();
  });

  // ============================================================
  //                      DEPLOYMENT
  // ============================================================

  describe("Deployment", function () {
    it("Should set the deployer as owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("Should initialize totalDocuments to 0", async function () {
      expect(await registry.totalDocuments()).to.equal(0);
    });

    it("Should initialize totalRevoked to 0", async function () {
      expect(await registry.totalRevoked()).to.equal(0);
    });
  });

  // ============================================================
  //                    ISSUE DOCUMENT
  // ============================================================

  describe("Issue Document", function () {
    it("Should issue a document successfully", async function () {
      const tx = await registry.issueDocument(sampleDocId, sampleHash);
      await tx.wait();

      const doc = await registry.getDocument(sampleDocId);
      expect(doc.documentHash).to.equal(sampleHash);
      expect(doc.issuer).to.equal(owner.address);
      expect(doc.isActive).to.be.true;
      expect(doc.exists).to.be.true;
      expect(doc.issuedAt).to.be.greaterThan(0);
    });

    it("Should increment totalDocuments", async function () {
      await registry.issueDocument(sampleDocId, sampleHash);
      expect(await registry.totalDocuments()).to.equal(1);

      await registry.issueDocument("DOC-2026-002", anotherHash);
      expect(await registry.totalDocuments()).to.equal(2);
    });

    it("Should emit DocumentIssued event", async function () {
      await expect(registry.issueDocument(sampleDocId, sampleHash))
        .to.emit(registry, "DocumentIssued");
    });

    it("Should reject duplicate document ID", async function () {
      await registry.issueDocument(sampleDocId, sampleHash);

      await expect(
        registry.issueDocument(sampleDocId, anotherHash)
      ).to.be.revertedWith("Document already exists");
    });

    it("Should reject empty hash", async function () {
      await expect(
        registry.issueDocument(sampleDocId, ethers.ZeroHash)
      ).to.be.revertedWith("Invalid document hash");
    });

    it("Should reject empty document ID", async function () {
      await expect(
        registry.issueDocument("", sampleHash)
      ).to.be.revertedWith("Document ID cannot be empty");
    });

    it("Should reject non-owner", async function () {
      await expect(
        registry.connect(otherAccount).issueDocument(sampleDocId, sampleHash)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  // ============================================================
  //                    REVOKE DOCUMENT
  // ============================================================

  describe("Revoke Document", function () {
    beforeEach(async function () {
      // Issue dokumen terlebih dahulu
      await registry.issueDocument(sampleDocId, sampleHash);
    });

    it("Should revoke a document successfully", async function () {
      await registry.revokeDocument(sampleDocId);

      const doc = await registry.getDocument(sampleDocId);
      expect(doc.isActive).to.be.false;
      expect(doc.exists).to.be.true; // Masih exist, tapi tidak aktif
    });

    it("Should increment totalRevoked", async function () {
      await registry.revokeDocument(sampleDocId);
      expect(await registry.totalRevoked()).to.equal(1);
    });

    it("Should emit DocumentRevoked event", async function () {
      await expect(registry.revokeDocument(sampleDocId))
        .to.emit(registry, "DocumentRevoked");
    });

    it("Should reject revoking non-existent document", async function () {
      await expect(
        registry.revokeDocument("NON-EXISTENT")
      ).to.be.revertedWith("Document does not exist");
    });

    it("Should reject revoking already revoked document", async function () {
      await registry.revokeDocument(sampleDocId);

      await expect(
        registry.revokeDocument(sampleDocId)
      ).to.be.revertedWith("Document already revoked");
    });

    it("Should reject non-owner", async function () {
      await expect(
        registry.connect(otherAccount).revokeDocument(sampleDocId)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  // ============================================================
  //                     VERIFY HASH
  // ============================================================

  describe("Verify Hash", function () {
    beforeEach(async function () {
      await registry.issueDocument(sampleDocId, sampleHash);
    });

    it("Should return true for matching hash on active document", async function () {
      expect(await registry.verifyHash(sampleDocId, sampleHash)).to.be.true;
    });

    it("Should return false for non-matching hash", async function () {
      expect(await registry.verifyHash(sampleDocId, anotherHash)).to.be.false;
    });

    it("Should return false for revoked document", async function () {
      await registry.revokeDocument(sampleDocId);
      expect(await registry.verifyHash(sampleDocId, sampleHash)).to.be.false;
    });

    it("Should return false for non-existent document", async function () {
      expect(await registry.verifyHash("NON-EXISTENT", sampleHash)).to.be.false;
    });
  });

  // ============================================================
  //                   IS DOCUMENT VALID
  // ============================================================

  describe("Is Document Valid", function () {
    it("Should return true for active document", async function () {
      await registry.issueDocument(sampleDocId, sampleHash);
      expect(await registry.isDocumentValid(sampleDocId)).to.be.true;
    });

    it("Should return false for revoked document", async function () {
      await registry.issueDocument(sampleDocId, sampleHash);
      await registry.revokeDocument(sampleDocId);
      expect(await registry.isDocumentValid(sampleDocId)).to.be.false;
    });

    it("Should return false for non-existent document", async function () {
      expect(await registry.isDocumentValid("NON-EXISTENT")).to.be.false;
    });
  });

  // ============================================================
  //                    GET DOCUMENT
  // ============================================================

  describe("Get Document", function () {
    it("Should return correct data for existing document", async function () {
      await registry.issueDocument(sampleDocId, sampleHash);

      const doc = await registry.getDocument(sampleDocId);
      expect(doc.documentHash).to.equal(sampleHash);
      expect(doc.issuer).to.equal(owner.address);
      expect(doc.isActive).to.be.true;
      expect(doc.exists).to.be.true;
    });

    it("Should return exists=false for non-existent document", async function () {
      const doc = await registry.getDocument("NON-EXISTENT");
      expect(doc.exists).to.be.false;
      expect(doc.documentHash).to.equal(ethers.ZeroHash);
    });
  });

  // ============================================================
  //                   OWNERSHIP
  // ============================================================

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      await registry.transferOwnership(otherAccount.address);
      expect(await registry.owner()).to.equal(otherAccount.address);
    });

    it("New owner should be able to issue documents", async function () {
      await registry.transferOwnership(otherAccount.address);

      await expect(
        registry.connect(otherAccount).issueDocument(sampleDocId, sampleHash)
      ).to.not.be.revert(ethers);
    });

    it("Previous owner should NOT be able to issue after transfer", async function () {
      await registry.transferOwnership(otherAccount.address);

      await expect(
        registry.issueDocument(sampleDocId, sampleHash)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });
});
