export function generateRandomSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let slug = ''
  for (let i = 0; i < 8; i++) slug += chars[Math.floor(Math.random() * chars.length)]
  return slug
}

export function getChatId(): string | undefined {
  const path = location.pathname
  if (location.hostname === 'claude.ai') return path.match(/\/chat\/([^/]+)/)?.[1]
  if (location.hostname === 'chatgpt.com') return path.match(/\/c\/([^/]+)/)?.[1]
  if (location.hostname === 'gemini.google.com') return path.match(/\/app\/([^/]+)/)?.[1]
  return undefined
}
