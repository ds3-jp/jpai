// lib/auth/config.ts
import { NextAuthOptions } from "next-auth"
import KeycloakProvider from "next-auth/providers/keycloak"
import { UserRole } from "@/app/types/auth"

// Debug environment variables (remove in production)
console.log('Environment variables check:')
console.log('KEYCLOAK_ID:', process.env.KEYCLOAK_ID ? 'Set' : 'NOT SET')
console.log('KEYCLOAK_SECRET:', process.env.KEYCLOAK_SECRET ? 'Set' : 'NOT SET')
console.log('KEYCLOAK_ISSUER:', process.env.KEYCLOAK_ISSUER ? 'Set' : 'NOT SET')
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set' : 'NOT SET')

// Validate required environment variables
if (!process.env.KEYCLOAK_ID) {
    throw new Error('KEYCLOAK_ID environment variable is required')
}
if (!process.env.KEYCLOAK_SECRET) {
    throw new Error('KEYCLOAK_SECRET environment variable is required')
}
if (!process.env.KEYCLOAK_ISSUER) {
    throw new Error('KEYCLOAK_ISSUER environment variable is required')
}
if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET environment variable is required')
}

// Helper function to extract roles from Keycloak token
function extractRoles(token: any): UserRole[] {
    try {
        // Check resource_access first (client-specific roles)
        const clientRoles = token?.resource_access?.[process.env.KEYCLOAK_ID!]?.roles || []

        // Check realm_access for realm-wide roles
        const realmRoles = token?.realm_access?.roles || []

        // Combine both and filter for our application roles
        const allRoles = [...clientRoles, ...realmRoles]
        const validRoles = allRoles.filter((role: string) =>
            ['admin', 'user'].includes(role)
        ) as UserRole[]

        // Default to 'user' role if no valid roles found
        const finalRoles: UserRole[] = validRoles.length > 0 ? validRoles : ['user']

        return finalRoles
    } catch (error) {
        console.error('Error extracting roles:', error)
        return ['user'] // Default role
    }
}

// Function to refresh the access token
async function refreshAccessToken(token: any) {
    try {
        const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`

        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: process.env.KEYCLOAK_ID!,
                client_secret: process.env.KEYCLOAK_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken,
            }),
            method: "POST",
        })

        const refreshedTokens = await response.json()

        if (!response.ok) {
            throw refreshedTokens
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        }
    } catch (error) {
        console.error('Error refreshing access token:', error)
        return {
            ...token,
            error: "RefreshAccessTokenError",
        }
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        KeycloakProvider({
            clientId: process.env.KEYCLOAK_ID,
            clientSecret: process.env.KEYCLOAK_SECRET,
            issuer: process.env.KEYCLOAK_ISSUER,
            authorization: {
                params: {
                    prompt: "login", // 👈 THIS is the key addition
                },
            },
            profile(profile) {
                return {
                    id: profile.sub,
                    email: profile.email,
                    name: profile.name || profile.preferred_username,
                    roles: extractRoles(profile),
                }
            },
        }),
    ],

    callbacks: {
        async jwt({ token, account, profile }) {
            // Initial sign in
            if (account && profile) {
                token.accessToken = account.access_token
                token.refreshToken = account.refresh_token
                token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0
                token.roles = extractRoles(profile)
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < (token.accessTokenExpires as number || 0)) {
                return token
            }

            // Access token has expired, try to update it
            return await refreshAccessToken(token)
        },

        async session({ session, token }) {
            // Send properties to the client
            session.user.id = token.sub as string
            session.user.roles = token.roles as UserRole[]
            session.user.accessToken = token.accessToken as string

            return session
        },

        async redirect({ url, baseUrl }) {
            // Allows relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`
            // Allows callback URLs on the same origin
            else if (new URL(url).origin === baseUrl) return url
            return baseUrl
        },
    },

    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
    },

    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },

    events: {
        async signOut() {
            // Optional: Implement Keycloak logout if needed
            console.log('User signed out')
        },
    },

    debug: process.env.NODE_ENV === 'development',
}