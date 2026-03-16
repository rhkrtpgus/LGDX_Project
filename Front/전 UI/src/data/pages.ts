import { appsPageContent } from './appsPage'
import { homePageContent, type PageContent, type SidebarItem } from './home'
import { livePageContent } from './livePage'
import { searchPageContent } from './searchPage'
import { settingsPageContent } from './settingsPage'

export const pageContentById: Record<SidebarItem['id'], PageContent> = {
  home: homePageContent,
  search: searchPageContent,
  live: livePageContent,
  apps: appsPageContent,
  settings: settingsPageContent,
}
