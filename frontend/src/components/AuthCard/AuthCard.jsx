export default function AuthCard({ children, className = '' }) {
  return (
    <div className={`auth-card ${className}`}>
      {children}
    </div>
  );
}
