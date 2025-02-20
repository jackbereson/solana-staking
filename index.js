const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  TransactionInstruction
} = require('@solana/web3.js');
const { serialize, deserialize } = require('borsh');
const fs = require('fs');

// Kết nối đến Solana (có thể dùng "https://api.devnet.solana.com" nếu test trên devnet)
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Địa chỉ Smart Contract của bạn
const PROGRAM_ID = new PublicKey("Dff8uDiJavctfuuqn4JvWpUTEKRevhbBz6CrXzRx43VH");

// Đọc ví từ file (hoặc có thể dùng Phantom Wallet)
const WALLET_PATH = "/Users/jackbereson/.config/solana/id.json"; // Đổi thành đường dẫn keypair JSON của bạn
const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_PATH)));
const payer = Keypair.fromSecretKey(secretKey);

console.log('payer',payer.publicKey.toBase58())

/**
 * Chuyển đổi số thành buffer 8 bytes (u64)
 */
function numberToBuffer(num) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(num));
  return buffer;
}

/**
* Gửi giao dịch đến Smart Contract để cập nhật hoặc tạo tài khoản mới
* @param {number} userId - ID của user
* @param {number} amount - Số tiền muốn nạp vào tài khoản
*/
async function processDeposit(userId, amount) {
  console.log(`🔹 Gửi giao dịch đến Smart Contract với ID: ${userId}, Amount: ${amount}...`);

  // Chuyển đổi dữ liệu thành buffer
  const idBuffer = numberToBuffer(userId);
  const amountBuffer = numberToBuffer(amount);
  const instructionData = Buffer.concat([idBuffer, amountBuffer]);

  // Tạo instruction để gửi đến smart contract
  const transaction = new Transaction().add(
      new TransactionInstruction({
          keys: [], // Không cần khóa tài khoản nào
          programId: PROGRAM_ID,
          data: instructionData, // Gửi dữ liệu id và amount
      })
  );

  // Ký và gửi transaction
  try {
      const txHash = await sendAndConfirmTransaction(connection, transaction, [payer]);
      console.log(`✅ Giao dịch thành công! Transaction Hash: ${txHash}`);
  } catch (error) {
      console.error("❌ Lỗi khi gửi transaction:", error);
  }
}

/**
 * Lấy thông tin tài khoản User từ blockchain
 * @param {number} userId - ID của user
 */
async function getUser(userId) {
  console.log(`🔹 Đang lấy dữ liệu tài khoản cho User ID: ${userId}...`);

  // Tạo PublicKey của tài khoản user (PDA - Program Derived Address)
  const [userPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("user_account"), numberToBuffer(userId)],
      PROGRAM_ID
  );

  // Lấy thông tin tài khoản từ blockchain
  const accountInfo = await connection.getAccountInfo(userPDA);
  if (!accountInfo) {
      console.log("⚠️ Không tìm thấy tài khoản!");
      return null;
  }

  // Giải mã dữ liệu từ blockchain bằng Borsh
  const userAccount = deserialize(UserAccountSchema, UserAccount, accountInfo.data);

  console.log(`✅ User ID: ${userAccount.id}, Balance: ${userAccount.balance}`);
  return userAccount;
}

// 📌 Gọi thử
(async () => {
  await processDeposit(1, 500);  // Nạp 500 lamports vào User ID 1
  await getUser(1);              // Lấy thông tin User ID 1
})();