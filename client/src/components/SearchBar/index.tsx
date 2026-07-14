import React from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search by name, instagram, phone, or bank...',
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={styles.wrapper}>
      <span className={styles.searchIcon} aria-hidden="true">
        🔍
      </span>
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        aria-label="Search vendors"
      />
      {value && (
        <button
          type="button"
          className={styles.clearButton}
          onClick={handleClear}
          aria-label="Clear search query"
        >
          ✕
        </button>
      )}
    </div>
  );
};
