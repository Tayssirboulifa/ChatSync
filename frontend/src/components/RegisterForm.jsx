import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/axiosConfig';
import './AuthForm.css';

const RegisterForm = ({ setUser, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();

  const { name, email, password, confirmPassword, agreeToTerms } = formData;

  // Clear errors when user starts typing
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setErrors({});
    }
  }, [formData]);

  // Calculate password strength
  useEffect(() => {
    const calculateStrength = (pwd) => {
      let strength = 0;
      if (pwd.length >= 6) strength += 1;
      if (pwd.length >= 8) strength += 1;
      if (/[A-Z]/.test(pwd)) strength += 1;
      if (/[a-z]/.test(pwd)) strength += 1;
      if (/[0-9]/.test(pwd)) strength += 1;
      if (/[^A-Za-z0-9]/.test(pwd)) strength += 1;
      return Math.min(strength, 4);
    };

    setPasswordStrength(calculateStrength(password));
  }, [password]);

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    return newErrors;
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await authAPI.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password
      });

      // Store tokens
      localStorage.setItem('accessToken', res.data.accessToken);
      if (res.data.refreshToken) {
        localStorage.setItem('refreshToken', res.data.refreshToken);
      }

      // Set user in state
      setUser(res.data.user);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(res.data.user);
      } else {
        // Default navigation
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Registration error:', err);
      
      if (err.response?.status === 429) {
        setErrors({ 
          general: `Too many registration attempts. Please try again in ${err.response.data.retryAfter} seconds.` 
        });
      } else if (err.response?.data?.errors) {
        // Handle validation errors
        const serverErrors = {};
        err.response.data.errors.forEach(error => {
          serverErrors[error.path || 'general'] = error.msg;
        });
        setErrors(serverErrors);
      } else {
        setErrors({ 
          general: err.response?.data?.message || 'Registration failed. Please try again.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthText = () => {
    const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return levels[passwordStrength] || 'Very Weak';
  };

  const getPasswordStrengthColor = () => {
    const colors = ['#ff4757', '#ff6b7a', '#ffa502', '#2ed573', '#1e90ff'];
    return colors[passwordStrength] || '#ff4757';
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-card">
        <div className="auth-form-header">
          <h2>Join ChatSync</h2>
          <p>Create your account to start chatting</p>
        </div>

        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}
        
        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={onChange}
              className={errors.name ? 'error' : ''}
              placeholder="Enter your full name"
              autoComplete="name"
              disabled={loading}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={onChange}
              className={errors.email ? 'error' : ''}
              placeholder="Enter your email"
              autoComplete="email"
              disabled={loading}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={onChange}
                className={errors.password ? 'error' : ''}
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {password && (
              <div className="password-strength">
                <div 
                  className="password-strength-bar"
                  style={{ 
                    width: `${(passwordStrength / 4) * 100}%`,
                    backgroundColor: getPasswordStrengthColor()
                  }}
                ></div>
                <span 
                  className="password-strength-text"
                  style={{ color: getPasswordStrengthColor() }}
                >
                  {getPasswordStrengthText()}
                </span>
              </div>
            )}
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={onChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={agreeToTerms}
                onChange={onChange}
                disabled={loading}
              />
              <span className="checkmark"></span>
              I agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>
            </label>
            {errors.agreeToTerms && <span className="field-error">{errors.agreeToTerms}</span>}
          </div>
          
          <button 
            type="submit" 
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        
        <div className="auth-form-footer">
          <p>
            Already have an account? 
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
