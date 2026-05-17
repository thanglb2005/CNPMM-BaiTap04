export default function AuthInput({
  id,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  icon,
  rightElement,
  error,
  autoComplete,
  ...rest
}) {
  return (
    <div className="mb-4">
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3.5 text-gray-500 pointer-events-none z-10">
            {icon}
          </span>
        )}

        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`auth-input ${error ? 'has-error' : ''} ${rightElement ? 'pr-11' : ''}`}
          {...rest}
        />

        {rightElement && (
          <span className="absolute right-3 flex items-center z-10">
            {rightElement}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-400 font-medium pl-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
