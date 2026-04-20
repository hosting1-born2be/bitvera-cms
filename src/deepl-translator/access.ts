import type { AccessArgs } from 'payload'

/**
 * Check if user has any of the required roles
 */
export const checkRole = (requiredRoles: string[], user?: any): boolean => {
  if (!user) return false

  // Check direct role property
  if (user.role && requiredRoles.includes(user.role)) {
    return true
  }

  // Check roles array
  if (user.roles && Array.isArray(user.roles)) {
    return requiredRoles.some((role) => user.roles.includes(role))
  }

  return false
}

/**
 * Admin access control
 */
export const admins = ({ req: { user } }: AccessArgs): boolean => {
  return checkRole(['admin'], user)
}

/**
 * Admin or published content access control
 */
export const adminsOrPublished = ({ req: { user } }: AccessArgs): boolean => {
  if (user && checkRole(['admin'], user)) {
    return true
  }
  return true
}

/**
 * Public access control
 */
export const anyone = (): boolean => true

/**
 * Validate access for translation operations
 */
export const validateAccess = (req: any, pluginOptions: any, collectionSlug: string): boolean => {
  try {
    const collectionOptions = pluginOptions.collections[collectionSlug]

    if (!collectionOptions) {
      console.error('Collection not configured for translation:', collectionSlug)
      return false
    }

    // Check if translation is disabled for this collection
    if (collectionOptions.access?.translate === false) {
      return false
    }

    // Require authentication
    if (!req.user) {
      return false
    }

    // Require admin role
    return checkRole(['admin'], req.user)
  } catch (error) {
    console.error('Access validation error:', error)
    return false
  }
}
