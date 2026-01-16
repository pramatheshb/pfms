"import { useState, useEffect } from 'react';
import { getParties, createParty, getInvoices, createInvoice, recordPayment, formatCurrency, formatDate } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import { Plus, Users, Building, Search, Phone, Mail, Receipt } from 'lucide-react';
import { toast } from 'sonner';

export default function Parties() {
  const { canEdit } = useAuth();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    party_type: 'customer',
    email: '',
    phone: '',
    gst_number: '',
    address: ''
  });

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    try {
      const response = await getParties();
      setParties(response.data);
    } catch (error) {
      console.error('Failed to fetch parties:', error);
      toast.error('Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createParty(formData);
      toast.success('Party created successfully');
      setDialogOpen(false);
      resetForm();
      fetchParties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create party');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      party_type: 'customer',
      email: '',
      phone: '',
      gst_number: '',
      address: ''
    });
  };

  const filteredParties = parties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.gst_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || p.party_type === activeTab;
    return matchesSearch && matchesTab;
  });

  const totalReceivables = parties.filter(p => p.party_type === 'customer').reduce((sum, p) => sum + (p.total_receivable || 0), 0);
  const totalPayables = parties.filter(p => p.party_type === 'vendor').reduce((sum, p) => sum + (p.total_payable || 0), 0);

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"spinner\" />
      </div>
    );
  }

  return (
    <div className=\"space-y-6 animate-fade-in\" data-testid=\"parties-page\">
      <div className=\"flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4\">
        <div>
          <h1 className=\"text-2xl font-bold text-slate-900\">Customers & Vendors</h1>
          <p className=\"text-slate-500 mt-1\">Manage your business relationships</p>
        </div>
        {canEdit() && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid=\"add-party-btn\">
            <Plus className=\"w-4 h-4 mr-2\" />
            Add Party
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
        <Card className=\"bg-blue-50 border-blue-200\">
          <CardContent className=\"p-6\">
            <div className=\"flex items-center gap-4\">
              <div className=\"w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center\">
                <Users className=\"w-6 h-6 text-blue-600\" />
              </div>
              <div>
                <p className=\"text-sm text-blue-700 font-medium\">Total Receivables</p>
                <p className=\"text-2xl font-bold text-blue-900 font-mono\">{formatCurrency(totalReceivables)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className=\"bg-purple-50 border-purple-200\">
          <CardContent className=\"p-6\">
            <div className=\"flex items-center gap-4\">
              <div className=\"w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center\">
                <Building className=\"w-6 h-6 text-purple-600\" />
              </div>
              <div>
                <p className=\"text-sm text-purple-700 font-medium\">Total Payables</p>
                <p className=\"text-2xl font-bold text-purple-900 font-mono\">{formatCurrency(totalPayables)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className=\"relative max-w-sm\">
        <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400\" />
        <Input
          placeholder=\"Search parties...\"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className=\"pl-9\"
          data-testid=\"party-search-input\"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value=\"all\">All</TabsTrigger>
          <TabsTrigger value=\"customer\">Customers</TabsTrigger>
          <TabsTrigger value=\"vendor\">Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className=\"mt-4\">
          {filteredParties.length > 0 ? (
            <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\">
              {filteredParties.map((party) => (
                <Card key={party.id} className=\"card-hover\" data-testid={`party-card-${party.id}`}>
                  <CardContent className=\"p-5\">
                    <div className=\"flex items-start justify-between mb-3\">
                      <div className=\"flex items-center gap-3\">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${party.party_type === 'customer' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                          {party.party_type === 'customer' ? (
                            <Users className=\"w-5 h-5 text-blue-600\" />
                          ) : (
                            <Building className=\"w-5 h-5 text-purple-600\" />
                          )}
                        </div>
                        <div>
                          <h3 className=\"font-medium text-slate-900\">{party.name}</h3>
                          <span className={`text-xs font-medium ${party.party_type === 'customer' ? 'text-blue-600' : 'text-purple-600'}`}>
                            {party.party_type === 'customer' ? 'Customer' : 'Vendor'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(party.email || party.phone) && (
                      <div className=\"space-y-1 mb-3 text-sm text-slate-600\">
                        {party.email && (
                          <div className=\"flex items-center gap-2\">
                            <Mail className=\"w-3.5 h-3.5\" />
                            {party.email}
                          </div>
                        )}
                        {party.phone && (
                          <div className=\"flex items-center gap-2\">
                            <Phone className=\"w-3.5 h-3.5\" />
                            {party.phone}
                          </div>
                        )}
                      </div>
                    )}

                    {party.gst_number && (
                      <p className=\"text-xs text-slate-500 mb-3\">
                        GST: <span className=\"font-mono\">{party.gst_number}</span>
                      </p>
                    )}

                    <div className=\"pt-3 border-t border-slate-100\">
                      <div className=\"flex justify-between text-sm\">
                        <span className=\"text-slate-500\">
                          {party.party_type === 'customer' ? 'Receivable' : 'Payable'}
                        </span>
                        <span className={`font-mono font-medium ${party.party_type === 'customer' ? 'text-blue-600' : 'text-purple-600'}`}>
                          {formatCurrency(party.party_type === 'customer' ? party.total_receivable : party.total_payable)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className=\"p-0\">
                <div className=\"empty-state\">
                  <Users className=\"empty-state-icon\" />
                  <p>No parties found</p>
                  <p className=\"text-sm mt-1\">Add customers and vendors to manage your business relationships</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className=\"sm:max-w-[500px]\">
          <DialogHeader>
            <DialogTitle>Add Party</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className=\"space-y-4\">
            <div className=\"grid grid-cols-2 gap-4\">
              <div className=\"space-y-2 col-span-2\">
                <Label>Name</Label>
                <Input
                  placeholder=\"Party name\"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid=\"party-name-input\"
                />
              </div>
              <div className=\"space-y-2 col-span-2\">
                <Label>Type</Label>
                <Select value={formData.party_type} onValueChange={(value) => setFormData({ ...formData, party_type: value })}>
                  <SelectTrigger data-testid=\"party-type-select\">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=\"customer\">Customer</SelectItem>
                    <SelectItem value=\"vendor\">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className=\"grid grid-cols-2 gap-4\">
              <div className=\"space-y-2\">
                <Label>Email</Label>
                <Input
                  type=\"email\"
                  placeholder=\"email@example.com\"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid=\"party-email-input\"
                />
              </div>
              <div className=\"space-y-2\">
                <Label>Phone</Label>
                <Input
                  placeholder=\"+91 9876543210\"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid=\"party-phone-input\"
                />
              </div>
            </div>

            <div className=\"space-y-2\">
              <Label>GST Number</Label>
              <Input
                placeholder=\"e.g., 22AAAAA0000A1Z5\"
                value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                data-testid=\"party-gst-input\"
              />
            </div>

            <div className=\"space-y-2\">
              <Label>Address</Label>
              <Textarea
                placeholder=\"Full address\"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                data-testid=\"party-address-input\"
              />
            </div>

            <DialogFooter>
              <Button type=\"button\" variant=\"outline\" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type=\"submit\" data-testid=\"party-save-btn\">
                Add Party
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"