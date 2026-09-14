import { env } from '$env/dynamic/public'

export const debug = env.PUBLIC_DEBUG === 'true'
