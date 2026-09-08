// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DocumentRegistry
 * @dev Smart contract untuk menyimpan dan memverifikasi hash dokumen akademik.
 *
 * Contract ini HANYA menyimpan data yang diperlukan untuk verifikasi:
 * - Document hash (SHA-256 dari file dokumen)
 * - Issuer address (Ethereum address penerbit)
 * - Timestamp penerbitan
 * - Status aktif/revoked
 *
 * TIDAK menyimpan data pribadi atau isi dokumen.
 *
 * Menggunakan OpenZeppelin Ownable untuk memastikan hanya institusi (owner)
 * yang dapat menerbitkan dan mencabut dokumen.
 */
contract DocumentRegistry is Ownable {
    // ============================================================
    //                         STRUCTS
    // ============================================================

    struct Document {
        bytes32 documentHash; // SHA-256 hash dari file dokumen
        address issuer; // Address yang menerbitkan dokumen
        uint256 issuedAt; // Timestamp penerbitan (block.timestamp)
        bool isActive; // true = valid, false = revoked
        bool exists; // Flag untuk cek apakah dokumen pernah didaftarkan
    }

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    /// @dev Mapping dari verification ID ke Document struct
    mapping(string => Document) private documents;

    /// @dev Total jumlah dokumen yang pernah diterbitkan
    uint256 public totalDocuments;

    /// @dev Total jumlah dokumen yang di-revoke
    uint256 public totalRevoked;

    // ============================================================
    //                          EVENTS
    // ============================================================

    /// @dev Emitted ketika dokumen baru diterbitkan
    event DocumentIssued(
        string indexed docId,
        bytes32 documentHash,
        address indexed issuer,
        uint256 issuedAt
    );

    /// @dev Emitted ketika dokumen di-revoke
    event DocumentRevoked(
        string indexed docId,
        address indexed revokedBy,
        uint256 revokedAt
    );

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    /**
     * @dev Constructor, sets deployer as owner.
     * Owner merepresentasikan institusi pendidikan.
     */
    constructor() Ownable(msg.sender) {}

    // ============================================================
    //                     WRITE FUNCTIONS
    // ============================================================

    /**
     * @dev Menerbitkan dokumen baru ke blockchain.
     * Hanya owner (institusi) yang dapat memanggil fungsi ini.
     *
     * @param docId Verification ID unik untuk dokumen
     * @param docHash SHA-256 hash dari file dokumen (dalam format bytes32)
     *
     * Requirements:
     * - Dokumen dengan docId yang sama belum pernah didaftarkan
     * - docHash tidak boleh kosong (bytes32(0))
     */
    function issueDocument(
        string calldata docId,
        bytes32 docHash
    ) external onlyOwner {
        require(!documents[docId].exists, "Document already exists");
        require(docHash != bytes32(0), "Invalid document hash");
        require(bytes(docId).length > 0, "Document ID cannot be empty");

        documents[docId] = Document({
            documentHash: docHash,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            isActive: true,
            exists: true
        });

        totalDocuments++;

        emit DocumentIssued(docId, docHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Mencabut (revoke) dokumen yang sudah diterbitkan.
     * Hanya owner (institusi) yang dapat memanggil fungsi ini.
     * Dokumen yang di-revoke tidak dapat di-issue ulang.
     *
     * @param docId Verification ID dokumen yang akan di-revoke
     *
     * Requirements:
     * - Dokumen harus sudah terdaftar
     * - Dokumen belum di-revoke sebelumnya
     */
    function revokeDocument(string calldata docId) external onlyOwner {
        require(documents[docId].exists, "Document does not exist");
        require(documents[docId].isActive, "Document already revoked");

        documents[docId].isActive = false;
        totalRevoked++;

        emit DocumentRevoked(docId, msg.sender, block.timestamp);
    }

    // ============================================================
    //                      READ FUNCTIONS
    // ============================================================

    /**
     * @dev Mengambil data lengkap dokumen dari blockchain.
     * Fungsi ini bersifat public view — siapa saja dapat memanggil.
     *
     * @param docId Verification ID dokumen
     * @return documentHash Hash dokumen
     * @return issuer Address penerbit
     * @return issuedAt Timestamp penerbitan
     * @return isActive Status aktif/revoked
     * @return exists Apakah dokumen terdaftar
     */
    function getDocument(
        string calldata docId
    )
        external
        view
        returns (
            bytes32 documentHash,
            address issuer,
            uint256 issuedAt,
            bool isActive,
            bool exists
        )
    {
        Document memory doc = documents[docId];
        return (
            doc.documentHash,
            doc.issuer,
            doc.issuedAt,
            doc.isActive,
            doc.exists
        );
    }

    /**
     * @dev Memverifikasi apakah hash dokumen cocok dengan yang tersimpan di blockchain.
     * Mengembalikan true HANYA jika hash cocok DAN dokumen masih aktif (tidak di-revoke).
     *
     * @param docId Verification ID dokumen
     * @param hash Hash yang ingin diverifikasi
     * @return bool true jika hash cocok dan dokumen aktif
     */
    function verifyHash(
        string calldata docId,
        bytes32 hash
    ) external view returns (bool) {
        Document memory doc = documents[docId];
        if (!doc.exists) return false;
        return doc.documentHash == hash && doc.isActive;
    }

    /**
     * @dev Cek apakah dokumen valid (terdaftar dan aktif).
     *
     * @param docId Verification ID dokumen
     * @return bool true jika dokumen terdaftar dan aktif
     */
    function isDocumentValid(
        string calldata docId
    ) external view returns (bool) {
        return documents[docId].exists && documents[docId].isActive;
    }
}
