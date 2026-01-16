"import { useState, useEffect } from 'react';
import { getJournalEntries, createJournalEntry, postJournalEntry, getAccounts, formatCurrency, formatDate } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
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
import { Plus, FileText, Trash2, Check, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function JournalEntries() {
  const { canEdit } = useAuth();
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    narration: '',
    reference_number: '',
    line_items: [
      { account_id: '', entry_type: 'debit', amount: '', narration: '' },
      { account_id: '', entry_type: 'credit', amount: '', narration: '' }
    ]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [entriesRes, accRes] = await Promise.all([
        getJournalEntries(),
        getAccounts()
      ]);
      setEntries(entriesRes.data);
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
    
    const lineItems = formData.line_items.filter(item => item.account_id && item.amount);
    if (lineItems.length < 2) {
      toast.error('At least two line items are required');
      return;
    }

    const totalDebit = lineItems.filter(i => i.entry_type === 'debit').reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
    const totalCredit = lineItems.filter(i => i.entry_type === 'credit').reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error(`Debits (${formatCurrency(totalDebit)}) must equal credits (${formatCurrency(totalCredit)})`);
      return;
    }

    try {
      const payload = {
        ...formData,
        line_items: lineItems.map(item => ({
          ...item,
          amount: parseFloat(item.amount)
        }))
      };
      
      await createJournalEntry(payload);
      toast.success('Journal entry created');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create journal entry');
    }
  };

  const handlePost = async (id) => {
    try {
      await postJournalEntry(id);
      toast.success('Journal entry posted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to post entry');
    }
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { account_id: '', entry_type: 'debit', amount: '', narration: '' }]
    });
  };

  const removeLineItem = (index) => {
    if (formData.line_items.length <= 2) return;
    const newItems = formData.line_items.filter((_, i) => i !== index);
    setFormData({ ...formData, line_items: newItems });
  };

  const updateLineItem = (index, field, value) => {
    const newItems = [...formData.line_items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, line_items: newItems });
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      narration: '',
      reference_number: '',
      line_items: [
        { account_id: '', entry_type: 'debit', amount: '', narration: '' },
        { account_id: '', entry_type: 'credit', amount: '', narration: '' }
      ]
    });
  };

  const filteredEntries = entries.filter(e =>
    e.narration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.entry_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAccountName = (accountId) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc ? `${acc.account_code} - ${acc.account_name}` : accountId;
  };

  const totalDebit = formData.line_items.filter(i => i.entry_type === 'debit').reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
  const totalCredit = formData.line_items.filter(i => i.entry_type === 'credit').reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"spinner\" />
      </div>
    );
  }

  return (
    <div className=\"space-y-6 animate-fade-in\" data-testid=\"journal-entries-page\">
      <div className=\"flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4\">
        <div>
          <h1 className=\"text-2xl font-bold text-slate-900\">Journal Entries</h1>
          <p className=\"text-slate-500 mt-1\">Double-entry bookkeeping transactions</p>
        </div>
        {canEdit() && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid=\"add-journal-btn\">
            <Plus className=\"w-4 h-4 mr-2\" />
            New Journal Entry
          </Button>
        )}
      </div>

      {/* Search */}
      <div className=\"relative max-w-sm\">
        <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400\" />
        <Input
          placeholder=\"Search entries...\"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className=\"pl-9\"
          data-testid=\"journal-search-input\"
        />
      </div>

      {/* Entries List */}
      <Card>
        <CardContent className=\"p-0\">
          {filteredEntries.length > 0 ? (
            <div className=\"divide-y divide-slate-100\">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className=\"hover:bg-slate-50/50\" data-testid={`journal-entry-${entry.id}`}>
                  <div 
                    className=\"flex items-center justify-between p-4 cursor-pointer\"
                    onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  >
                    <div className=\"flex items-center gap-4\">
                      {expandedEntry === entry.id ? (
                        <ChevronDown className=\"w-4 h-4 text-slate-400\" />
                      ) : (
                        <ChevronRight className=\"w-4 h-4 text-slate-400\" />
                      )}
                      <div>
                        <p className=\"font-medium text-slate-900\">{entry.entry_number}</p>
                        <p className=\"text-sm text-slate-500\">{entry.narration}</p>
                      </div>
                    </div>
                    <div className=\"flex items-center gap-4\">
                      <div className=\"text-right\">
                        <p className=\"font-mono font-medium\">{formatCurrency(entry.total_debit)}</p>
                        <p className=\"text-xs text-slate-500\">{formatDate(entry.date)}</p>
                      </div>
                      <span className={`badge ${entry.is_posted ? 'badge-success' : 'badge-warning'}`}>
                        {entry.is_posted ? 'Posted' : 'Draft'}
                      </span>
                      {!entry.is_posted && canEdit() && (
                        <Button 
                          size=\"sm\" 
                          variant=\"outline\"
                          onClick={(e) => { e.stopPropagation(); handlePost(entry.id); }}
                        >
                          <Check className=\"w-4 h-4 mr-1\" />
                          Post
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {expandedEntry === entry.id && (
                    <div className=\"px-4 pb-4 ml-8\">
                      <table className=\"w-full text-sm\">
                        <thead>
                          <tr className=\"text-slate-500 text-xs uppercase\">
                            <th className=\"text-left py-2\">Account</th>
                            <th className=\"text-right py-2\">Debit</th>
                            <th className=\"text-right py-2\">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.line_items?.map((item, idx) => (
                            <tr key={idx} className=\"border-t border-slate-100\">
                              <td className=\"py-2\">{getAccountName(item.account_id)}</td>
                              <td className=\"py-2 text-right font-mono\">
                                {item.entry_type === 'debit' ? formatCurrency(item.amount) : '-'}
                              </td>
                              <td className=\"py-2 text-right font-mono\">
                                {item.entry_type === 'credit' ? formatCurrency(item.amount) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className=\"border-t-2 border-slate-200 font-medium\">
                            <td className=\"py-2\">Total</td>
                            <td className=\"py-2 text-right font-mono\">{formatCurrency(entry.total_debit)}</td>
                            <td className=\"py-2 text-right font-mono\">{formatCurrency(entry.total_credit)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className=\"empty-state\">
              <FileText className=\"empty-state-icon\" />
              <p>No journal entries found</p>
              <p className=\"text-sm mt-1\">Create your first journal entry</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className=\"sm:max-w-[700px] max-h-[90vh] overflow-y-auto\">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
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
                  data-testid=\"journal-date-input\"
                />
              </div>
              <div className=\"space-y-2\">
                <Label>Reference Number</Label>
                <Input
                  placeholder=\"Optional\"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                />
              </div>
            </div>

            <div className=\"space-y-2\">
              <Label>Narration</Label>
              <Textarea
                placeholder=\"Description of the journal entry\"
                value={formData.narration}
                onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                required
                data-testid=\"journal-narration-input\"
              />
            </div>

            {/* Line Items */}
            <div className=\"space-y-3\">
              <div className=\"flex justify-between items-center\">
                <Label>Line Items</Label>
                <Button type=\"button\" variant=\"outline\" size=\"sm\" onClick={addLineItem}>
                  <Plus className=\"w-4 h-4 mr-1\" />
                  Add Line
                </Button>
              </div>
              
              <div className=\"space-y-2\">
                {formData.line_items.map((item, index) => (
                  <div key={index} className=\"flex gap-2 items-start p-3 bg-slate-50 rounded-lg\">
                    <div className=\"flex-1\">
                      <Select value={item.account_id} onValueChange={(value) => updateLineItem(index, 'account_id', value)}>
                        <SelectTrigger className=\"bg-white\">
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
                    <Select value={item.entry_type} onValueChange={(value) => updateLineItem(index, 'entry_type', value)}>
                      <SelectTrigger className=\"w-28 bg-white\">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=\"debit\">Debit</SelectItem>
                        <SelectItem value=\"credit\">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type=\"number\"
                      step=\"0.01\"
                      placeholder=\"Amount\"
                      className=\"w-32 bg-white\"
                      value={item.amount}
                      onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                    />
                    {formData.line_items.length > 2 && (
                      <Button 
                        type=\"button\" 
                        variant=\"ghost\" 
                        size=\"sm\"
                        onClick={() => removeLineItem(index)}
                        className=\"text-red-500 hover:text-red-700\"
                      >
                        <Trash2 className=\"w-4 h-4\" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className={`flex justify-end gap-8 p-3 rounded-lg ${isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className=\"text-right\">
                  <p className=\"text-xs text-slate-500\">Total Debit</p>
                  <p className=\"font-mono font-medium\">{formatCurrency(totalDebit)}</p>
                </div>
                <div className=\"text-right\">
                  <p className=\"text-xs text-slate-500\">Total Credit</p>
                  <p className=\"font-mono font-medium\">{formatCurrency(totalCredit)}</p>
                </div>
                <div className=\"text-right\">
                  <p className=\"text-xs text-slate-500\">Difference</p>
                  <p className={`font-mono font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(totalDebit - totalCredit))}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type=\"button\" variant=\"outline\" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type=\"submit\" disabled={!isBalanced} data-testid=\"journal-save-btn\">
                Create Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"