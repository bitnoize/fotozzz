export const USER_NICK_REGEXP = /^[a-z0-9_]{4,20}$/i
export const USER_NICK_UNKNOWN = 'unknown'

export const USER_GENDERS = ['male', 'female', 'couple']
export const USER_STATUSES = ['register', 'active', 'penalty', 'banned']
export const USER_ROLES = ['user', 'moderator', 'admin']

export const USER_AVATAR_UNKNOWN =
  'AgACAgIAAxkBAAIGh2VdVUw2SI5Sg7sFup5pj_2RVyy7AAKl1DEbe-zoSqp2IFl7Cv9SAQADAgADeQADMwQ'

export const USER_GENDER_EMOJIS: Record<string, string> = {
  male: '\u{1F57A}',
  female: '\u{1F483}',
  couple: '\u{1F46B}'
}

export const USER_GENDER_EMOJI_UNKNOWN = '\u{1F601}'
