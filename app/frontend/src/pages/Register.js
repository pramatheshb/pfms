"import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Building2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'viewer'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.fullName, formData.role);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=\"min-h-screen flex\">
      {/* Left side - Image */}
      <div 
        className=\"hidden lg:flex lg:w-1/2 bg-cover bg-center relative\"
        style={{ 
          backgroundImage: 'url(https://images.unsplash.com/photo-1765366417030-16d9765d920a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjb3Jwb3JhdGUlMjBvZmZpY2UlMjBpbmRpYXxlbnwwfHx8fDE3Njg1NDE4MzR8MA&ixlib=rb-4.1.0&q=85)'
        }}
      >
        <div className=\"absolute inset-0 bg-slate-900/60\" />
        <div className=\"relative z-10 flex flex-col justify-end p-12 text-white\">
          <h2 className=\"text-4xl font-bold mb-4\">Get Started</h2>
          <p className=\"text-lg text-slate-200 max-w-md\">
            Join Kraftinn Finance and streamline your business accounting with our comprehensive ERP solution.
          </p>
        </div>
      </div>

      {/* Right side - Register form */}
      <div className=\"flex-1 flex items-center justify-center p-8 bg-slate-50\">
        <div className=\"w-full max-w-md\">
          <div className=\"flex items-center gap-3 mb-8\">
            <div className=\"w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center\">
              <Building2 className=\"w-7 h-7 text-white\" />
            </div>
            <div>
              <h1 className=\"text-2xl font-bold text-slate-900\">Kraftinn</h1>
              <p className=\"text-sm text-slate-500\">Finance ERP</p>
            </div>
          </div>

          <Card className=\"border-0 shadow-lg\">
            <CardHeader className=\"space-y-1\">
              <CardTitle className=\"text-2xl\">Create an account</CardTitle>
              <CardDescription>
                Enter your details to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className=\"space-y-4\">
                {error && (
                  <div className=\"flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm\">
                    <AlertCircle className=\"w-4 h-4\" />
                    {error}
                  </div>
                )}

                <div className=\"space-y-2\">
                  <Label htmlFor=\"fullName\">Full Name</Label>
                  <Input
                    id=\"fullName\"
                    name=\"fullName\"
                    placeholder=\"John Doe\"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    data-testid=\"register-name-input\"
                  />
                </div>

                <div className=\"space-y-2\">
                  <Label htmlFor=\"email\">Email</Label>
                  <Input
                    id=\"email\"
                    name=\"email\"
                    type=\"email\"
                    placeholder=\"name@company.com\"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    data-testid=\"register-email-input\"
                  />
                </div>

                <div className=\"space-y-2\">
                  <Label htmlFor=\"role\">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger data-testid=\"register-role-select\">
                      <SelectValue placeholder=\"Select a role\" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=\"admin\">Admin</SelectItem>
                      <SelectItem value=\"accountant\">Accountant</SelectItem>
                      <SelectItem value=\"manager\">Manager</SelectItem>
                      <SelectItem value=\"viewer\">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className=\"space-y-2\">
                  <Label htmlFor=\"password\">Password</Label>
                  <div className=\"relative\">
                    <Input
                      id=\"password\"
                      name=\"password\"
                      type={showPassword ? 'text' : 'password'}
                      placeholder=\"Create a password\"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      data-testid=\"register-password-input\"
                    />
                    <button
                      type=\"button\"
                      onClick={() => setShowPassword(!showPassword)}
                      className=\"absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600\"
                    >
                      {showPassword ? <EyeOff className=\"w-4 h-4\" /> : <Eye className=\"w-4 h-4\" />}
                    </button>
                  </div>
                </div>

                <div className=\"space-y-2\">
                  <Label htmlFor=\"confirmPassword\">Confirm Password</Label>
                  <Input
                    id=\"confirmPassword\"
                    name=\"confirmPassword\"
                    type=\"password\"
                    placeholder=\"Confirm your password\"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    data-testid=\"register-confirm-password-input\"
                  />
                </div>

                <Button 
                  type=\"submit\" 
                  className=\"w-full bg-slate-900 hover:bg-slate-800\"
                  disabled={loading}
                  data-testid=\"register-submit-btn\"
                >
                  {loading ? (
                    <span className=\"flex items-center gap-2\">
                      <span className=\"spinner w-4 h-4\" />
                      Creating account...
                    </span>
                  ) : (
                    'Create account'
                  )}
                </Button>
              </form>

              <div className=\"mt-6 text-center text-sm text-slate-500\">
                Already have an account?{' '}
                <Link to=\"/login\" className=\"text-slate-900 font-medium hover:underline\">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
"