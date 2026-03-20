import { render, screen } from '@testing-library/react';
import App from './App';

test('affiche le bouton Se connecter sur la page d’accueil', () => {
  render(<App />);
  const loginLink = screen.getByRole('link', { name: /se connecter/i });
  expect(loginLink).toBeInTheDocument();
});
