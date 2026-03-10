import { useState } from 'react';

const KEY = 'tix4smb:mock_jobber';

export function useMockJobber() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(KEY) === 'true');

  function toggle(value: boolean) {
    localStorage.setItem(KEY, String(value));
    setEnabled(value);
  }

  return { enabled, toggle };
}

export function isMockJobberEnabled() {
  return localStorage.getItem(KEY) === 'true';
}
