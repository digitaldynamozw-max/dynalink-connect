import handler from '@/lib/auth'

// NextAuth provides a handler function; export it for supported HTTP methods
export { handler as GET, handler as POST }