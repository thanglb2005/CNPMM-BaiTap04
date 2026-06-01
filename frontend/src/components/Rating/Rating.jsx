import { FaStar } from 'react-icons/fa';

export default function Rating({ value = 0, max = 5, size = 'md', showValue = false, onChange }) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const iconSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => onChange && onChange(star)}
          className={`${iconSize} cursor-${onChange ? 'pointer' : 'default'}`}
        >
          {star <= value ? (
            <FaStar className="text-yellow-400" />
          ) : (
            <FaStar className="text-gray-300" />
          )}
        </span>
      ))}
    </div>
  );
}
