import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const buttonClass = [
    styles.btn,
    styles[variant],
    fullWidth ? styles.btnFull : '',
    className,
  ].join(' ');

  return (
    <button className={buttonClass} {...props}>
      {children}
    </button>
  );
};
