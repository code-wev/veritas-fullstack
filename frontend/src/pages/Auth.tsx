import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const DEMO_USERS = [
  { name: 'Administrator', email: 'admin.demo@cgveritas.test', password: 'DemoAdmin2026!' },
  { name: 'Partner', email: 'partner.demo@cgveritas.test', password: 'DemoPartner2026!' },
  { name: 'Manager', email: 'manager.demo@cgveritas.test', password: 'DemoManager2026!' },
  { name: 'Analyst', email: 'analyst.demo@cgveritas.test', password: 'DemoAnalyst2026!' },
  { name: 'Client User', email: 'client.demo@cgveritas.test', password: 'DemoClient2026!' },
];

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'verify-otp' | 'reset-password';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're in a password recovery flow from a link
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setMode('reset-password');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      toast({ title: 'Sign in failed', description: signInError.message, variant: 'destructive' });
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== retypePassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: email.split('@')[0],
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      toast({ title: 'Sign up failed', description: signUpError.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Sign up successful',
        description: 'Please check your email to verify your registration.',
      });
      setMode('login');
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // For OTP flow, we use resetPasswordForEmail but Supabase might send a link.
    // To support OTP specifically, we'd ideally use verifyOtp if the user provides a code.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth#type=recovery`,
    });

    if (resetError) {
      setError(resetError.message);
      toast({ title: 'Request failed', description: resetError.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Verification code sent',
        description: 'Please check your email for the 8-digit verification code.',
      });
      setMode('verify-otp');
    }

    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery',
    });

    if (verifyError) {
      setError(verifyError.message);
      toast({ title: 'Verification failed', description: verifyError.message, variant: 'destructive' });
    } else {
      setMode('reset-password');
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== retypePassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      toast({ title: 'Update failed', description: updateError.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated. Redirecting to login...',
      });
      
      // Delay redirect slightly for user feedback
      setTimeout(() => {
        setMode('login');
        window.location.hash = '';
      }, 2000);
    }

    setLoading(false);
  };

  const getImageSrc = () => {
    switch (mode) {
      case 'signup':
        return "https://www.figma.com/api/mcp/asset/5045b402-ccfb-4671-9184-a1eea04c507d";
      case 'verify-otp':
        return "https://www.figma.com/api/mcp/asset/805ffd5d-8604-42bc-b678-f7f0a3520779";
      case 'forgot-password':
        return "https://www.figma.com/api/mcp/asset/663bed5c-c7c7-40b8-91d0-2272e9637c36";
      case 'reset-password':
        return "https://www.figma.com/api/mcp/asset/9fdc2fcf-11da-4846-ba9d-6b6bf5eadff4";
      default:
        return "https://www.figma.com/api/mcp/asset/31c5688f-6743-453e-8f15-695d557c9859";
    }
  };

  const getLayoutOrder = () => {
    if (mode === 'signup') return 'md:flex-row';
    return 'md:flex-row-reverse';
  };

  const maskEmail = (email: string) => {
    if (!email) return '****@example.com';
    const [user, domain] = email.split('@');
    if (user.length <= 2) return `****@${domain}`;
    return `${user.slice(0, 2)}****@${domain}`;
  };

  const passwordsMatch = password && retypePassword && password === retypePassword;
  const showMatchStatus = password && retypePassword;

  return (
    <section className="h-screen w-full overflow-hidden bg-white">
      <div className={`flex flex-col ${getLayoutOrder()} items-stretch h-screen`}>
        {/* Image Side */}
        <div className="relative hidden md:block w-full h-full overflow-hidden shadow-sm flex-1">
          <img
            src={getImageSrc()}
            alt="Veritas Background"
            className="w-full h-full object-cover object-center scale-[1.02] transition-transform duration-500 hover:scale-105"
          />
          <div className="absolute inset-0 bg-[#06244D]/15 pointer-events-none" />
        </div>

        {/* Form Side */}
        <div className="w-full flex flex-col justify-center px-6 md:px-10 lg:px-20 py-8 h-full overflow-hidden flex-1 bg-white">
          <div className="max-w-[440px] w-full mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col items-center space-y-4">
              <Link to="/" className="transition-opacity hover:opacity-90">
                <img
                  src={
                    mode === 'verify-otp' ? "https://www.figma.com/api/mcp/asset/b4cce569-3362-49ad-9416-197f945a53f5" :
                    mode === 'reset-password' ? "https://www.figma.com/api/mcp/asset/c4eb79b5-f3df-486d-85d6-1089a765101f" :
                    mode === 'forgot-password' ? "https://www.figma.com/api/mcp/asset/00282bc2-7b94-4257-9a02-13d3d5efc79c" :
                    "https://www.figma.com/api/mcp/asset/f3d3f636-9ecc-481d-8db9-537207d4d41a"
                  }
                  alt="Veritas logo mark"
                  className="h-[72px] w-20"
                />
              </Link>
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-medium tracking-[-0.72px] text-[#171717] font-mono uppercase">
                  {mode === 'login' && 'Log In'}
                  {mode === 'signup' && 'Sign Up'}
                  {mode === 'forgot-password' && 'Forget Password'}
                  {mode === 'verify-otp' && 'Verify Identity'}
                  {mode === 'reset-password' && 'Set New Password'}
                </h1>
                <p className="text-[#64748B] text-sm font-medium">
                  {mode === 'login' && 'Enter your email and password to login'}
                  {mode === 'signup' && 'Enter your email and password to sign up'}
                  {mode === 'forgot-password' && "Enter your registered email address, and we'll send you a reset link."}
                  {mode === 'verify-otp' && `Please input the verification code send to your email ${maskEmail(email)}`}
                  {mode === 'reset-password' && 'Enter your new password below.'}
                </p>
              </div>
            </div>

            {/* Form */}
            <form 
              onSubmit={
                mode === 'login' ? handleLogin : 
                mode === 'signup' ? handleSignup : 
                mode === 'forgot-password' ? handleForgotPassword : 
                mode === 'verify-otp' ? handleVerifyOtp :
                handleResetPassword
              } 
              className="space-y-4"
            >
              {error && (
                <div className="p-2 bg-destructive/15 border border-destructive/30 text-destructive rounded-md text-xs">
                  {error}
                </div>
              )}
              
              {(mode === 'login' || mode === 'signup' || mode === 'forgot-password') && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-normal text-[#171717]">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    className="h-[48px] border-[#E4E4E7] focus:ring-[#06244D]/20 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}

              {mode === 'verify-otp' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center space-y-2">
                    <Label className="text-sm font-normal text-[#171717] self-start">
                      Enter verification code
                    </Label>
                    <InputOTP
                      maxLength={8}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                      className="gap-1.5"
                    >
                      <InputOTPGroup className="gap-1.5 w-full justify-between">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                          <InputOTPSlot
                            key={index}
                            index={index}
                            className="h-[44px] w-[44px] border-[#E4E4E7] rounded-none focus:ring-[#06244D] text-base font-medium"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'signup' || mode === 'reset-password') && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-normal text-[#171717]">
                    {mode === 'reset-password' ? 'Type new password' : 'Password'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={mode === 'login' ? '••••••••' : '**********'}
                      className="h-[48px] border-[#E4E4E7] focus:ring-[#06244D]/20 pr-10 text-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {(mode === 'signup' || mode === 'reset-password') && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="retypePassword" className="text-sm font-normal text-[#171717]">
                      {mode === 'reset-password' ? 'Retype new password' : 'Retype Password'}
                    </Label>
                    {showMatchStatus && (
                      <span className={`text-[10px] flex items-center gap-1 ${passwordsMatch ? 'text-green-600' : 'text-destructive'}`}>
                        {passwordsMatch ? (
                          <><CheckCircle2 className="h-3 w-3" /> Passwords match</>
                        ) : (
                          <><XCircle className="h-3 w-3" /> Passwords do not match</>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="retypePassword"
                      type={showRetypePassword ? 'text' : 'password'}
                      placeholder="**********"
                      className={`h-[48px] border-[#E4E4E7] focus:ring-[#06244D]/20 pr-10 text-sm ${showMatchStatus ? (passwordsMatch ? 'border-green-200 bg-green-50/30' : 'border-destructive/20 bg-destructive/5') : ''}`}
                      value={retypePassword}
                      onChange={(e) => setRetypePassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRetypePassword(!showRetypePassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showRetypePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-[#06244D] data-[state=checked]:bg-[#06244D]"
                    />
                    <Label htmlFor="remember" className="text-xs font-normal text-[#171717] cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('forgot-password')}
                    className="text-xs font-normal text-[#06244D] underline hover:text-[#06244D]/80"
                  >
                    Forgot password
                  </button>
                </div>
              )}

              {mode === 'signup' && (
                 <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember-signup" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-[#06244D] data-[state=checked]:bg-[#06244D]"
                    />
                    <Label htmlFor="remember-signup" className="text-xs font-normal text-[#171717] cursor-pointer">
                      Remember me
                    </Label>
                  </div>
              )}

              {mode === 'reset-password' && (
                 <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember-reset" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-[#06244D] data-[state=checked]:bg-[#06244D]"
                    />
                    <Label htmlFor="remember-reset" className="text-xs font-normal text-[#171717] cursor-pointer">
                      Remember me
                    </Label>
                  </div>
              )}

              <Button
                type="submit"
                disabled={loading || (mode === 'reset-password' && !passwordsMatch) || (mode === 'verify-otp' && otp.length !== 8)}
                className="w-full h-[48px] bg-[#06244D] hover:bg-[#06244D]/90 text-white font-mono text-sm tracking-tight transition-all"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {mode === 'login' && 'Login'}
                {mode === 'signup' && 'Sign Up'}
                {mode === 'forgot-password' && 'Send Reset Link'}
                {mode === 'verify-otp' && 'Verify & Continue'}
                {mode === 'reset-password' && 'Reset Password'}
              </Button>

              {mode === 'verify-otp' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleForgotPassword}
                  className="w-full h-[48px] border-[#E4E4E7] text-[#06244D] font-mono text-sm tracking-tight"
                >
                  Resend code
                </Button>
              )}
            </form>

            {/* Footer */}
            <div className="space-y-6">
              <p className="text-center text-sm text-[#171717]">
                {mode === 'forgot-password' || mode === 'verify-otp' || mode === 'reset-password' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setOtp('');
                      setPassword('');
                      setRetypePassword('');
                    }}
                    className="inline-flex items-center text-[#06244D] font-medium hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
                  </button>
                ) : (
                  <>
                    {mode === 'login' ? "Don’t have an account ?" : "Already have an account ?"}
                    {' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'login' ? 'signup' : 'login');
                        setError('');
                        setEmail('');
                        setPassword('');
                        setRetypePassword('');
                      }}
                      className="text-[#06244D] font-medium hover:underline ml-1"
                    >
                      {mode === 'login' ? 'Sign Up' : 'Log In'}
                    </button>
                  </>
                )}
              </p>

              {/* Demo Users Section (only for login) */}
              {mode === 'login' && (
                <div className="pt-4 border-t border-[#E4E4E7]">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-3 text-center">
                    Demo Credentials
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DEMO_USERS.map((user) => (
                      <button
                        key={user.email}
                        type="button"
                        onClick={() => {
                          setEmail(user.email);
                          setPassword(user.password);
                          setError('');
                        }}
                        className="p-2 border border-[#E4E4E7] rounded-md hover:bg-muted/50 text-left transition-all duration-200 group"
                      >
                        <div className="text-[10px] font-bold text-[#171717] font-mono group-hover:text-[#06244D]">
                          {user.name}
                        </div>
                        <div className="text-[9px] text-muted-foreground truncate mt-0.5">
                          {user.email}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
