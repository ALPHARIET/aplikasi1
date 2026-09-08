const crypto = require('crypto');
const fs = require('fs');

const HashService = {
  /**
   * Menghasilkan hash SHA-256 dari sebuah file.
   * @param {string} filePath - Path ke file di disk.
   * @returns {Promise<string>} Hex representation dari hash.
   */
  hashFile: (filePath) => {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('error', err => reject(err));
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(`0x${hash.digest('hex')}`));
    });
  },

  /**
   * Menghasilkan hash SHA-256 dari sebuah string.
   */
  hashString: (data) => {
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `0x${hash}`;
  }
};

module.exports = HashService;
