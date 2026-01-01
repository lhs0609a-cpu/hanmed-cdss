import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  // 미니 모드 (아이콘만 표시)
  isMinimized: boolean
  toggleMinimized: () => void
  setMinimized: (value: boolean) => void

  // 섹션 접기/펼치기
  collapsedSections: string[]
  toggleSection: (sectionId: string) => void
  isCollapsed: (sectionId: string) => boolean

  // 즐겨찾기
  favorites: string[]
  addFavorite: (href: string) => void
  removeFavorite: (href: string) => void
  isFavorite: (href: string) => boolean
  toggleFavorite: (href: string) => void

  // 최근 방문
  recentPages: { href: string; name: string; timestamp: number }[]
  addRecentPage: (href: string, name: string) => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      // 미니 모드
      isMinimized: false,
      toggleMinimized: () => set((state) => ({ isMinimized: !state.isMinimized })),
      setMinimized: (value) => set({ isMinimized: value }),

      // 섹션 접기/펼치기 (기본적으로 모두 펼침)
      collapsedSections: [],
      toggleSection: (sectionId) =>
        set((state) => {
          const isCurrentlyCollapsed = state.collapsedSections.includes(sectionId)
          return {
            collapsedSections: isCurrentlyCollapsed
              ? state.collapsedSections.filter((id) => id !== sectionId)
              : [...state.collapsedSections, sectionId],
          }
        }),
      isCollapsed: (sectionId) => get().collapsedSections.includes(sectionId),

      // 즐겨찾기
      favorites: [],
      addFavorite: (href) =>
        set((state) => ({
          favorites: state.favorites.includes(href)
            ? state.favorites
            : [...state.favorites, href],
        })),
      removeFavorite: (href) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f !== href),
        })),
      isFavorite: (href) => get().favorites.includes(href),
      toggleFavorite: (href) => {
        const { favorites, addFavorite, removeFavorite } = get()
        if (favorites.includes(href)) {
          removeFavorite(href)
        } else {
          addFavorite(href)
        }
      },

      // 최근 방문
      recentPages: [],
      addRecentPage: (href, name) =>
        set((state) => {
          const filtered = state.recentPages.filter((p) => p.href !== href)
          return {
            recentPages: [
              { href, name, timestamp: Date.now() },
              ...filtered,
            ].slice(0, 7),
          }
        }),
    }),
    {
      name: 'sidebar-storage',
      partialize: (state) => ({
        isMinimized: state.isMinimized,
        collapsedSections: state.collapsedSections,
        favorites: state.favorites,
        recentPages: state.recentPages,
      }),
    }
  )
)
