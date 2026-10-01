export default (pathname: string): boolean => {
  const normalizedPath = pathname.toLowerCase();

  return normalizedPath === '/api' || normalizedPath.startsWith('/api/');
};
