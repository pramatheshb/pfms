"import { useState, useEffect } from 'react';
import { getDashboardData, formatCurrency } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  TrendingUp, 
  Wallet,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await getDashboardData();
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"spinner\" />
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Income',
      value: formatCurrency(data?.total_income || 0),
      icon: ArrowDownCircle,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      trend: '+12.5%',
      trendUp: true
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(data?.total_expenses || 0),
      icon: ArrowUpCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: '+8.2%',
      trendUp: false
    },
    {
      label: 'Net Profit',
      value: formatCurrency(data?.net_profit || 0),
      icon: TrendingUp,
      color: 'text-slate-900',
      bgColor: 'bg-slate-100',
      trend: '+15.3%',
      trendUp: true
    },
    {
      label: 'Receivables',
      value: formatCurrency(data?.total_receivables || 0),
      icon: Users,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      trend: 'Due',
      trendUp: null
    },
    {
      label: 'Payables',
      value: formatCurrency(data?.total_payables || 0),
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: 'Due',
      trendUp: null
    },
  ];

  return (
    <div className=\"space-y-6 animate-fade-in\" data-testid=\"dashboard-page\">
      <div>
        <h1 className=\"text-2xl font-bold text-slate-900\">Dashboard</h1>
        <p className=\"text-slate-500 mt-1\">Financial overview and key metrics</p>
      </div>

      {/* Metrics Grid */}
      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4\">
        {metrics.map((metric, index) => (
          <Card key={metric.label} className={`card-hover animate-fade-in stagger-${index + 1}`}>
            <CardContent className=\"p-5\">
              <div className=\"flex items-start justify-between\">
                <div className={`w-10 h-10 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                  <metric.icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                {metric.trendUp !== null && (
                  <span className={`flex items-center text-xs font-medium ${metric.trendUp ? 'text-teal-600' : 'text-red-600'}`}>
                    {metric.trendUp ? <ArrowUpRight className=\"w-3 h-3\" /> : <ArrowDownRight className=\"w-3 h-3\" />}
                    {metric.trend}
                  </span>
                )}
                {metric.trendUp === null && (
                  <span className=\"text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded\">
                    {metric.trend}
                  </span>
                )}
              </div>
              <div className=\"mt-4\">
                <p className=\"text-xs text-slate-500 font-medium uppercase tracking-wide\">{metric.label}</p>
                <p className=\"text-xl font-semibold text-slate-900 mt-1 font-mono\">{metric.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
        {/* Monthly Trend Chart */}
        <Card className=\"card-hover\">
          <CardHeader>
            <CardTitle className=\"text-lg\">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className=\"h-72\">
              <ResponsiveContainer width=\"100%\" height=\"100%\">
                <AreaChart data={data?.monthly_trend || []}>
                  <defs>
                    <linearGradient id=\"incomeGradient\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">
                      <stop offset=\"5%\" stopColor=\"#0D9488\" stopOpacity={0.3}/>
                      <stop offset=\"95%\" stopColor=\"#0D9488\" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id=\"expenseGradient\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">
                      <stop offset=\"5%\" stopColor=\"#DC2626\" stopOpacity={0.3}/>
                      <stop offset=\"95%\" stopColor=\"#DC2626\" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray=\"3 3\" stroke=\"#E2E8F0\" />
                  <XAxis dataKey=\"month\" stroke=\"#64748B\" fontSize={12} />
                  <YAxis stroke=\"#64748B\" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area 
                    type=\"monotone\" 
                    dataKey=\"income\" 
                    stroke=\"#0D9488\" 
                    fill=\"url(#incomeGradient)\"
                    strokeWidth={2}
                    name=\"Income\"
                  />
                  <Area 
                    type=\"monotone\" 
                    dataKey=\"expense\" 
                    stroke=\"#DC2626\" 
                    fill=\"url(#expenseGradient)\"
                    strokeWidth={2}
                    name=\"Expense\"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Income vs Expense Bar Chart */}
        <Card className=\"card-hover\">
          <CardHeader>
            <CardTitle className=\"text-lg\">Income vs Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className=\"h-72\">
              <ResponsiveContainer width=\"100%\" height=\"100%\">
                <BarChart data={data?.monthly_trend || []}>
                  <CartesianGrid strokeDasharray=\"3 3\" stroke=\"#E2E8F0\" />
                  <XAxis dataKey=\"month\" stroke=\"#64748B\" fontSize={12} />
                  <YAxis stroke=\"#64748B\" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey=\"income\" fill=\"#0D9488\" radius={[4, 4, 0, 0]} name=\"Income\" />
                  <Bar dataKey=\"expense\" fill=\"#DC2626\" radius={[4, 4, 0, 0]} name=\"Expense\" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className=\"card-hover\">
        <CardHeader>
          <CardTitle className=\"text-lg\">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recent_transactions?.length > 0 ? (
            <div className=\"overflow-x-auto\">
              <table className=\"data-table\">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th className=\"text-right\">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_transactions.map((trans, index) => (
                    <tr key={trans.id || index}>
                      <td className=\"font-mono text-xs\">{trans.date}</td>
                      <td>{trans.description || '-'}</td>
                      <td>
                        <span className={`badge ${trans.transaction_type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                          {trans.transaction_type}
                        </span>
                      </td>
                      <td className={`text-right font-mono ${trans.transaction_type === 'income' ? 'text-teal-600' : 'text-red-600'}`}>
                        {trans.transaction_type === 'income' ? '+' : '-'}{formatCurrency(trans.net_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className=\"empty-state\">
              <Wallet className=\"empty-state-icon\" />
              <p>No recent transactions</p>
              <p className=\"text-sm mt-1\">Start by adding income or expenses</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
"