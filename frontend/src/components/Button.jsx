import { forwardRef } from 'react';

// Botoes sao paineis de vidro presos no chumbo: o primario e o vidro aceso (ambar), o fantasma e vidro escuro.
const VARIANTS = {
  primary: 'btn-lit',
  ghost: 'btn-glass',
  danger: 'btn-glass text-red-200 hover:text-red-100'
};

const Button = forwardRef(function Button({ children, className = '', variant = 'primary', ...props }, ref) {
  return (
    <button ref={ref} className={`btn ${VARIANTS[variant] || VARIANTS.primary} ${className}`} {...props}>
      {children}
    </button>
  );
});

export default Button;
