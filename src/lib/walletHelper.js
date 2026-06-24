import { ethers } from 'ethers';

export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const BASE_CHAIN_ID = '0x2105';

// ✅ تابع برای باز کردن MetaMask (حتی اگه قفل باشه)
export async function ensureWalletUnlocked() {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask not installed');
  }

  try {
    // این متد همیشه MetaMask رو باز می‌کنه اگه قفل باشه
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('Wallet connection rejected');
    }
    
    return accounts[0];
  } catch (err) {
    if (err.code === 4001) {
      throw new Error('Please approve wallet connection');
    }
    throw err;
  }
}

// ✅ تابع برای چک کردن موجودی USDC
export async function checkUSDCBalance(address) {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(USDC_ADDRESS, [
      'function balanceOf(address owner) view returns (uint256)'
    ], provider);
    
    const balance = await contract.balanceOf(address);
    return parseFloat(ethers.formatUnits(balance, 6));
  } catch (err) {
    console.error('Balance check error:', err);
    throw new Error('Could not check USDC balance');
  }
}

// ✅ تابع برای چک کردن network
export async function ensureBaseNetwork() {
  const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
  if (currentChain !== BASE_CHAIN_ID) {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_CHAIN_ID }]
    });
  }
}