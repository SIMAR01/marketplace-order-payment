import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '../../api/authApi';
import FormField from '../common/FormField';
import Input from '../common/Input';
import PasswordInput from '../common/PasswordInput';
import Select from '../common/Select';
import Button from '../common/Button';
import ErrorMessage from '../common/ErrorMessage';

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'PROVIDER'>('CUSTOMER');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');

  // Error states
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
    businessName?: string;
  }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Handle role change and clear provider-specific fields
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRole = e.target.value as 'CUSTOMER' | 'PROVIDER';
    setRole(selectedRole);
    
    // Clear provider-specific fields if switching to CUSTOMER
    if (selectedRole === 'CUSTOMER') {
      setPhone('');
      setBusinessName('');
      setErrors((prev) => ({ ...prev, phone: undefined, businessName: undefined }));
    }
  };

  // Validation function
  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (role === 'PROVIDER') {
      if (!phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (phone.trim().length < 10) {
        newErrors.phone = 'Phone number must be at least 10 digits';
      }

      if (!businessName.trim()) {
        newErrors.businessName = 'Business name is required';
      } else if (businessName.trim().length < 3) {
        newErrors.businessName = 'Business name must be at least 3 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) return;

    // Build conditional payload
    const payload: any = {
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    };

    if (role === 'PROVIDER') {
      payload.phone = phone.trim();
      payload.businessName = businessName.trim();
    }

    try {
      await register(payload).unwrap();
      // Redirect to Home (Redux auth state is updated automatically via onQueryStarted)
      navigate('/');
    } catch (err: any) {
      if (err.data && err.data.message) {
        if (err.data.errors && Array.isArray(err.data.errors)) {
          const fieldErrors: typeof errors = {};
          err.data.errors.forEach((e: { field: string; message: string }) => {
            const fieldKey = e.field.replace('body.', '') as keyof typeof errors;
            fieldErrors[fieldKey] = e.message;
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

      <div className="grid grid-cols-1 gap-6">
        <FormField label="Full Name" error={errors.name} required htmlFor="name">
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            error={!!errors.name}
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Email Address" error={errors.email} required htmlFor="email">
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={!!errors.email}
            disabled={isLoading}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <FormField
            label="Confirm Password"
            error={errors.confirmPassword}
            required
            htmlFor="confirmPassword"
          >
            <PasswordInput
              id="confirmPassword"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword)
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              error={!!errors.confirmPassword}
              disabled={isLoading}
            />
          </FormField>
        </div>

        <FormField label="Account Role" required htmlFor="role">
          <Select id="role" value={role} onChange={handleRoleChange} disabled={isLoading}>
            <option value="CUSTOMER" className="bg-slate-900 text-white">
              Customer
            </option>
            <option value="PROVIDER" className="bg-slate-900 text-white">
              Provider / Business Seller
            </option>
          </Select>
        </FormField>

        {/* Dynamic Provider fields */}
        {role === 'PROVIDER' && (
          <div className="space-y-6 pt-4 border-t border-slate-800 animate-fadeIn">
            <FormField label="Business Name" error={errors.businessName} required htmlFor="businessName">
              <Input
                id="businessName"
                type="text"
                placeholder="Acme Services Ltd"
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  if (errors.businessName) setErrors((prev) => ({ ...prev, businessName: undefined }));
                }}
                error={!!errors.businessName}
                disabled={isLoading}
              />
            </FormField>

            <FormField label="Contact Phone" error={errors.phone} required htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                error={!!errors.phone}
                disabled={isLoading}
              />
            </FormField>
          </div>
        )}
      </div>

      <Button type="submit" isLoading={isLoading} className="w-full mt-6">
        Register Account
      </Button>
    </form>
  );
};

export default RegisterForm;
