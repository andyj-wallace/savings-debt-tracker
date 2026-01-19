import { render, screen } from '@testing-library/react';
import App from './App';

test('renders financial progress tracker', () => {
  render(<App />);
  const titleElement = screen.getByText(/Financial Progress Tracker/i);
  expect(titleElement).toBeInTheDocument();
});
