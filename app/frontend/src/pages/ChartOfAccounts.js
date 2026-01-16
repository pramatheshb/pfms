"import { useState, useEffect } from 'react';
import { getAccounts, createAccount, updateAccount, deleteAccount, seedAccounts } from '../lib/api';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Plus, BookOpen, MoreVertical, Pencil, Trash2, Database, Search } from 'lucide-react';
import { toast } from 'sonner';

const accountTypes = [
  { value: 'asset', label: 'Assets', color: 'bg-blue-50 text-blue-700' },
  { value: 'liability', label: 'Liabilities', color: 'bg-purple-50 text-purple-700' },
  { value: 'equity', label: 'Equity', color: 'bg-green-50 text-green-700' },
  { value: 'revenue', label: 'Revenue', color: 'bg-teal-50 text-teal-700' },
  { value: 'expense', label: 'Expenses', color: 'bg-red-50 text-red-700' },
];

export default function ChartOfAccounts() {
  const { canEdit, canDelete, isAdmin } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    account_type: 'asset',
    description: '',
    is_active: true
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await getAccounts();
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedAccounts = async () => {
    try {
      await seedAccounts();
      toast.success('Default accounts created successfully');
      fetchAccounts();
    } catch (error) {
      toast.error('Failed to seed accounts');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, formData);
        toast.success('Account updated successfully');
      } else {
        await createAccount(formData);
        toast.success('Account created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save account');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      await deleteAccount(id);
      toast.success('Account deleted');
      fetchAccounts();
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const openEditDialog = (account) => {
    setEditingAccount(account);
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      description: account.description || '',
      is_active: account.is_active
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAccount(null);
    setFormData({
      account_code: '',
      account_name: '',
      account_type: 'asset',
      description: '',
      is_active: true
    });
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         acc.account_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || acc.account_type === activeTab;
    return matchesSearch && matchesTab;
  });

  const getTypeColor = (type) => {
    const found = accountTypes.find(t => t.value === type);
    return found ? found.color : 'bg-slate-50 text-slate-700';
  };

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"spinner\" />
      </div>
    );
  }

  return (
    <div className=\"space-y-6 animate-fade-in\" data-testid=\"chart-of-accounts-page\">
      <div className=\"flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4\">
        <div>
          <h1 className=\"text-2xl font-bold text-slate-900\">Chart of Accounts</h1>
          <p className=\"text-slate-500 mt-1\">Manage your accounting structure</p>
        </div>
        <div className=\"flex gap-2\">
          {isAdmin() && accounts.length === 0 && (
            <Button variant=\"outline\" onClick={handleSeedAccounts} data-testid=\"seed-accounts-btn\">
              <Database className=\"w-4 h-4 mr-2\" />
              Load Default Accounts
            </Button>
          )}
          {canEdit() && (
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid=\"add-account-btn\">
              <Plus className=\"w-4 h-4 mr-2\" />
              Add Account
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className=\"relative max-w-sm\">
        <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400\" />
        <Input
          placeholder=\"Search accounts...\"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className=\"pl-9\"
          data-testid=\"account-search-input\"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value=\"all\">All</TabsTrigger>
          {accountTypes.map((type) => (
            <TabsTrigger key={type.value} value={type.value}>{type.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className=\"mt-4\">
          <Card>
            <CardContent className=\"p-0\">
              {filteredAccounts.length > 0 ? (
                <div className=\"overflow-x-auto\">
                  <table className=\"data-table\">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Account Name</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Status</th>
                        {canEdit() && <th className=\"w-10\"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccounts.map((account) => (
                        <tr key={account.id} data-testid={`account-row-${account.id}`}>
                          <td className=\"font-mono font-medium\">{account.account_code}</td>
                          <td className=\"font-medium\">{account.account_name}</td>
                          <td>
                            <span className={`badge ${getTypeColor(account.account_type)}`}>
                              {account.account_type}
                            </span>
                          </td>
                          <td className=\"text-slate-500 max-w-xs truncate\">{account.description || '-'}</td>
                          <td>
                            <span className={`badge ${account.is_active ? 'badge-success' : 'badge-danger'}`}>
                              {account.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          {canEdit() && (
                            <td>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant=\"ghost\" size=\"sm\" className=\"h-8 w-8 p-0\">
                                    <MoreVertical className=\"w-4 h-4\" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align=\"end\">
                                  <DropdownMenuItem onClick={() => openEditDialog(account)}>
                                    <Pencil className=\"w-4 h-4 mr-2\" />
                                    Edit
                                  </DropdownMenuItem>
                                  {canDelete() && (
                                    <DropdownMenuItem onClick={() => handleDelete(account.id)} className=\"text-red-600\">
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
                  <BookOpen className=\"empty-state-icon\" />
                  <p>No accounts found</p>
                  <p className=\"text-sm mt-1\">Create your chart of accounts to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className=\"sm:max-w-[500px]\">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className=\"space-y-4\">
            <div className=\"grid grid-cols-2 gap-4\">
              <div className=\"space-y-2\">
                <Label>Account Code</Label>
                <Input
                  placeholder=\"e.g., 1000\"
                  value={formData.account_code}
                  onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                  required
                  data-testid=\"account-code-input\"
                />
              </div>
              <div className=\"space-y-2\">
                <Label>Account Type</Label>
                <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
                  <SelectTrigger data-testid=\"account-type-select\">
                    <SelectValue placeholder=\"Select type\" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className=\"space-y-2\">
              <Label>Account Name</Label>
              <Input
                placeholder=\"e.g., Cash in Hand\"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                required
                data-testid=\"account-name-input\"
              />
            </div>

            <div className=\"space-y-2\">
              <Label>Description</Label>
              <Textarea
                placeholder=\"Enter description (optional)\"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid=\"account-description-input\"
              />
            </div>

            <div className=\"flex items-center gap-2\">
              <input
                type=\"checkbox\"
                id=\"is_active\"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className=\"rounded border-slate-300\"
              />
              <Label htmlFor=\"is_active\" className=\"cursor-pointer\">Active Account</Label>
            </div>

            <DialogFooter>
              <Button type=\"button\" variant=\"outline\" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type=\"submit\" data-testid=\"account-save-btn\">
                {editingAccount ? 'Update' : 'Create'} Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"