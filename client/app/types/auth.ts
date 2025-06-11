// types/auth.ts
import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

// Define user roles
export type UserRole = 'admin' | 'user'

// Extend the built-in session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      roles: UserRole[]
      accessToken?: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    roles: UserRole[]
    accessToken?: string
  }
}

// Extend the built-in JWT type
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    roles: UserRole[]
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
  }
}

// Auth configuration types
export interface AuthConfig {
  roles: UserRole[]
  redirectTo?: string
}

// Route access levels
export interface RouteAccess {
  path: string
  allowedRoles: UserRole[]
  exact?: boolean
}