/**
 * PasswordStrength – visual strength meter for password fields.
 *
 * Props:
 *   password – the current password string
 */
const LEVELS = [
  { label: '', color: '' },
  { label: 'Rất yếu', color: 'bg-red-500' },
  { label: 'Yếu', color: 'bg-orange-500' },
  { label: 'Trung bình', color: 'bg-yellow-500' },
  { label: 'Mạnh', color: 'bg-lime-500' },
  { label: 'Rất mạnh', color: 'bg-green-500' },
];

function calculatePasswordStrength(password) {
  if (!password) return 0;

  let strengthScore = 0;

  if (password.length >= 8) strengthScore++;
  if (/[A-Z]/.test(password)) strengthScore++;
  if (/[a-z]/.test(password)) strengthScore++;
  if (/\d/.test(password)) strengthScore++;
  if (/[^a-zA-Z0-9]/.test(password)) strengthScore++;

  return strengthScore;
}

function getStrengthTextColor(strength) {
  if (strength <= 1) return 'text-red-400';
  if (strength === 2) return 'text-orange-400';
  if (strength === 3) return 'text-yellow-400';

  return 'text-green-400';
}

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const strength = calculatePasswordStrength(password);
  const { label, color } = LEVELS[strength];

  return (
    <div className="mt-2 mb-3 animate-fade-in">
      {/* Segmented bar */}
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? color : 'bg-dark-600'
              }`}
          />
        ))}
      </div>
      {/* Label */}
      {label && (
        <p
          className={`text-xs font-medium text-right transition-colors ${getStrengthTextColor(strength)}`}
        >
          {label}
        </p>
      )}
    </div>
  );
}
