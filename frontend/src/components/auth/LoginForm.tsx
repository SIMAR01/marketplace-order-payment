import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoginMutation } from '../../api/authApi';
import FormField from '../common/FormField';
import Input from '../common/Input';
import PasswordInput from '../common/PasswordInput';
import Button from '../common/Button';
import ErrorMessage from '../common/ErrorMessage';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path from route state if redirected from ProtectedRoute
  const from = (location.state as any)?.from?.pathname || '/';

  const [login, { isLoading }] = useLoginMutation();

  // Local form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Simple frontend validations
  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) return;

    try {
      // Execute RTK Query mutation
      await login({ email, password }).unwrap();
      // Navigate to home or originally requested protected route
      navigate(from, { replace: true });
    } catch (err: any) {
      // Map API validation or connection errors
      if (err.data && err.data.message) {
        // Intercept validation errors array
        if (err.data.errors && Array.isArray(err.data.errors)) {
          const fieldErrors: typeof errors = {};
          err.data.errors.forEach((e: { field: string; message: string }) => {
            if (e.field === 'email') fieldErrors.email = e.message;
            if (e.field === 'password') fieldErrors.password = e.message;
          });
          setErrors(fieldErrors);
          setApiError(err.data.message);
        } else {
          setApiError(err.data.message);
        }
      } else {
        setApiError('Unable to connect to the server. Please check your network and try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ErrorMessage message={apiError || ''} />

      <FormField label="Email Address" error={errors.email} required htmlFor="email">
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={!!errors.email}
          disabled={isLoading}
        />
      </FormField>

      <FormField label="Password" error={errors.password} required htmlFor="password">
        <PasswordInput
          id="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={!!errors.password}
          disabled={isLoading}
        />
      </FormField>

      <Button type="submit" isLoading={isLoading} className="w-full">
        Sign In
      </Button>
    </form>
  );
};

export default LoginForm;
