import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/axiosConfig';
import './AuthForm.css';

const LoginForm = ({ setUser, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const { email, password, rememberMe } = formData;

  // Clear errors when user starts typing
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setErrors({});
    }
  }, [formData]);

  const validateForm = () => {
    const newErrors = {};

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
      const res = await authAPI.login({
        email,
        password
      });

      // Store tokens
      localStorage.setItem('accessToken', res.data.accessToken);
      if (rememberMe && res.data.refreshToken) {
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
      console.error('Login error:', err);
      
      if (err.response?.status === 429) {
        setErrors({ 
          general: `Too many login attempts. Please try again in ${err.response.data.retryAfter} seconds.` 
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
          general: err.response?.data?.message || 'Login failed. Please try again.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-card">
        <div className="auth-form-header">
          <h2>Welcome Back</h2>
          <p>Sign in to continue to ChatSync</p>
        </div>

        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}
        
        <form onSubmit={onSubmit} className="auth-form">
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
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={loading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={rememberMe}
                onChange={onChange}
                disabled={loading}
              />
              <span className="checkmark"></span>
              Remember me for 7 days
            </label>
          </div>
          
          <button 
            type="submit" 
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div className="auth-form-footer">
          <p>
            Don't have an account? 
            <Link to="/register" className="auth-link">
              Create one here
            </Link>
          </p>
          <Link to="/forgot-password" className="forgot-password-link">
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
