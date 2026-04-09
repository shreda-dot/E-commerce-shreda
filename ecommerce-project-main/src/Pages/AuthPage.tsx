import { Alert, Box, Button, Card, CardContent, CircularProgress, Snackbar, Stack, TextField, Typography, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { GoogleLogin } from '@react-oauth/google';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null) {
    const maybeResponse = error as { response?: { data?: { error?: string; code?: string } } };
    return {
      message: maybeResponse.response?.data?.error || fallback,
      code: maybeResponse.response?.data?.code || '',
    };
  }
  return { message: fallback, code: '' };
};

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, verifySignup, loginWithGoogle, requestPasswordReset, resetPassword } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'auth' | 'verifySignup' | 'forgotPassword'>('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  // New Loading State
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });
  const [errorCode, setErrorCode] = useState('');
  const [requestingReset, setRequestingReset] = useState(false);
  const googleClientIdConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const redirectTo = (location.state as { from?: string } | null)?.from || '/';
  const prefilledInfo = (location.state as { info?: string } | null)?.info || '';

  useEffect(() => {
    if (prefilledInfo) {
      setNotification({ open: true, message: prefilledInfo, severity: 'info' });
    }
  }, [prefilledInfo]);

  useEffect(() => {
    if (!notification.open) return;
    const timeout = window.setTimeout(() => {
      setNotification((prev) => ({ ...prev, open: false, message: '' }));
      setErrorCode('');
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [notification.open]);

  const submit = async () => {
    try {
      setLoading(true);
      setNotification((prev) => ({ ...prev, open: false, message: '' }));
      setErrorCode('');
      if (tab === 'login') {
        await login(email, password);
        navigate(redirectTo);
      } else {
        const message = await signup(name, email, password);
        setNotification({ open: true, message, severity: 'success' });
        setStep('verifySignup');
      }
    } catch (error: unknown) {
      const parsed = getErrorMessage(error, 'Authentication failed');
      setNotification({ open: true, message: parsed.message, severity: 'error' });
      setErrorCode(parsed.code);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setLoading(true);
      setNotification((prev) => ({ ...prev, open: false, message: '' }));
      setErrorCode('');
      await verifySignup(email, otpCode);
      navigate(redirectTo);
    } catch (error: unknown) {
      const parsed = getErrorMessage(error, 'OTP verification failed');
      setNotification({ open: true, message: parsed.message, severity: 'error' });
      setErrorCode(parsed.code);
    } finally {
      setLoading(false);
    }
  };

  const requestForgotPassword = async () => {
    try {
      setRequestingReset(true);
      setNotification((prev) => ({ ...prev, open: false, message: '' }));
      setErrorCode('');
      const message = await requestPasswordReset(email);
      setNotification({ open: true, message, severity: 'success' });
      setStep('forgotPassword');
    } catch (error: unknown) {
      const parsed = getErrorMessage(error, 'Unable to request password reset');
      setNotification({ open: true, message: parsed.message, severity: 'error' });
      setErrorCode(parsed.code);
    } finally {
      setRequestingReset(false);
    }
  };

  const submitResetPassword = async () => {
    try {
      setLoading(true);
      setNotification((prev) => ({ ...prev, open: false, message: '' }));
      setErrorCode('');
      const message = await resetPassword(email, otpCode, newPassword);
      setNotification({ open: true, message, severity: 'success' });
      setStep('auth');
      setTab('login');
    } catch (error: unknown) {
      const parsed = getErrorMessage(error, 'Unable to reset password');
      setNotification({ open: true, message: parsed.message, severity: 'error' });
      setErrorCode(parsed.code);
    } finally {
      setLoading(false);
    }
  };

  const hideBrowserPasswordToggle = {
    '& input::-ms-reveal': { display: 'none' },
    '& input::-ms-clear': { display: 'none' },
    '& input::-webkit-contacts-auto-fill-button': { visibility: 'hidden', display: 'none !important', pointerEvents: 'none' },
    '& input::-webkit-credentials-auto-fill-button': { visibility: 'hidden', display: 'none !important', pointerEvents: 'none' },
  };

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <Card
        sx={{
          width: '100%',
          maxWidth: 460,
          animation: 'authCardIn 280ms ease',
          '@keyframes authCardIn': {
            from: { opacity: 0, transform: 'translateY(10px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
          }
        }}
      >
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Welcome to Shreda</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              fullWidth
              disabled={loading}
              variant={tab === 'login' ? 'contained' : 'outlined'}
              onClick={() => { setTab('login'); setStep('auth'); }}
              sx={{ borderRadius: 999 }}
            >
              Login
            </Button>
            <Button
              fullWidth
              disabled={loading}
              variant={tab === 'signup' ? 'contained' : 'outlined'}
              onClick={() => { setTab('signup'); setStep('auth'); }}
              sx={{ borderRadius: 999 }}
            >
              Sign up
            </Button>
          </Stack>
          <Stack spacing={2}>
            {(errorCode === 'USER_SUSPENDED' || errorCode === 'USER_FROZEN') && (
              <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                Need help? Contact us: <a href="mailto:ezinwaugochukw@gmail.com">ezinwaugochukw@gmail.com</a>
              </Typography>
            )}
            {tab === 'signup' && (
              <TextField disabled={loading} label="Full Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            )}
            <TextField disabled={loading} label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            {step === 'auth' && (
              <>
                <TextField 
                  disabled={loading}
                  label="Password" 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  fullWidth 
                  sx={hideBrowserPasswordToggle}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton disabled={loading} onClick={() => setShowPassword(!showPassword)} edge="end" aria-label="toggle password visibility">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Button 
                  variant="contained" 
                  onClick={submit} 
                  disabled={loading}
                  sx={{ alignSelf: 'stretch', height: '42px' }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : (tab === 'login' ? 'Login' : 'Create Account')}
                </Button>
              </>
            )}
            {tab === 'login' && step === 'auth' && (
              <Button
                variant="text"
                onClick={requestForgotPassword}
                disabled={requestingReset || loading}
                startIcon={requestingReset ? <CircularProgress size={14} /> : undefined}
              >
                {requestingReset ? 'Requesting reset...' : 'Forgot Password?'}
              </Button>
            )}
            {step === 'verifySignup' && (
              <>
                <TextField
                  disabled={loading}
                  label="Email OTP Code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  fullWidth
                />
                <Button 
                  variant="outlined" 
                  onClick={verifyOtp}
                  disabled={loading}
                  sx={{ height: '42px' }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Verify Email'}
                </Button>
              </>
            )}
            {step === 'forgotPassword' && (
              <>
                <TextField
                  disabled={loading}
                  label="Reset Code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  fullWidth
                />
                <TextField
                  disabled={loading}
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  sx={hideBrowserPasswordToggle}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton disabled={loading} onClick={() => setShowPassword(!showPassword)} edge="end" aria-label="toggle password visibility">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Button 
                  variant="outlined" 
                  onClick={submitResetPassword}
                  disabled={loading}
                  sx={{ height: '42px' }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Reset Password'}
                </Button>
              </>
            )}
            {googleClientIdConfigured ? (
              <Box sx={{ display: 'grid', placeItems: 'center', pt: 1, pointerEvents: loading ? 'none' : 'auto', opacity: loading ? 0.6 : 1 }}>
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    try {
                      setLoading(true);
                      if (!credentialResponse.credential) return;
                      await loginWithGoogle(credentialResponse.credential);
                      navigate(redirectTo);
                    } catch (error: unknown) {
                      const parsed = getErrorMessage(error, 'Google login failed');
                      setNotification({ open: true, message: parsed.message, severity: 'error' });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onError={() => setNotification({ open: true, message: 'Google login failed', severity: 'error' })}
                />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Google sign-in is not configured yet. Add VITE_GOOGLE_CLIENT_ID to enable it.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={notification.severity}
          variant="filled"
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}