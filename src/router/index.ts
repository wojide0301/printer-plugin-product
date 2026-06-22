/// <reference types="@uni-helper/vite-plugin-uni-pages/client" />
import { pages } from 'virtual:uni-pages'

function generateRoutes() {
  return pages.map((page) => {
    const newPath = `/${page.path}`
    return { ...page, path: newPath }
  })
}

const router = createRouter({
  routes: generateRoutes(),
})

export default router
