import NextAuth from 'next-auth'
import LinkedIn from 'next-auth/providers/linkedin'
import { upsertFolioOnLogin } from '@/lib/folios'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [LinkedIn],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.sub = profile.sub as string
        token.picture = profile.picture as string

        // Create or retrieve folio on first sign-in; store slug in JWT
        if (profile.name && profile.email) {
          try {
            const folio = await upsertFolioOnLogin(
              token.sub as string,
              profile.name as string,
              profile.email as string,
            )
            token.folioSlug = folio.slug
          } catch (err) {
            console.error('[folio-ai jwt-folio-error]', err instanceof Error ? err.message : err)
          }
        }
      }
      return token
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      if (token.picture) session.user.image = token.picture as string
      if (token.folioSlug) session.user.folioSlug = token.folioSlug as string
      return session
    },
  },
})
