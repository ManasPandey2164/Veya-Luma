import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}

afterEach(() => {
  cleanup();
});

