import NextAuth from 'next-auth'
import LinkedIn from 'next-auth/providers/linkedin'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [LinkedIn],
  session: { strategy: 'jwt' },
  events: {
    signIn({ user, isNewUser }) {
      console.log('[folio-ai login]', JSON.stringify({
        timestamp: new Date().toISOString(),
        name: user.name ?? null,
        email: user.email ?? null,
        isNewUser: isNewUser ?? false,
      }))
    },
  },
  callbacks: {
    jwt({ token, profile }) {
      // Persist LinkedIn sub and picture on first sign-in
      if (profile) {
        token.sub = profile.sub as string
        token.picture = profile.picture as string
      }
      return token
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      if (token.picture) session.user.image = token.picture as string
      return session
    },
  },
})
