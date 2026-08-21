export function useAuth() {
  return {
    user: JSON.parse(localStorage.getItem('user') || '{}'),
    isAuthenticated: !!localStorage.getItem('accessToken'),
  };
}
