"import { useState, useEffect } from 'react';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getAccounts, formatCurrency, formatDate } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Plus, ArrowDownCircle, MoreVertical, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Income() {
  const { canEdit, canDelete } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    transaction_type: 'income',
    account_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference_number: '',
    category: '',
    gst_applicable: false,
    gst_rate: 0,
    gst_amount: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transRes, accRes] = await Promise.all([
        getTransactions({ transaction_type: 'income' }),
        getAccounts('revenue')
      ]);
      setTransactions(transRes.data);
      setAccounts(accRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        gst_rate: parseFloat(formData.gst_rate) || 0,
        gst_amount: formData.gst_applicable ? (parseFloat(formData.amount) * parseFloat(formData.gst_rate) / 100) : 0
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, payload);
        toast.success('Income updated successfully');
      } else {
        await createTransaction(payload);
        toast.success('Income added successfully');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save income');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this income entry?')) return;
    try {
      await deleteTransaction(id);
      toast.success('Income deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete income');
    }
  };

  const openEditDialog = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      transaction_type: 'income',
      account_id: transaction.account_id,
      amount: transaction.amount.toString(),
      date: transaction.date,
      description: transaction.description || '',
      reference_number: transaction.reference_number || '',
      category: transaction.category || '',
      gst_applicable: transaction.gst_applicable,
      gst_rate: transaction.gst_rate,
      gst_amount: transaction.gst_amount
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setFormData({
      transaction_type: 'income',
      account_id: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference_number: '',
      category: '',
      gst_applicable: false,
      gst_rate: 0,
      gst_amount: 0
    });
  };

  const filteredTransactions = transactions.filter(t => 
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalIncome = transactions.reduce((sum, t) => sum + (t.net_amount || 0), 0);

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"spinner\" />
      </div>
    );
  }

  return (
    <div className=\"space-y-6 animate-fade-in\" data-testid=\"income-page\">
      <div className=\"flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4\">
        <div>
          <h1 className=\"text-2xl font-bold text-slate-900\">Income</h1>
          <p className=\"text-slate-500 mt-1\">Manage your income entries</p>
        </div>
        {canEdit() && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid=\"add-income-btn\">
            <Plus className=\"w-4 h-4 mr-2\" />
            Add Income
          </Button>
        )}
      </div>

      {/* Summary Card */}
      <Card className=\"bg-teal-50 border-teal-200\">
        <CardContent className=\"p-6\">
          <div className=\"flex items-center gap-4\">
            <div className=\"w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center\">
              <ArrowDownCircle className=\"w-6 h-6 text-teal-600\" />
            </div>
            <div>
              <p className=\"text-sm text-teal-700 font-medium\">Total Income</p>
              <p className=\"text-2xl font-bold text-teal-900 font-mono\">{formatCurrency(totalIncome)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className=\"relative max-w-sm\">
        <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400\" />
        <Input
          placeholder=\"Search income...\"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className=\"pl-9\"
          data-testid=\"income-search-input\"
        />
      </div>

      {/* Transactions Table */}
      <Card>
        <CardContent className=\"p-0\">
          {filteredTransactions.length > 0 ? (
            <div className=\"overflow-x-auto\">
              <table className=\"data-table\">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Reference</th>
                    <th className=\"text-right\">Amount</th>
                    <th className=\"text-right\">GST</th>
                    <th className=\"text-right\">Total</th>
                    {canEdit() && <th className=\"w-10\"></th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((trans) => (
                    <tr key={trans.id} data-testid={`income-row-${trans.id}`}>
                      <td className=\"font-mono text-xs\">{formatDate(trans.date)}</td>
                      <td>{trans.description || '-'}</td>
                      <td>
                        {trans.category && (
                          <span className=\"badge badge-info\">{trans.category}</span>
                        )}
                      </td>
                      <td className=\"font-mono text-xs\">{trans.reference_number || '-'}</td>
                      <td className=\"text-right font-mono\">{formatCurrency(trans.amount)}</td>
                      <td className=\"text-right font-mono text-slate-500\">{formatCurrency(trans.gst_amount)}</td>
                      <td className=\"text-right font-mono font-medium text-teal-600\">{formatCurrency(trans.net_amount)}</td>
                      {canEdit() && (
                        <td>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant=\"ghost\" size=\"sm\" className=\"h-8 w-8 p-0\">
                                <MoreVertical className=\"w-4 h-4\" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align=\"end\">
                              <DropdownMenuItem onClick={() => openEditDialog(trans)}>
                                <Pencil className=\"w-4 h-4 mr-2\" />
                                Edit
                              </DropdownMenuItem>
                              {canDelete() && (
                                <DropdownMenuItem onClick={() => handleDelete(trans.id)} className=\"text-red-600\">
                                  <Trash2 className=\"w-4 h-4 mr-2\" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className=\"empty-state\">
              <ArrowDownCircle className=\"empty-state-icon\" />
              <p>No income entries found</p>
              <p className=\"text-sm mt-1\">Add your first income entry to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className=\"sm:max-w-[500px]\">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Edit Income' : 'Add Income'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className=\"space-y-4\">
            <div className=\"grid grid-cols-2 gap-4\">
              <div className=\"space-y-2\">
                <Label>Date</Label>
                <Input
                  type=\"date\"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  data-testid=\"income-date-input\"
                />
              </div>
              <div className=\"space-y-2\">
                <Label>Amount (₹)</Label>
                <Input
                  type=\"number\"
                  step=\"0.01\"
                  placeholder=\"0.00\"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  data-testid=\"income-amount-input\"
                />
              </div>
            </div>

            <div className=\"space-y-2\">
              <Label>Account</Label>
              <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
                <SelectTrigger data-testid=\"income-account-select\">
                  <SelectValue placeholder=\"Select account\" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className=\"space-y-2\">
              <Label>Description</Label>
              <Textarea
                placeholder=\"Enter description\"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid=\"income-description-input\"
              />
            </div>

            <div className=\"grid grid-cols-2 gap-4\">
              <div className=\"space-y-2\">
                <Label>Category</Label>
                <Input
                  placeholder=\"e.g., Sales, Services\"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  data-testid=\"income-category-input\"
                />
              </div>
              <div className=\"space-y-2\">
                <Label>Reference Number</Label>
                <Input
                  placeholder=\"e.g., INV-001\"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  data-testid=\"income-reference-input\"
                />
              </div>
            </div>

            <div className=\"flex items-center gap-4 p-3 bg-slate-50 rounded-lg\">
              <label className=\"flex items-center gap-2 cursor-pointer\">
                <input
                  type=\"checkbox\"
                  checked={formData.gst_applicable}
                  onChange={(e) => setFormData({ ...formData, gst_applicable: e.target.checked })}
                  className=\"rounded border-slate-300\"
                />
                <span className=\"text-sm\">GST Applicable</span>
              </label>
              {formData.gst_applicable && (
                <div className=\"flex items-center gap-2\">
                  <Label className=\"text-sm\">Rate %</Label>
                  <Input
                    type=\"number\"
                    className=\"w-20\"
                    value={formData.gst_rate}
                    onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type=\"button\" variant=\"outline\" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type=\"submit\" data-testid=\"income-save-btn\">
                {editingTransaction ? 'Update' : 'Add'} Income
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"