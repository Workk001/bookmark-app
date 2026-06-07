export type Profile = {
  id: string
  handle: string
  created_at: string
}

export type Bookmark = {
  id: string
  user_id: string
  title: string
  url: string
  is_public: boolean
  created_at: string
}

export type NewBookmark = {
  title: string
  url: string
  is_public: boolean
}

export type BookmarkUpdate = Partial<NewBookmark> & {
  id: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          handle: string
          created_at?: string
        }
        Update: {
          handle?: string
          created_at?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: Bookmark
        Insert: {
          id?: string
          user_id: string
          title: string
          url: string
          is_public?: boolean
          created_at?: string
        }
        Update: {
          title?: string
          url?: string
          is_public?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
