import { ethers } from 'ethers'

export async function verifyTransaction(txHash, expectedRecipient, expectedAmount) {
  try {
    // 1. گرفتن اطلاعات تراکنش از Base RPC
    const txResponse = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 1
      })
    })

    const txData = await txResponse.json()

    if (!txData.result) {
      return { valid: false, reason: 'Transaction not found on blockchain' }
    }

    const tx = txData.result

    // 2. چک کردن اینکه تراکنش confirmed شده
    if (!tx.blockNumber) {
      return { valid: false, reason: 'Transaction not confirmed yet' }
    }

    // 3. گرفتن transaction receipt برای بررسی logs
    const receiptResponse = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 2
      })
    })

    const receiptData = await receiptResponse.json()

    if (!receiptData.result) {
      return { valid: false, reason: 'Transaction receipt not found' }
    }

    const receipt = receiptData.result

    // 4. چک کردن status (1 = success, 0 = failed)
    if (receipt.status !== '0x1') {
      return { valid: false, reason: 'Transaction failed' }
    }

    // 5. پیدا کردن Transfer event در logs
    const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    const TRANSFER_EVENT_TOPIC = ethers.id('Transfer(address,address,uint256)')

    const transferLog = receipt.logs.find(log => {
      return (
        log.address.toLowerCase() === USDC_ADDRESS.toLowerCase() &&
        log.topics[0] === TRANSFER_EVENT_TOPIC
      )
    })

    if (!transferLog) {
      return { valid: false, reason: 'No USDC transfer found in transaction' }
    }

    // 6. Decode کردن Transfer event
    const from = ethers.getAddress('0x' + transferLog.topics[1].slice(26))
    const to = ethers.getAddress('0x' + transferLog.topics[2].slice(26))
    const amount = BigInt(transferLog.data)

    // 7. چک کردن recipient
    if (to.toLowerCase() !== expectedRecipient.toLowerCase()) {
      return { 
        valid: false, 
        reason: `Wrong recipient. Expected ${expectedRecipient}, got ${to}` 
      }
    }

    // 8. تبدیل amount از wei به USDC (6 decimals)
    const amountInUSDC = Number(amount) / 1e6

    // 9. چک کردن amount (با tolerance 0.01 برای rounding errors)
    if (Math.abs(amountInUSDC - parseFloat(expectedAmount)) > 0.01) {
      return { 
        valid: false, 
        reason: `Amount mismatch. Expected ${expectedAmount}, got ${amountInUSDC}` 
      }
    }

    // ✅ همه چک‌ها پاس شد
    return {
      valid: true,
      from: from,
      to: to,
      amount: amountInUSDC,
      blockNumber: parseInt(tx.blockNumber, 16),
      txHash: txHash
    }

  } catch (err) {
    console.error('Verification error:', err)
    return { valid: false, reason: 'Verification failed: ' + err.message }
  }
}