"import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Helper to format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

// Helper to format date
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Dashboard
export const getDashboardData = () => axios.get(`${API}/reports/dashboard`);

// Accounts
export const getAccounts = (accountType) => {
  const params = accountType ? { account_type: accountType } : {};
  return axios.get(`${API}/accounts`, { params });
};
export const createAccount = (data) => axios.post(`${API}/accounts`, data);
export const updateAccount = (id, data) => axios.put(`${API}/accounts/${id}`, data);
export const deleteAccount = (id) => axios.delete(`${API}/accounts/${id}`);
export const seedAccounts = () => axios.post(`${API}/seed-accounts`);

// Transactions
export const getTransactions = (params) => axios.get(`${API}/transactions`, { params });
export const createTransaction = (data) => axios.post(`${API}/transactions`, data);
export const updateTransaction = (id, data) => axios.put(`${API}/transactions/${id}`, data);
export const deleteTransaction = (id) => axios.delete(`${API}/transactions/${id}`);

// Journal Entries
export const getJournalEntries = (params) => axios.get(`${API}/journal-entries`, { params });
export const createJournalEntry = (data) => axios.post(`${API}/journal-entries`, data);
export const postJournalEntry = (id) => axios.post(`${API}/journal-entries/${id}/post`);

// Parties (Customers/Vendors)
export const getParties = (partyType) => {
  const params = partyType ? { party_type: partyType } : {};
  return axios.get(`${API}/parties`, { params });
};
export const createParty = (data) => axios.post(`${API}/parties`, data);
export const getParty = (id) => axios.get(`${API}/parties/${id}`);

// Invoices
export const getInvoices = (params) => axios.get(`${API}/invoices`, { params });
export const createInvoice = (data) => axios.post(`${API}/invoices`, data);
export const recordPayment = (id, amount) => axios.post(`${API}/invoices/${id}/payment`, null, { params: { amount } });

// Bank Accounts
export const getBankAccounts = () => axios.get(`${API}/bank-accounts`);
export const createBankAccount = (data) => axios.post(`${API}/bank-accounts`, data);

// Bank Transactions
export const getBankTransactions = (params) => axios.get(`${API}/bank-transactions`, { params });
export const createBankTransaction = (data) => axios.post(`${API}/bank-transactions`, data);
export const reconcileTransaction = (id) => axios.post(`${API}/bank-transactions/${id}/reconcile`);

// Reports
export const getTrialBalance = (asOfDate) => axios.get(`${API}/reports/trial-balance`, { params: { as_of_date: asOfDate } });
export const getBalanceSheet = (asOfDate) => axios.get(`${API}/reports/balance-sheet`, { params: { as_of_date: asOfDate } });
export const getProfitLoss = (startDate, endDate) => axios.get(`${API}/reports/profit-loss`, { params: { start_date: startDate, end_date: endDate } });
export const getCashFlow = (startDate, endDate) => axios.get(`${API}/reports/cash-flow`, { params: { start_date: startDate, end_date: endDate } });
export const getGeneralLedger = (accountId, startDate, endDate) => axios.get(`${API}/reports/general-ledger`, { params: { account_id: accountId, start_date: startDate, end_date: endDate } });

// Settings
export const getCompanySettings = () => axios.get(`${API}/settings/company`);
export const updateCompanySettings = (data) => axios.put(`${API}/settings/company`, data);
export const getGSTSettings = () => axios.get(`${API}/settings/gst`);
export const updateGSTSettings = (data) => axios.put(`${API}/settings/gst`, null, { params: data });

// Users (Admin)
export const getUsers = () => axios.get(`${API}/users`);
export const updateUserRole = (userId, role) => axios.put(`${API}/users/${userId}/role`, null, { params: { role } });
export const updateUserStatus = (userId, isActive) => axios.put(`${API}/users/${userId}/status`, null, { params: { is_active: isActive } });
"