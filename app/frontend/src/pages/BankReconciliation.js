"import { useState, useEffect } from 'react';
import { getBankAccounts, createBankAccount, getBankTransactions, createBankTransaction, reconcileTransaction, formatCurrency, formatDate } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Plus, Landmark, CheckCircle, Circle, Search, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BankReconciliation() {
  const { canEdit } = useAuth();
  const [banks, setBanks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [transDialogOpen, setTransDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bankForm, setBankForm] = useState({
    account_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    opening_balance: ''
  });
  const [transForm, setTransForm] = useState({
    bank_account_id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    transaction_type: 'deposit',
    amount: '',
    reference: ''
  });

  useEffect(() => {
    fetchBanks();
  }, []);

  useEffect(() => {
    if (selectedBank) {
      fetchTransactions(selectedBank.id);
    }
  }, [selectedBank]);

  const fetchBanks = async () => {
    try {
      const response = await getBankAccounts();
      setBanks(response.data);
      if (response.data.length > 0) {
        setSelectedBank(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch banks:', error);
      toast.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (bankId) => {
    try {
      const response = await getBankTransactions({ bank_account_id: bankId });
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const handleCreateBank = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...bankForm,
        opening_balance: parseFloat(bankForm.opening_balance) || 0
      };
      await createBankAccount(payload);
      toast.success('Bank account added');
      setBankDialogOpen(false);
      resetBankForm();
      fetchBanks();
    } catch (error) {
      toast.error('Failed to add bank account');
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...transForm,
        bank_account_id: selectedBank.id,
        amount: parseFloat(transForm.amount)
      };
      await createBankTransaction(payload);
      toast.success('Transaction added');
      setTransDialogOpen(false);
      resetTransForm();
      fetchTransactions(selectedBank.id);
      fetchBanks();
    } catch (error) {
      toast.error('Failed to add transaction');
    }
  };

  const handleReconcile = async (transId) => {
    try {
      await reconcileTransaction(transId);
      toast.success('Transaction reconciled');
      fetchTransactions(selectedBank.id);
    } catch (error) {
      toast.error('Failed to reconcile');
    }
  };

  const resetBankForm = () => {
    setBankForm({
      account_name: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      opening_balance: ''
    });
  };

  const resetTransForm = () => {
    setTransForm({
      bank_account_id: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      transaction_type: 'deposit',
      amount: '',
      reference: ''
    });
  };

  const filteredTransactions = transactions.filter(t =>
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const reconciledCount = transactions.filter(t => t.is_reconciled).length;
  const unreconciledCount = transactions.length - reconciledCount;

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"spinner\" />
      </div>
    );
  }

  return (
    <div className=\"space-y-6 animate-fade-in\" data-testid=\"bank-reconciliation-page\">
      <div className=\"flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4\">
        <div>
          <h1 className=\"text-2xl font-bold text-slate-900\">Bank Reconciliation</h1>
          <p className=\"text-slate-500 mt-1\">Reconcile your bank statements</p>
        </div>
        {canEdit() && (
          <div className=\"flex gap-2\">
            <Button variant=\"outline\" onClick={() => setBankDialogOpen(true)} data-testid=\"add-bank-btn\">
              <Plus className=\"w-4 h-4 mr-2\" />
              Add Bank
            </Button>
            {selectedBank && (
              <Button onClick={() => setTransDialogOpen(true)} data-testid=\"add-bank-trans-btn\">
                <Plus className=\"w-4 h-4 mr-2\" />
                Add Transaction
              </Button>
            )}
          </div>
        )}
      </div>

      {banks.length === 0 ? (
        <Card>
          <CardContent className=\"p-0\">
            <div className=\"empty-state\">
              <Landmark className=\"empty-state-icon\" />
              <p>No bank accounts found</p>
              <p className=\"text-sm mt-1\">Add a bank account to start reconciliation</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Bank Accounts */}
          <div className=\"flex gap-4 overflow-x-auto pb-2\">
            {banks.map((bank) => (
              <Card
                key={bank.id}
                className={`min-w-[280px] cursor-pointer transition-all ${selectedBank?.id === bank.id ? 'ring-2 ring-slate-900' : 'hover:shadow-md'}`}
                onClick={() => setSelectedBank(bank)}
                data-testid={`bank-card-${bank.id}`}
              >
                <CardContent className=\"p-5\">
                  <div className=\"flex items-center gap-3 mb-3\">
                    <div className=\"w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center\">
                      <Landmark className=\"w-5 h-5 text-slate-600\" />
                    </div>
                    <div>
                      <h3 className=\"font-medium text-slate-900\">{bank.account_name}</h3>
                      <p className=\"text-xs text-slate-500\">{bank.bank_name}</p>
                    </div>
                  </div>
                  <p className=\"text-xs text-slate-500 font-mono mb-2\">
                    A/C: {bank.account_number}
                  </p>
                  <div className=\"flex justify-between items-center pt-3 border-t border-slate-100\">
                    <span className=\"text-xs text-slate-500\">Balance</span>
                    <span className={`font-mono font-medium ${bank.current_balance >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                      {formatCurrency(bank.current_balance)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedBank && (
            <>
              {/* Reconciliation Summary */}
              <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
                <Card>
                  <CardContent className=\"p-5\">
                    <p className=\"text-sm text-slate-500\">Total Transactions</p>
                    <p className=\"text-2xl font-bold text-slate-900\">{transactions.length}</p>
                  </CardContent>
                </Card>
                <Card className=\"bg-teal-50 border-teal-200\">
                  <CardContent className=\"p-5\">
                    <p className=\"text-sm text-teal-700\">Reconciled</p>
                    <p className=\"text-2xl font-bold text-teal-900\">{reconciledCount}</p>
                  </CardContent>
                </Card>
                <Card className=\"bg-amber-50 border-amber-200\">
                  <CardContent className=\"p-5\">
                    <p className=\"text-sm text-amber-700\">Unreconciled</p>
                    <p className=\"text-2xl font-bold text-amber-900\">{unreconciledCount}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Search */}
              <div className=\"relative max-w-sm\">
                <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400\" />
                <Input
                  placeholder=\"Search transactions...\"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className=\"pl-9\"
                />
              </div>

              {/* Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle className=\"text-lg\">Bank Transactions</CardTitle>
                </CardHeader>
                <CardContent className=\"p-0\">
                  {filteredTransactions.length > 0 ? (
                    <div className=\"overflow-x-auto\">
                      <table className=\"data-table\">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Reference</th>
                            <th>Type</th>
                            <th className=\"text-right\">Amount</th>
                            <th>Status</th>
                            {canEdit() && <th></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTransactions.map((trans) => (
                            <tr key={trans.id} data-testid={`bank-trans-${trans.id}`}>
                              <td className=\"font-mono text-xs\">{formatDate(trans.date)}</td>
                              <td>{trans.description}</td>
                              <td className=\"font-mono text-xs\">{trans.reference || '-'}</td>
                              <td>
                                <span className={`flex items-center gap-1 ${trans.transaction_type === 'deposit' ? 'text-teal-600' : 'text-red-600'}`}>
                                  {trans.transaction_type === 'deposit' ? (
                                    <ArrowDownCircle className=\"w-4 h-4\" />
                                  ) : (
                                    <ArrowUpCircle className=\"w-4 h-4\" />
                                  )}
                                  {trans.transaction_type}
                                </span>
                              </td>
                              <td className={`text-right font-mono ${trans.transaction_type === 'deposit' ? 'text-teal-600' : 'text-red-600'}`}>
                                {trans.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(trans.amount)}
                              </td>
                              <td>
                                {trans.is_reconciled ? (
                                  <span className=\"flex items-center gap-1 text-teal-600\">
                                    <CheckCircle className=\"w-4 h-4\" />
                                    Reconciled
                                  </span>
                                ) : (
                                  <span className=\"flex items-center gap-1 text-amber-600\">
                                    <Circle className=\"w-4 h-4\" />
                                    Pending
                                  </span>
                                )}
                              </td>
                              {canEdit() && (
                                <td>
                                  {!trans.is_reconciled && (
                                    <Button
                                      variant=\"outline\"
                                      size=\"sm\"
                                      onClick={() => handleReconcile(trans.id)}
                                    >
                                      Reconcile
                                    </Button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className=\"empty-state\">
                      <Landmark className=\"empty-state-icon\" />
                      <p>No transactions found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* Add Bank Dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className=\"sm:max-w-[500px]\">
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBank} className=\"space-y-4\">
            <div className=\"grid grid-cols-2 gap-4\">
              <div className=\"space-y-2\">
                <Label>Account Name</Label>
                <Input
                  placeholder=\"e.g., Main Business Account\"
                  value={bankForm.account_name}
                  onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })}
                  required
                  data-testid=\"bank-name-input\"
                />
              </div>
              <div className=\"space-y-2\">
                <Label>Bank Name</Label>
                <Input
                  placeholder=\"e.g., HDFC Bank\"
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className=\"grid grid-cols-2 gap-4\">
              <div className=\"space-y-2\">
                <Label>Account Number</Label>
                <Input
                  placeholder=\"Enter account number\"
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                  required
                />
              </div>
              <div className=\"space-y-2\">
                <Label>IFSC Code</Label>
                <Input
                  placeholder=\"e.g., HDFC0001234\"
                  value={bankForm.ifsc_code}
                  onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value })}
                />
              </div>
            </div>

            <div className=\"space-y-2\">
              <Label>Opening Balance (₹)</Label>
              <Input
                type=\"number\"
                step=\"0.01\"
                placeholder=\"0.00\"
                value={bankForm.opening_balance}
                onChange={(e) => setBankForm({ ...bankForm, opening_balance: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type=\"button\" variant=\"outline\" onClick={() => setBankDialogOpen(false)}>
                Cancel
              </Button>
              <Button type=\"submit\" data-testid=\"bank-save-btn\">
                Add Bank Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={transDialogOpen} onOpenChange={setTransDialogOpen}>
        <DialogContent className=\"sm:max-w-[500px]\">
          <DialogHeader>
            <DialogTitle>Add Bank Transaction</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTransaction} className=\"space-y-4\">
            <div className=\"grid grid-cols-2 gap-4\">
              <div className=\"space-y-2\">
                <Label>Date</Label>
                <Input
                  type=\"date\"
                  value={transForm.date}
                  onChange={(e) => setTransForm({ ...transForm, date: e.target.value })}
                  required
                />
              </div>
              <div className=\"space-y-2\">
                <Label>Type</Label>
                <Select value={transForm.transaction_type} onValueChange={(value) => setTransForm({ ...transForm, transaction_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=\"deposit\">Deposit</SelectItem>
                    <SelectItem value=\"withdrawal\">Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className=\"space-y-2\">
              <Label>Description</Label>
              <Input
                placeholder=\"Transaction description\"
                value={transForm.description}
                onChange={(e) => setTransForm({ ...transForm, description: e.target.value })}
                required
                data-testid=\"bank-trans-description\"
              />
            </div>

            <div className=\"grid grid-cols-2 gap-4\">
              <div className=\"space-y-2\">
                <Label>Amount (₹)</Label>
                <Input
                  type=\"number\"
                  step=\"0.01\"
                  placeholder=\"0.00\"
                  value={transForm.amount}
                  onChange={(e) => setTransForm({ ...transForm, amount: e.target.value })}
                  required
                  data-testid=\"bank-trans-amount\"
                />
              </div>
              <div className=\"space-y-2\">
                <Label>Reference</Label>
                <Input
                  placeholder=\"e.g., CHQ-123\"
                  value={transForm.reference}
                  onChange={(e) => setTransForm({ ...transForm, reference: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type=\"button\" variant=\"outline\" onClick={() => setTransDialogOpen(false)}>
                Cancel
              </Button>
              <Button type=\"submit\" data-testid=\"bank-trans-save-btn\">
                Add Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"