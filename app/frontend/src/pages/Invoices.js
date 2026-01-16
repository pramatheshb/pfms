"import { useState, useEffect } from 'react';
import { getInvoices, createInvoice, recordPayment, getParties, formatCurrency, formatDate } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { Plus, Receipt, Search, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function Invoices() {
  const { canEdit } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [formData, setFormData] = useState({
    party_id: '',
    invoice_type: 'sales',
    invoice_number: '',
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    items: [{ description: '', quantity: 1, rate: '', amount: 0 }],
    subtotal: 0,
    gst_amount: 0,
    total_amount: 0,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invRes, partyRes] = await Promise.all([
        getInvoices(),
        getParties()
      ]);
      setInvoices(invRes.data);
      setParties(partyRes.data);
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
      const items = formData.items.filter(i => i.description && i.rate);
      const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.quantity) * parseFloat(i.rate)), 0);
      const gstAmount = subtotal * 0.18; // Default 18% GST
      
      const payload = {
        ...formData,
        items,
        subtotal,
        gst_amount: gstAmount,
        total_amount: subtotal + gstAmount
      };

      await createInvoice(payload);
      toast.success('Invoice created successfully');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create invoice');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount) return;
    
    try {
      await recordPayment(selectedInvoice.id, parseFloat(paymentAmount));
      toast.success('Payment recorded');
      setPaymentDialogOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount('');
      fetchData();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = parseFloat(newItems[index].quantity || 0) * parseFloat(newItems[index].rate || 0);
    }
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, rate: '', amount: 0 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    setFormData({
      party_id: '',
      invoice_type: 'sales',
      invoice_number: '',
      date: new Date().toISOString().split('T')[0],
      due_date: '',
      items: [{ description: '', quantity: 1, rate: '', amount: 0 }],
      subtotal: 0,
      gst_amount: 0,
      total_amount: 0,
      notes: ''
    });
  };

  const openPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount('');
    setPaymentDialogOpen(true);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || 
                       (activeTab === 'sales' && inv.invoice_type === 'sales') ||
                       (activeTab === 'purchase' && inv.invoice_type === 'purchase') ||
                       (activeTab === 'pending' && inv.status !== 'paid');
    return matchesSearch && matchesTab;
  });

  const getPartyName = (partyId) => {
    const party = parties.find(p => p.id === partyId);
    return party?.name || '-';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'badge-success';
      case 'partial': return 'badge-info';
      case 'overdue': return 'badge-danger';
      default: return 'badge-warning';
    }
  };

  const subtotal = formData.items.reduce((sum, i) => sum + (parseFloat(i.quantity || 0) * parseFloat(i.rate || 0)), 0);
  const gstAmount = subtotal * 0.18;
  const total = subtotal + gstAmount;

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"spinner\" />
      </div>
    );
  }

  return (
    <div className=\"space-y-6 animate-fade-in\" data-testid=\"invoices-page\">
      <div className=\"flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4\">
        <div>
          <h1 className=\"text-2xl font-bold text-slate-900\">Invoices</h1>
          <p className=\"text-slate-500 mt-1\">Manage sales and purchase invoices</p>
        </div>
        {canEdit() && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid=\"create-invoice-btn\">
            <Plus className=\"w-4 h-4 mr-2\" />
            Create Invoice
          </Button>
        )}
      </div>

      {/* Search */}
      <div className=\"relative max-w-sm\">
        <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400\" />
        <Input
          placeholder=\"Search invoices...\"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className=\"pl-9\"
          data-testid=\"invoice-search-input\"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value=\"all\">All</TabsTrigger>
          <TabsTrigger value=\"sales\">Sales</TabsTrigger>
          <TabsTrigger value=\"purchase\">Purchase</TabsTrigger>
          <TabsTrigger value=\"pending\">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className=\"mt-4\">
          <Card>
            <CardContent className=\"p-0\">
              {filteredInvoices.length > 0 ? (
                <div className=\"overflow-x-auto\">
                  <table className=\"data-table\">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Party</th>
                        <th>Type</th>
                        <th className=\"text-right\">Amount</th>
                        <th className=\"text-right\">Paid</th>
                        <th className=\"text-right\">Balance</th>
                        <th>Status</th>
                        {canEdit() && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv) => (
                        <tr key={inv.id} data-testid={`invoice-row-${inv.id}`}>
                          <td className=\"font-mono font-medium\">{inv.invoice_number}</td>
                          <td className=\"text-xs\">{formatDate(inv.date)}</td>
                          <td>{getPartyName(inv.party_id)}</td>
                          <td>
                            <span className={`badge ${inv.invoice_type === 'sales' ? 'badge-success' : 'badge-info'}`}>
                              {inv.invoice_type}
                            </span>
                          </td>
                          <td className=\"text-right font-mono\">{formatCurrency(inv.total_amount)}</td>
                          <td className=\"text-right font-mono text-teal-600\">{formatCurrency(inv.paid_amount)}</td>
                          <td className=\"text-right font-mono text-red-600\">{formatCurrency(inv.balance_due)}</td>
                          <td>
                            <span className={`badge ${getStatusColor(inv.status)}`}>
                              {inv.status}
                            </span>
                          </td>
                          {canEdit() && (
                            <td>
                              {inv.status !== 'paid' && (
                                <Button 
                                  variant=\"outline\" 
                                  size=\"sm\"
                                  onClick={() => openPaymentDialog(inv)}
                                >
                                  <DollarSign className=\"w-4 h-4 mr-1\" />
                                  Pay
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
                  <Receipt className=\"empty-state-icon\" />
                  <p>No invoices found</p>
                  <p className=\"text-sm mt-1\">Create your first invoice to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className=\"sm:max-w-[700px] max-h-[90vh] overflow-y-auto\">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className=\"space-y-4\">
            <div className=\"grid grid-cols-2 gap-4\">
              <div className=\"space-y-2\">
                <Label>Invoice Type</Label>
                <Select value={formData.invoice_type} onValueChange={(value) => setFormData({ ...formData, invoice_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=\"sales\">Sales Invoice</SelectItem>
                    <SelectItem value=\"purchase\">Purchase Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className=\"space-y-2\">
                <Label>Invoice Number</Label>
                <Input
                  placeholder=\"e.g., INV-001\"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  required
                  data-testid=\"invoice-number-input\"
                />
              </div>
            </div>

            <div className=\"space-y-2\">
              <Label>Party</Label>
              <Select value={formData.party_id} onValueChange={(value) => setFormData({ ...formData, party_id: value })}>
                <SelectTrigger data-testid=\"invoice-party-select\">
                  <SelectValue placeholder=\"Select party\" />
                </SelectTrigger>
                <SelectContent>
                  {parties.filter(p => 
                    (formData.invoice_type === 'sales' && p.party_type === 'customer') ||
                    (formData.invoice_type === 'purchase' && p.party_type === 'vendor')
                  ).map((party) => (
                    <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className=\"grid grid-cols-2 gap-4\">
              <div className=\"space-y-2\">
                <Label>Date</Label>
                <Input
                  type=\"date\"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className=\"space-y-2\">
                <Label>Due Date</Label>
                <Input
                  type=\"date\"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Line Items */}
            <div className=\"space-y-3\">
              <div className=\"flex justify-between items-center\">
                <Label>Items</Label>
                <Button type=\"button\" variant=\"outline\" size=\"sm\" onClick={addItem}>
                  <Plus className=\"w-4 h-4 mr-1\" />
                  Add Item
                </Button>
              </div>
              
              <div className=\"space-y-2\">
                {formData.items.map((item, index) => (
                  <div key={index} className=\"flex gap-2 items-center p-3 bg-slate-50 rounded-lg\">
                    <Input
                      placeholder=\"Description\"
                      className=\"flex-1 bg-white\"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                    />
                    <Input
                      type=\"number\"
                      placeholder=\"Qty\"
                      className=\"w-20 bg-white\"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    />
                    <Input
                      type=\"number\"
                      placeholder=\"Rate\"
                      className=\"w-28 bg-white\"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', e.target.value)}
                    />
                    <div className=\"w-28 text-right font-mono\">
                      {formatCurrency(parseFloat(item.quantity || 0) * parseFloat(item.rate || 0))}
                    </div>
                    {formData.items.length > 1 && (
                      <Button 
                        type=\"button\" 
                        variant=\"ghost\" 
                        size=\"sm\"
                        onClick={() => removeItem(index)}
                        className=\"text-red-500\"
                      >
                        <Trash2 className=\"w-4 h-4\" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className=\"flex flex-col items-end gap-2 p-4 bg-slate-50 rounded-lg\">
                <div className=\"flex justify-between w-48\">
                  <span className=\"text-slate-500\">Subtotal:</span>
                  <span className=\"font-mono\">{formatCurrency(subtotal)}</span>
                </div>
                <div className=\"flex justify-between w-48\">
                  <span className=\"text-slate-500\">GST (18%):</span>
                  <span className=\"font-mono\">{formatCurrency(gstAmount)}</span>
                </div>
                <div className=\"flex justify-between w-48 pt-2 border-t border-slate-200 font-medium\">
                  <span>Total:</span>
                  <span className=\"font-mono\">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div className=\"space-y-2\">
              <Label>Notes</Label>
              <Textarea
                placeholder=\"Additional notes (optional)\"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type=\"button\" variant=\"outline\" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type=\"submit\" data-testid=\"invoice-save-btn\">
                Create Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className=\"sm:max-w-[400px]\">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayment} className=\"space-y-4\">
            {selectedInvoice && (
              <div className=\"p-4 bg-slate-50 rounded-lg space-y-2\">
                <div className=\"flex justify-between\">
                  <span className=\"text-slate-500\">Invoice:</span>
                  <span className=\"font-mono\">{selectedInvoice.invoice_number}</span>
                </div>
                <div className=\"flex justify-between\">
                  <span className=\"text-slate-500\">Total Amount:</span>
                  <span className=\"font-mono\">{formatCurrency(selectedInvoice.total_amount)}</span>
                </div>
                <div className=\"flex justify-between\">
                  <span className=\"text-slate-500\">Balance Due:</span>
                  <span className=\"font-mono text-red-600\">{formatCurrency(selectedInvoice.balance_due)}</span>
                </div>
              </div>
            )}
            
            <div className=\"space-y-2\">
              <Label>Payment Amount (₹)</Label>
              <Input
                type=\"number\"
                step=\"0.01\"
                placeholder=\"0.00\"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
                data-testid=\"payment-amount-input\"
              />
            </div>

            <DialogFooter>
              <Button type=\"button\" variant=\"outline\" onClick={() => setPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type=\"submit\" data-testid=\"record-payment-btn\">
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"