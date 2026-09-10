// src/components/common/Button.jsx
import React from 'react';
import './Button.css';

const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  fullWidth = false,
  className = '',
  type = 'button',
  onClick,
  disabled = false,
  ...props
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    danger: 'btn-danger',
    warning: 'btn-warning',
    ghost: 'btn-ghost',
    outline: 'btn-outline'
  };

  const sizes = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
    xl: 'btn-xl'
  };

  return (
    <button
      type={type}
      className={`
        btn 
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'btn-full' : ''} 
        ${loading ? 'btn-loading' : ''}
        ${className}
      `}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner"></span>
      ) : children}
    </button>
  );
};

export default Button;