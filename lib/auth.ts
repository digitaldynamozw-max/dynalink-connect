import NextAuth, { type NextAuthOptions, getServerSession } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })
        if (!user || !user.password) return null
        const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password)
        if (!isPasswordValid) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session && session.user) {
        (session.user as any).id = token.id || token.sub
        ;(session.user as any).role = token.role
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  }
}

export const auth = () => getServerSession(authOptions)

const handler = NextAuth(authOptions)
export default handler