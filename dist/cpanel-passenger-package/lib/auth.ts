import NextAuth, { type NextAuthOptions, getServerSession } from 'next-auth'
import type { AdapterUser } from 'next-auth/adapters'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

if (process.env.NODE_ENV !== 'production' && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'http://127.0.0.1:3001'
}

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
        const normalizedEmail = credentials.email.toString().trim().toLowerCase()
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail }
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
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = (user as AdapterUser & { role?: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session && session.user) {
        session.user.id = token.id || token.sub || ''
        session.user.role = token.role
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  },
  debug: process.env.NODE_ENV !== 'production',
}

export const auth = () => getServerSession(authOptions)

const handler = NextAuth(authOptions)
export default handler
