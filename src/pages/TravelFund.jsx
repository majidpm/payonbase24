import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { ethers } from 'ethers';

export default function TravelFund() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('fund');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fund State
  const [funds, setFunds] = useState([]);
  const [showCreateFund, setShowCreateFund] = useState(false);
  const [newFund, setNewFund] = useState({ title: '', target_amount: '', wallet_address: '', description: '' });
  const [fundErrors, setFundErrors] = useState({});
  const [fundContributions, setFundContributions] = useState({});
  const [donateAmount, setDonateAmount] = useState({});
  const [donateName, setDonateName] = useState({});
  const [donateErrors, setDonateErrors] = useState({});
  const [account, setAccount] = useState('');
  const [donating, setDonating] = useState(false);

  // Split State
  const [splits, setSplits] = useState([]);
  const [showCreateSplit, setShowCreateSplit] = useState(false);
  const [newSplit, setNewSplit] = useState({ title: '', host_name: '' });
  const [splitErrors, setSplitErrors] = useState({});
  const [selectedSplit, setSelectedSplit] = useState(null);
  const [splitMembers, setSplitMembers] = useState([]);
  const [splitExpenses, setSplitExpenses] = useState([]);
  const [newMember, setNewMember] = useState({ name: '', pre_paid: '0' });
  const [memberErrors, setMemberErrors] = useState({});
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', paid_by: '' });
  const [expenseErrors, setExpenseErrors] = useState({});

  const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  function validateWalletAddress(address) {
    if (!address) return 'Wallet address is required';
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethRegex.test(address)) return 'Invalid Ethereum address';
    return '';
  }

  function validatePositiveNumber(value, fieldName) {
    if (!value && value !== 0) return `${fieldName} is required`;
    const num = parseFloat(value);
    if (isNaN(num)) return `${fieldName} must be a number`;
    if (num <= 0) return `${fieldName} must be greater than 0`;
    return '';
  }

  function validateRequired(value, fieldName, minLength = 1, maxLength = 200) {
    if (!value || !value.trim()) return `${fieldName} is required`;
    if (value.trim().length < minLength) return `${fieldName} must be at least ${minLength} characters`;
    if (value.trim().length > maxLength) return `${fieldName} must be less than ${maxLength} characters`;
    return '';
  }

  function validateFund() {
    const errors = {};
    const titleError = validateRequired(newFund.title, 'Title', 3, 100);
    if (titleError) errors.title = titleError;
    const amountError = validatePositiveNumber(newFund.target_amount, 'Target amount');
    if (amountError) errors.target_amount = amountError;
    const walletError = validateWalletAddress(newFund.wallet_address);
    if (walletError) errors.wallet_address = walletError;
    if (newFund.description && newFund.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
    setFundErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateDonate(fundId) {
    const errors = {};
    const amount = donateAmount[fundId];
    if (!amount) {
      errors.amount = 'Amount is required';
    } else {
      const num = parseFloat(amount);
      if (isNaN(num) || num <= 0) errors.amount = 'Amount must be greater than 0';
    }
    const name = donateName[fundId];
    if (name && name.length > 50) errors.name = 'Name must be less than 50 characters';
    setDonateErrors(prev => ({ ...prev, [fundId]: errors }));
    return Object.keys(errors).length === 0;
  }

  function validateSplit() {
    const errors = {};
    const titleError = validateRequired(newSplit.title, 'Title', 3, 100);
    if (titleError) errors.title = titleError;
    const hostError = validateRequired(newSplit.host_name, 'Host name', 2, 50);
    if (hostError) errors.host_name = hostError;
    setSplitErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateMember() {
    const errors = {};
    const nameError = validateRequired(newMember.name, 'Member name', 2, 50);
    if (nameError) errors.name = nameError;
    if (newMember.pre_paid !== '') {
      const num = parseFloat(newMember.pre_paid);
      if (isNaN(num) || num < 0) errors.pre_paid = 'Pre-paid must be 0 or greater';
    }
    setMemberErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateExpense() {
    const errors = {};
    const descError = validateRequired(newExpense.description, 'Description', 2, 200);
    if (descError) errors.description = descError;
    const amountError = validatePositiveNumber(newExpense.amount, 'Amount');
    if (amountError) errors.amount = amountError;
    if (!newExpense.paid_by) errors.paid_by = 'Please select who paid';
    setExpenseErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ============================================
  // LOAD DATA
  // ============================================

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      if (activeTab === 'fund') loadFunds();
      else loadSplits();
    }
  }, [userId, activeTab]);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
    setLoading(false);
  }

  async function loadFunds() {
    try {
      const { data: fundsData } = await supabase
        .from('travel_funds')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setFunds(fundsData || []);

      const contributionsMap = {};
      for (const fund of fundsData || []) {
        const { data: contribs } = await supabase
          .from('travel_contributions')
          .select('*')
          .eq('fund_id', fund.id)
          .order('created_at', { ascending: false });
        contributionsMap[fund.id] = contribs || [];
      }
      setFundContributions(contributionsMap);
    } catch (err) {
      console.error('Error loading funds:', err);
    }
  }

  async function createFund() {
    if (!validateFund()) return;
    try {
      const { error } = await supabase
        .from('travel_funds')
        .insert({
          user_id: userId,
          title: newFund.title.trim(),
          target_amount: parseFloat(newFund.target_amount),
          wallet_address: newFund.wallet_address.trim(),
          description: newFund.description?.trim() || null
        });
      if (error) throw error;
      setShowCreateFund(false);
      setNewFund({ title: '', target_amount: '', wallet_address: '', description: '' });
      setFundErrors({});
      await loadFunds();
    } catch (err) {
      alert('Failed to create fund: ' + err.message);
    }
  }

  async function deleteFund(id) {
    if (!window.confirm('Delete this fund? All contributions will be lost.')) return;
    try {
      await supabase.from('travel_funds').delete().eq('id', id);
      await loadFunds();
    } catch (err) {
      alert('Failed to delete fund');
    }
  }

  async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask');
      return;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts.length > 0) setAccount(accounts[0]);
  }

  async function donateToFund(fundId) {
    if (!validateDonate(fundId)) return;
    const amount = donateAmount[fundId];
    const name = donateName[fundId] || 'Anonymous';
    const fund = funds.find(f => f.id === fundId);
    if (!fund) return;

    setDonating(true);
    try {
      const BASE_CHAIN_ID = '0x2105';
      const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChain !== BASE_CHAIN_ID) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID }]
        });
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(USDC_ADDRESS, [
        'function transfer(address to, uint amount) returns (bool)'
      ], signer);

      const tx = await contract.transfer(
        fund.wallet_address,
        ethers.parseUnits(amount.toString(), 6)
      );
      const receipt = await tx.wait();

      await supabase
        .from('travel_contributions')
        .insert({
          fund_id: fundId,
          contributor_address: account,
          contributor_name: name,
          amount: parseFloat(amount),
          tx_hash: receipt.hash
        });

      setDonateAmount({ ...donateAmount, [fundId]: '' });
      setDonateName({ ...donateName, [fundId]: '' });
      setDonateErrors({});
      await loadFunds();
      alert('✅ Donation successful!');
    } catch (err) {
      console.error('Donation error:', err);
      alert('Donation failed: ' + (err.shortMessage || err.message));
    } finally {
      setDonating(false);
    }
  }

  async function loadSplits() {
    try {
      const { data: splitsData } = await supabase
        .from('travel_splits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setSplits(splitsData || []);
    } catch (err) {
      console.error('Error loading splits:', err);
    }
  }

  async function createSplit() {
    if (!validateSplit()) return;
    try {
      const { data, error } = await supabase
        .from('travel_splits')
        .insert({
          user_id: userId,
          title: newSplit.title.trim(),
          host_name: newSplit.host_name.trim()
        })
        .select()
        .single();
      if (error) throw error;
      setShowCreateSplit(false);
      setNewSplit({ title: '', host_name: '' });
      setSplitErrors({});
      await loadSplits();
      setSelectedSplit(data);
      setSplitMembers([]);
      setSplitExpenses([]);
    } catch (err) {
      alert('Failed to create split: ' + err.message);
    }
  }

  async function deleteSplit(id) {
    if (!window.confirm('Delete this split? All data will be lost.')) return;
    try {
      await supabase.from('travel_splits').delete().eq('id', id);
      setSplits(splits.filter(s => s.id !== id));
      if (selectedSplit?.id === id) {
        setSelectedSplit(null);
        setSplitMembers([]);
        setSplitExpenses([]);
      }
    } catch (err) {
      alert('Failed to delete split');
    }
  }

  async function loadSplitDetails(splitId) {
    try {
      const { data: members } = await supabase
        .from('travel_split_members')
        .select('*')
        .eq('split_id', splitId)
        .order('created_at', { ascending: true });
      setSplitMembers(members || []);

      const { data: expenses } = await supabase
        .from('travel_split_expenses')
        .select('*')
        .eq('split_id', splitId)
        .order('created_at', { ascending: true });
      setSplitExpenses(expenses || []);
    } catch (err) {
      console.error('Error loading split details:', err);
    }
  }

  async function addMember() {
    if (!validateMember()) return;
    try {
      const { data, error } = await supabase
        .from('travel_split_members')
        .insert({
          split_id: selectedSplit.id,
          name: newMember.name.trim(),
          pre_paid: parseFloat(newMember.pre_paid) || 0
        })
        .select()
        .single();
      if (error) throw error;
      setSplitMembers([...splitMembers, data]);
      setNewMember({ name: '', pre_paid: '0' });
      setMemberErrors({});
    } catch (err) {
      alert('Failed to add member');
    }
  }

  async function removeMember(id) {
    try {
      await supabase.from('travel_split_members').delete().eq('id', id);
      setSplitMembers(splitMembers.filter(m => m.id !== id));
    } catch (err) {
      alert('Failed to remove member');
    }
  }

  async function addExpense() {
    if (!validateExpense()) return;
    try {
      const { data, error } = await supabase
        .from('travel_split_expenses')
        .insert({
          split_id: selectedSplit.id,
          description: newExpense.description.trim(),
          amount: parseFloat(newExpense.amount),
          paid_by: newExpense.paid_by
        })
        .select()
        .single();
      if (error) throw error;
      setSplitExpenses([...splitExpenses, data]);
      setNewExpense({ description: '', amount: '', paid_by: '' });
      setExpenseErrors({});
    } catch (err) {
      alert('Failed to add expense');
    }
  }

  async function removeExpense(id) {
    try {
      await supabase.from('travel_split_expenses').delete().eq('id', id);
      setSplitExpenses(splitExpenses.filter(e => e.id !== id));
    } catch (err) {
      alert('Failed to remove expense');
    }
  }

  function calculateSplit() {
    const totalExpenses = splitExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const memberCount = splitMembers.length;
    if (memberCount === 0) return { totalExpenses, perPerson: 0, balances: [] };

    const perPerson = totalExpenses / memberCount;
    const memberPayments = {};
    splitMembers.forEach(m => { memberPayments[m.name] = 0; });
    splitExpenses.forEach(e => {
      if (memberPayments[e.paid_by] !== undefined) {
        memberPayments[e.paid_by] += parseFloat(e.amount);
      }
    });

    const balances = splitMembers.map(m => {
      const paid = memberPayments[m.name] || 0;
      const prePaid = parseFloat(m.pre_paid) || 0;
      const totalPaid = paid + prePaid;
      const balance = totalPaid - perPerson;
      return {
        name: m.name,
        paid,
        prePaid,
        totalPaid,
        balance,
        owes: balance < 0 ? Math.abs(balance) : 0,
        receives: balance > 0 ? balance : 0
      };
    });

    return { totalExpenses, perPerson, balances };
  }

  // ============================================
  // INPUT STYLES
  // ============================================

  const inputClass = (hasError) => `w-full px-3 sm:px-4 py-2.5 rounded-lg border focus:outline-none text-sm transition-colors ${
    hasError
      ? 'border-red-500 focus:border-red-600 ring-2 ring-red-500/20'
      : isDark
        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
  }`;

  const inputClassSmall = (hasError) => `flex-1 min-w-0 px-3 py-2 rounded-lg border focus:outline-none text-xs sm:text-sm transition-colors ${
    hasError
      ? 'border-red-500 focus:border-red-600 ring-2 ring-red-500/20'
      : isDark
        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600'
  }`;

  const errorText = (msg) => msg ? (
    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
      <span>⚠️</span> {msg}
    </p>
  ) : null;

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950 text-white' : 'bg-blue-50 text-gray-900'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full overflow-x-hidden ${isDark ? 'bg-gray-950' : 'bg-blue-50'}`}>
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        <div className="w-full max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-5 sm:mb-8">
            <h1 className={`text-xl sm:text-2xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ✈️ TravelFund
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Fund your trips and split expenses with friends
            </p>
          </div>

          {/* Tabs */}
          <div className={`rounded-xl sm:rounded-2xl p-1.5 border mb-5 sm:mb-8 inline-flex w-full sm:w-auto ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
            <button
              onClick={() => setActiveTab('fund')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-base transition-all ${
                activeTab === 'fund'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💰 Travel Fund
            </button>
            <button
              onClick={() => setActiveTab('split')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-base transition-all ${
                activeTab === 'split'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🧮 Split Expenses
            </button>
          </div>

          {/* ============================================ */}
          {/* FUND TAB */}
          {/* ============================================ */}
          {activeTab === 'fund' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Your Travel Funds
                </h2>
                <button
                  onClick={() => {
                    setShowCreateFund(true);
                    setFundErrors({});
                  }}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition"
                >
                  + New Fund
                </button>
              </div>

              {/* Create Fund Modal */}
              {showCreateFund && (
                <div className={`rounded-xl sm:rounded-2xl p-4 border mb-5 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
                  <h3 className={`text-base sm:text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Create New Travel Fund
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Fund Title (e.g., Dubai Trip 2026)"
                        value={newFund.title}
                        onChange={(e) => setNewFund({ ...newFund, title: e.target.value })}
                        className={inputClass(!!fundErrors.title)}
                      />
                      {errorText(fundErrors.title)}
                    </div>

                    <div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Target Amount (USD)"
                        value={newFund.target_amount}
                        onChange={(e) => setNewFund({ ...newFund, target_amount: e.target.value })}
                        className={inputClass(!!fundErrors.target_amount)}
                      />
                      {errorText(fundErrors.target_amount)}
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Wallet Address (0x...)"
                        value={newFund.wallet_address}
                        onChange={(e) => setNewFund({ ...newFund, wallet_address: e.target.value })}
                        className={`${inputClass(!!fundErrors.wallet_address)} font-mono text-xs`}
                      />
                      {errorText(fundErrors.wallet_address)}
                      <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Must be a valid Ethereum address on Base Network
                      </p>
                    </div>

                    <div>
                      <textarea
                        placeholder="Description (optional, max 500 characters)"
                        value={newFund.description}
                        onChange={(e) => setNewFund({ ...newFund, description: e.target.value })}
                        rows={3}
                        className={`${inputClass(!!fundErrors.description)} resize-none`}
                      />
                      {errorText(fundErrors.description)}
                      <p className={`text-[10px] mt-1 text-right ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {newFund.description?.length || 0}/500
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={createFund}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-sm transition"
                      >
                        Create Fund
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateFund(false);
                          setNewFund({ title: '', target_amount: '', wallet_address: '', description: '' });
                          setFundErrors({});
                        }}
                        className={`px-5 py-2.5 rounded-lg font-medium text-sm transition ${
                          isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Funds List */}
              {funds.length === 0 ? (
                <div className={`rounded-xl p-6 sm:p-8 border text-center ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
                  <div className="text-4xl sm:text-5xl mb-3">🌍</div>
                  <h3 className={`text-base sm:text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    No Travel Funds Yet
                  </h3>
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Create your first travel fund and start collecting contributions!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {funds.map((fund) => {
                    const contributions = fundContributions[fund.id] || [];
                    const totalCollected = contributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
                    const percentage = Math.min((totalCollected / fund.target_amount) * 100, 100);
                    const isComplete = totalCollected >= fund.target_amount;
                    const donateError = donateErrors[fund.id]?.amount;

                    return (
                      <div key={fund.id} className={`rounded-xl border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
                        <div className="p-4">
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-base sm:text-lg font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {fund.title}
                              </h3>
                              {fund.description && (
                                <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {fund.description}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => deleteFund(fund.id)}
                              className={`flex-shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                                isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'
                              }`}
                            >
                              ️
                            </button>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex justify-between mb-1.5">
                              <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Progress</span>
                              <span className={`text-xs font-bold ${isComplete ? 'text-green-500' : isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className={`p-2.5 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                              <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Collected</p>
                              <p className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                ${totalCollected.toFixed(2)}
                              </p>
                            </div>
                            <div className={`p-2.5 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                              <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Target</p>
                              <p className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                ${fund.target_amount.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Complete Message */}
                          {isComplete && (
                            <div className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-green-900/30 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
                              <p className={`text-center text-xs font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                                🎉 Fund Complete! You're ready to travel!
                              </p>
                            </div>
                          )}

                          {/* Public Link */}
                          {fund.slug && (
                            <div className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                              <p className={`text-[10px] mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>🔗 Public Fund Link</p>
                              <div className="flex gap-2">
                                <div className={`flex-1 px-3 py-2 rounded-lg font-mono text-[10px] truncate ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700 border border-gray-200'}`}>
                                  {window.location.origin}/trip/{fund.slug}
                                </div>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/trip/${fund.slug}`);
                                    alert('Link copied!');
                                  }}
                                  className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium text-xs ${isDark ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'}`}
                                >
                                  
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Wallet Address */}
                          <div className={`p-2.5 rounded-lg mb-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <p className={`text-[10px] mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Fund Wallet Address</p>
                            <p className={`font-mono text-[10px] break-all ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {fund.wallet_address}
                            </p>
                          </div>

                          {/* Donate Section */}
                          {!isComplete && (
                            <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                Contribute to this fund
                              </p>
                              <div className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  placeholder="Your name (optional)"
                                  value={donateName[fund.id] || ''}
                                  onChange={(e) => setDonateName({ ...donateName, [fund.id]: e.target.value })}
                                  className={inputClassSmall(false)}
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Amount"
                                  value={donateAmount[fund.id] || ''}
                                  onChange={(e) => setDonateAmount({ ...donateAmount, [fund.id]: e.target.value })}
                                  className={`${inputClassSmall(!!donateError)}`}
                                />
                                {!account ? (
                                  <button
                                    onClick={connectWallet}
                                    className={`w-full px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-900 text-white'}`}
                                  >
                                    Connect
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => donateToFund(fund.id)}
                                    disabled={donating}
                                    className="w-full px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                                  >
                                    {donating ? '...' : 'Donate'}
                                  </button>
                                )}
                              </div>
                              {errorText(donateError)}
                              {donateErrors[fund.id]?.name && errorText(donateErrors[fund.id].name)}
                            </div>
                          )}

                          {/* Recent Contributions */}
                          {contributions.length > 0 && (
                            <div className="mt-3">
                              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Recent Contributions ({contributions.length})
                              </p>
                              <div className="space-y-2">
                                {contributions.slice(0, 3).map((c) => (
                                  <div key={c.id} className={`flex justify-between items-center p-2.5 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                    <div className="min-w-0 flex-1">
                                      <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {c.contributor_name || 'Anonymous'}
                                      </p>
                                      <p className={`text-[10px] font-mono truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {c.contributor_address.substring(0, 6)}...{c.contributor_address.substring(38)}
                                      </p>
                                    </div>
                                    <p className={`font-bold text-xs flex-shrink-0 ml-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                      ${parseFloat(c.amount).toFixed(2)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* SPLIT TAB */}
          {/* ============================================ */}
          {activeTab === 'split' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Expense Splits
                </h2>
                <button
                  onClick={() => {
                    setShowCreateSplit(true);
                    setSplitErrors({});
                  }}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition"
                >
                  + New Split
                </button>
              </div>

              {/* Create Split Modal */}
              {showCreateSplit && (
                <div className={`rounded-xl p-4 border mb-5 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
                  <h3 className={`text-base sm:text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Create New Split
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Split Title (e.g., Family Dinner)"
                        value={newSplit.title}
                        onChange={(e) => setNewSplit({ ...newSplit, title: e.target.value })}
                        className={inputClass(!!splitErrors.title)}
                      />
                      {errorText(splitErrors.title)}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Host Name (e.g., Mom)"
                        value={newSplit.host_name}
                        onChange={(e) => setNewSplit({ ...newSplit, host_name: e.target.value })}
                        className={inputClass(!!splitErrors.host_name)}
                      />
                      {errorText(splitErrors.host_name)}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={createSplit}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-sm transition"
                      >
                        Create Split
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateSplit(false);
                          setNewSplit({ title: '', host_name: '' });
                          setSplitErrors({});
                        }}
                        className={`px-5 py-2.5 rounded-lg font-medium text-sm transition ${
                          isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Split Selection */}
              {!selectedSplit && splits.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {splits.map((split) => (
                    <div
                      key={split.id}
                      onClick={() => {
                        setSelectedSplit(split);
                        loadSplitDetails(split.id);
                      }}
                      className={`rounded-xl p-4 border cursor-pointer transition-all ${
                        isDark ? 'bg-gray-900 border-gray-800 hover:border-blue-500' : 'bg-white border-blue-100 hover:border-blue-300'
                      }`}
                    >
                      <h3 className={`text-sm sm:text-base font-bold mb-1 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {split.title}
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Host: {split.host_name}
                      </p>
                      <p className={`text-[10px] mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(split.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {!selectedSplit && splits.length === 0 && (
                <div className={`rounded-xl p-6 sm:p-8 border text-center ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
                  <div className="text-4xl sm:text-5xl mb-3">🧮</div>
                  <h3 className={`text-base sm:text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    No Splits Yet
                  </h3>
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Create your first expense split to track shared costs!
                  </p>
                </div>
              )}

              {/* Split Details */}
              {selectedSplit && (
                <div>
                  <button
                    onClick={() => {
                      setSelectedSplit(null);
                      setSplitMembers([]);
                      setSplitExpenses([]);
                    }}
                    className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ← Back to Splits
                  </button>

                  <div className={`rounded-xl p-4 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'}`}>
                    <div className="flex justify-between items-start gap-2 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-base sm:text-lg font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {selectedSplit.title}
                        </h3>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Host: {selectedSplit.host_name}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteSplit(selectedSplit.id)}
                        className={`flex-shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                          isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Add Member */}
                    <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Add Members
                      </h4>
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder="Member name"
                          value={newMember.name}
                          onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                          className={inputClassSmall(!!memberErrors.name)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Pre-paid"
                          value={newMember.pre_paid}
                          onChange={(e) => setNewMember({ ...newMember, pre_paid: e.target.value })}
                          className={inputClassSmall(!!memberErrors.pre_paid)}
                        />
                        <button
                          onClick={addMember}
                          className="w-full px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </div>
                      {errorText(memberErrors.name)}
                      {errorText(memberErrors.pre_paid)}
                    </div>

                    {/* Members List */}
                    {splitMembers.length > 0 && (
                      <div className="mb-4">
                        <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Members ({splitMembers.length})
                        </h4>
                        <div className="space-y-2">
                          {splitMembers.map((m) => (
                            <div key={m.id} className={`flex justify-between items-center p-2.5 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {m.name}
                                </p>
                                <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Pre-paid: ${parseFloat(m.pre_paid).toFixed(2)}
                                </p>
                              </div>
                              <button
                                onClick={() => removeMember(m.id)}
                                className={`flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                                  isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'
                                }`}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Expense */}
                    {splitMembers.length > 0 && (
                      <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Add Expense
                        </h4>
                        <div className="space-y-2">
                          <div>
                            <input
                              type="text"
                              placeholder="Description (e.g., Hotel, Food)"
                              value={newExpense.description}
                              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                              className={inputClassSmall(!!expenseErrors.description)}
                            />
                            {errorText(expenseErrors.description)}
                          </div>
                          <div className="flex flex-col gap-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Amount"
                              value={newExpense.amount}
                              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                              className={inputClassSmall(!!expenseErrors.amount)}
                            />
                            <select
                              value={newExpense.paid_by}
                              onChange={(e) => setNewExpense({ ...newExpense, paid_by: e.target.value })}
                              className={inputClassSmall(!!expenseErrors.paid_by)}
                            >
                              <option value="">Paid by...</option>
                              {splitMembers.map((m) => (
                                <option key={m.id} value={m.name}>{m.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={addExpense}
                              className="w-full px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Add
                            </button>
                          </div>
                          {errorText(expenseErrors.amount)}
                          {errorText(expenseErrors.paid_by)}
                        </div>
                      </div>
                    )}

                    {/* Expenses List */}
                    {splitExpenses.length > 0 && (
                      <div className="mb-4">
                        <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Expenses ({splitExpenses.length})
                        </h4>
                        <div className="space-y-2">
                          {splitExpenses.map((e) => (
                            <div key={e.id} className={`flex justify-between items-center p-2.5 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {e.description}
                                </p>
                                <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Paid by: {e.paid_by}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <p className={`font-bold text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                  ${parseFloat(e.amount).toFixed(2)}
                                </p>
                                <button
                                  onClick={() => removeExpense(e.id)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                                    isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'
                                  }`}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Calculation Results */}
                    {splitMembers.length > 0 && splitExpenses.length > 0 && (
                      <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                        <h4 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          📊 Split Calculation
                        </h4>
                        {(() => {
                          const { totalExpenses, perPerson, balances } = calculateSplit();
                          return (
                            <>
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                                  <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Expenses</p>
                                  <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    ${totalExpenses.toFixed(2)}
                                  </p>
                                </div>
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                                  <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Per Person</p>
                                  <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    ${perPerson.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {balances.map((b) => (
                                  <div key={b.name} className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                                    <div className="flex justify-between items-center mb-1.5">
                                      <p className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {b.name}
                                      </p>
                                      {b.balance > 0 ? (
                                        <span className="text-green-500 font-bold text-xs flex-shrink-0 ml-2">
                                          +${b.receives.toFixed(2)}
                                        </span>
                                      ) : b.balance < 0 ? (
                                        <span className="text-red-500 font-bold text-xs flex-shrink-0 ml-2">
                                          -${b.owes.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className={`font-bold text-xs flex-shrink-0 ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                          Settled
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[10px]">
                                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                        Paid: ${b.paid.toFixed(2)}
                                      </span>
                                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                        Pre-paid: ${b.prePaid.toFixed(2)}
                                      </span>
                                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                        Total: ${b.totalPaid.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}